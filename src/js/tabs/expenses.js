import { LitElement, html } from "../../lib/lit.min.js";
import { userBadge } from "../components/userBadge.js";
import "../components/userCheckboxes.js";
import "../components/userFilterDropdown.js";
import { showConfirm } from "../confirm.js";
import { state } from "../state.js";
import { formatDateTime, toLocalDatetimeInput } from "../utils.js";

function validateExpenseForm(amountEuros, createdBy, splitWith, dateValue) {
  const errors = [];
  if (!dateValue) {
    errors.push("Date is required.");
  }

  if (!createdBy) {
    errors.push("Please select who paid.");
  }

  if (isNaN(amountEuros) || amountEuros <= 0) {
    errors.push("Amount must be greater than 0.");
  }

  if (splitWith.length === 0) {
    errors.push("Please select at least one person to split with.");
  } else if (splitWith.every((id) => id === createdBy)) {
    errors.push("You cannot pay for yourself only. Select at least one other person.");
  }

  return errors;
}

class ExpensesTab extends LitElement {
  static properties = {
    _filteredExpenses: { state: true },
    _addErrors: { state: true },
    _editErrors: { state: true },
    _addSaving: { state: true },
    _editSaving: { state: true },
    _showProcessed: { state: true },
    _editInitialSplitIds: { state: true },
  };

  #fromDate = "";
  #toDate = "";
  #selectedUserIds = null;

  constructor() {
    super();
    this._filteredExpenses = [];
    this._addErrors = [];
    this._editErrors = [];
    this._addSaving = false;
    this._editSaving = false;
    this._showProcessed = false;
    this._editInitialSplitIds = null;
  }

  createRenderRoot() {
    return this;
  }

  load() {
    this.#applyFilters();
  }

  async #reload() {
    await window.api.loadAll();
    window.refreshCurrentTab();
  }

  #applyFilters() {
    this._filteredExpenses = state.allExpenses.filter((expense) => {
      if (!this._showProcessed && expense.BalanceId) {
        return false;
      }

      if (this.#fromDate && expense.DateCreatedUtc.substring(0, 10) < this.#fromDate) {
        return false;
      }

      if (this.#toDate && expense.DateCreatedUtc.substring(0, 10) > this.#toDate) {
        return false;
      }

      if (this.#selectedUserIds !== null && !this.#selectedUserIds.includes(expense.CreatedBy)) {
        return false;
      }

      return true;
    });
  }

  #onFromChange(event) {
    this.#fromDate = event.target.value;
    this.#applyFilters();
  }

  #onToChange(event) {
    this.#toDate = event.target.value;
    this.#applyFilters();
  }

  #onUserChange(event) {
    this.#selectedUserIds = event.target.selectedIds;
    this.#applyFilters();
  }

  #onShowProcessedChange(event) {
    this._showProcessed = event.target.checked;
    this.#applyFilters();
  }

  #openAddModal() {
    this._addErrors = [];
    this._addSaving = false;
    const modal = bootstrap.Modal.getOrCreateInstance(this.querySelector("#addExpenseModal"));
    modal.show();
    this.updateComplete.then(() => {
      this.querySelector("#addExpenseAmount").value = "";
      this.querySelector("#addExpenseDate").value = toLocalDatetimeInput();
      this.querySelector("#addExpenseNote").value = "";
      const currentUser = state.allUsers.find((u) => u.Emails && u.Emails.includes(state.currentUserEmail));
      this.querySelector("#addExpenseCreatedBy").value = currentUser ? currentUser.Id : (state.allUsers[0]?.Id || "");
      this.querySelector("#addExpenseSplitWith").initialIds = null; // all checked by default
    });
  }

  #openEditModal(expense) {
    this._editErrors = [];
    this._editSaving = false;
    // null SplitWith means "all users" — pass null so all boxes are checked
    this._editInitialSplitIds = expense.SplitWith && expense.SplitWith.length > 0
      ? expense.SplitWith
      : null;
    const modal = bootstrap.Modal.getOrCreateInstance(this.querySelector("#editExpenseModal"));
    modal.show();
    this.updateComplete.then(() => {
      this.querySelector("#editExpenseId").value = expense.Id;
      this.querySelector("#editExpenseDate").value = toLocalDatetimeInput(expense.DateCreatedUtc);
      this.querySelector("#editExpenseAmount").value = expense.AmountEuros;
      this.querySelector("#editExpenseNote").value = expense.Note || "";
      this.querySelector("#editExpenseCreatedBy").value = expense.CreatedBy || "";
    });
  }

  async #submitAdd() {
    const amountEuros = parseFloat(this.querySelector("#addExpenseAmount").value);
    const dateValue = this.querySelector("#addExpenseDate").value;
    const note = this.querySelector("#addExpenseNote").value.trim();
    const createdBy = this.querySelector("#addExpenseCreatedBy").value;
    const splitWith = this.querySelector("#addExpenseSplitWith").selectedIds;
    const errors = validateExpenseForm(amountEuros, createdBy, splitWith, dateValue);
    if (errors.length) {
      this._addErrors = errors;
      return;
    }

    this._addErrors = [];
    this._addSaving = true;
    try {
      await window.api.addExpense({
        AmountEuros: amountEuros,
        DateCreatedUtc: dateValue ? new Date(dateValue).toISOString() : undefined,
        CreatedBy: createdBy,
        Note: note,
        SplitWith: splitWith.join(","),
      });
      bootstrap.Modal.getInstance(this.querySelector("#addExpenseModal")).hide();
      await this.#reload();
    } catch (error) {
      this._addErrors = [error.message];
    } finally {
      this._addSaving = false;
    }
  }

  async #submitEdit() {
    const expenseId = this.querySelector("#editExpenseId").value;
    const amountEuros = parseFloat(this.querySelector("#editExpenseAmount").value);
    const dateValue = this.querySelector("#editExpenseDate").value;
    const note = this.querySelector("#editExpenseNote").value.trim();
    const createdBy = this.querySelector("#editExpenseCreatedBy").value;
    const splitWith = this.querySelector("#editExpenseSplitWith").selectedIds;
    const errors = validateExpenseForm(amountEuros, createdBy, splitWith, dateValue);
    if (errors.length) {
      this._editErrors = errors;
      return;
    }

    this._editErrors = [];
    this._editSaving = true;
    try {
      await window.api.updateExpense(expenseId, {
        AmountEuros: amountEuros,
        DateCreatedUtc: dateValue ? new Date(dateValue).toISOString() : undefined,
        CreatedBy: createdBy,
        Note: note,
        SplitWith: splitWith.join(","),
      });
      bootstrap.Modal.getInstance(this.querySelector("#editExpenseModal")).hide();
      await this.#reload();
    } catch (error) {
      this._editErrors = [error.message];
    } finally {
      this._editSaving = false;
    }
  }

  #confirmDelete(expense) {
    showConfirm(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      "Delete",
      "btn-danger",
      (done) => {
        window.api.deleteExpense(expense.Id)
          .then(() => {
            done();
            this.#reload();
          })
          .catch((error) => {
            done();
            alert(`Error: ${error.message}`);
          });
      },
    );
  }

  #renderErrors(errors) {
    if (!errors.length) {
      return "";
    }

    return html`
      <div class="alert alert-danger py-2 mb-0 mt-2">
        <ul class="mb-0 ps-3">${errors.map((msg) => html`<li>${msg}</li>`)}</ul>
      </div>
    `;
  }

  #renderAddModal() {
    return html`
      <div class="modal fade" data-bs-backdrop="static" data-bs-keyboard="false" id="addExpenseModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-receipt me-2"></i>Add Expense</h5>
            </div>
            <div class="modal-body">
              <div class="form-floating mb-3">
                <input type="datetime-local" id="addExpenseDate" class="form-control" placeholder="Date" />
                <label><i class="bi bi-calendar me-1"></i>Date</label>
              </div>
              <div class="form-floating mb-3">
                <input type="number" id="addExpenseAmount" class="form-control" step="0.01" min="0.01" placeholder="0.00" />
                <label><i class="bi bi-currency-euro me-1"></i>Amount (€)</label>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold small"><i class="bi bi-person-check me-1"></i>Paid by</label>
                <select id="addExpenseCreatedBy" class="form-select">
                  ${state.allUsers.map((u) => html`<option value="${u.Id}">${u.DisplayName}</option>`)}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold small"><i class="bi bi-people me-1"></i>Split with</label>
                <user-checkboxes
                  id="addExpenseSplitWith"
                  .users=${state.allUsers}
                ></user-checkboxes>
              </div>
              <div class="form-floating mb-3">
                <input type="text" id="addExpenseNote" class="form-control" placeholder="Note" />
                <label><i class="bi bi-chat-left-text me-1"></i>Note</label>
              </div>
              ${this.#renderErrors(this._addErrors)}
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-bs-dismiss="modal" ?disabled=${this._addSaving}>Cancel</button>
              <button class="btn btn-primary" @click=${this.#submitAdd} ?disabled=${this._addSaving}>
                ${this._addSaving
                  ? html`<span class="spinner-border spinner-border-sm me-1"></span>Saving…`
                  : html`<i class="bi bi-check-lg me-1"></i>Save`}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  #renderEditModal() {
    return html`
      <div class="modal fade" data-bs-backdrop="static" data-bs-keyboard="false" id="editExpenseModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Edit Expense</h5>
            </div>
            <div class="modal-body">
              <input type="hidden" id="editExpenseId" />
              <div class="form-floating mb-3">
                <input type="datetime-local" id="editExpenseDate" class="form-control" placeholder="Date" />
                <label><i class="bi bi-calendar me-1"></i>Date</label>
              </div>
              <div class="form-floating mb-3">
                <input type="number" id="editExpenseAmount" class="form-control" step="0.01" min="0.01" placeholder="0.00" />
                <label><i class="bi bi-currency-euro me-1"></i>Amount (€)</label>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold small"><i class="bi bi-person-check me-1"></i>Paid by</label>
                <select id="editExpenseCreatedBy" class="form-select">
                  ${state.allUsers.map((u) => html`<option value="${u.Id}">${u.DisplayName}</option>`)}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold small"><i class="bi bi-people me-1"></i>Split with</label>
                <user-checkboxes
                  id="editExpenseSplitWith"
                  .users=${state.allUsers}
                  .initialIds=${this._editInitialSplitIds}
                ></user-checkboxes>
              </div>
              <div class="form-floating mb-3">
                <input type="text" id="editExpenseNote" class="form-control" placeholder="Note" />
                <label><i class="bi bi-chat-left-text me-1"></i>Note</label>
              </div>
              ${this.#renderErrors(this._editErrors)}
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-bs-dismiss="modal" ?disabled=${this._editSaving}>Cancel</button>
              <button class="btn btn-primary" @click=${this.#submitEdit} ?disabled=${this._editSaving}>
                ${this._editSaving
                  ? html`<span class="spinner-border spinner-border-sm me-1"></span>Saving…`
                  : html`<i class="bi bi-check-lg me-1"></i>Save`}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  #renderSummaryCards() {
    const expenses = this._filteredExpenses;
    const totalAmount = expenses.reduce((sum, e) => sum + e.AmountEuros, 0);

    const userMap = new Map();
    expenses.forEach((e) => {
      const existing = userMap.get(e.CreatedBy) || { user: e.createdByUser, amount: 0 };
      existing.amount += e.AmountEuros;
      userMap.set(e.CreatedBy, existing);
    });

    const userPalette = [
      { bg: "bg-warning bg-opacity-10", text: "text-warning" },
      { bg: "bg-danger bg-opacity-10", text: "text-danger" },
      { bg: "bg-secondary bg-opacity-10", text: "text-secondary" },
      { bg: "bg-dark bg-opacity-10", text: "text-dark" },
    ];

    return html`
      <div class="row g-3 p-3 border-bottom">
        <div class="col-6 col-lg">
          <div class="rounded-3 p-3 bg-primary bg-opacity-10 h-100 text-center">
            <div class="text-uppercase small fw-semibold text-muted">Total Expenses</div>
            <div class="fs-4 fw-bold text-primary">${expenses.length}</div>
          </div>
        </div>
        <div class="col-6 col-lg">
          <div class="rounded-3 p-3 bg-success bg-opacity-10 h-100 text-center">
            <div class="text-uppercase small fw-semibold text-muted">Total Amount</div>
            <div class="fs-4 fw-bold text-success">${totalAmount.toFixed(2)}€</div>
          </div>
        </div>
        ${[...userMap.values()].map(({ user, amount }, i) => {
          const { bg, text } = userPalette[i % userPalette.length];
          return html`
            <div class="col-6 col-lg">
              <div class="rounded-3 p-3 ${bg} h-100 text-center">
                <div class="text-uppercase small fw-semibold text-muted">${user?.DisplayName || "Unknown"}</div>
                <div class="fs-4 fw-bold ${text}">${amount.toFixed(2)}€</div>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  render() {
    const listContent = this._filteredExpenses.length
      ? html`
          <!-- Desktop layout -->
          <table class="table table-hover align-middle mb-0 d-none d-md-table">
            <colgroup>
              <col style="width:150px">
              <col>
              <col style="width:220px">
              <col style="width:80px">
              <col style="width:90px">
              <col style="width:80px">
            </colgroup>
            <thead class="table-light">
              <tr>
                <th class="fw-semibold small text-muted text-uppercase ps-3">Date</th>
                <th class="fw-semibold small text-muted text-uppercase">Note</th>
                <th class="fw-semibold small text-muted text-uppercase">Payer → Split</th>
                <th class="fw-semibold small text-muted text-uppercase">Status</th>
                <th class="fw-semibold small text-muted text-uppercase text-end">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${this._filteredExpenses.map((expense) => html`
                <tr>
                  <td class="text-muted small ps-3">${formatDateTime(expense.DateCreatedUtc)}</td>
                  <td class="fw-semibold">${expense.Note || "—"}</td>
                  <td>
                    ${expense.splitUsers.length
                      ? html`<span class="d-flex align-items-center gap-1 flex-wrap">
                          ${userBadge(expense.createdByUser)}
                          <i class="bi bi-chevron-right text-muted small"></i>
                          ${expense.splitUsers.map((u) => userBadge(u))}
                        </span>`
                      : ""}
                  </td>
                  <td>
                    ${expense.BalanceId
                      ? html`<span class="badge bg-success-subtle text-success border border-success-subtle">Settled</span>`
                      : html`<span class="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span>`}
                  </td>
                  <td class="fw-bold text-end">${expense.AmountEuros.toFixed(2)}€</td>
                  <td>
                    ${!expense.BalanceId ? html`
                      <div class="d-flex gap-2 justify-content-end">
                        <button class="btn btn-sm btn-outline-secondary" @click=${() => this.#openEditModal(expense)}>
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" @click=${() => this.#confirmDelete(expense)}>
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    ` : ""}
                  </td>
                </tr>
              `)}
            </tbody>
          </table>

          <!-- Mobile layout -->
          <div class="d-md-none d-flex flex-column gap-2 p-2">
            ${this._filteredExpenses.map((expense) => html`
              <div class="card border rounded-3 px-3 pt-3 pb-2">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div class="d-flex gap-1 align-items-center">
                    ${expense.BalanceId
                      ? html`<span class="badge bg-success-subtle text-success border border-success-subtle">Settled</span>`
                      : html`<span class="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span>`}
                  </div>
                  ${!expense.BalanceId ? html`
                    <div class="d-flex gap-2">
                      <button class="btn btn-sm btn-outline-secondary" @click=${() => this.#openEditModal(expense)}>
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" @click=${() => this.#confirmDelete(expense)}>
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  ` : ""}
                </div>
                <div class="fw-semibold mb-1">${expense.Note || "—"}</div>
                ${expense.splitUsers.length
                  ? html`<div class="d-flex align-items-center gap-1 flex-wrap mb-1">
                      ${userBadge(expense.createdByUser)}
                      <i class="bi bi-chevron-right text-muted small"></i>
                      ${expense.splitUsers.map((u) => userBadge(u))}
                    </div>`
                  : ""}
                <div class="d-flex justify-content-between align-items-center">
                  <span class="text-muted small">${formatDateTime(expense.DateCreatedUtc)}</span>
                  <span class="fw-bold">${expense.AmountEuros.toFixed(2)}€</span>
                </div>
              </div>
            `)}
          </div>
        `
      : html`<p class="text-muted p-3">No expenses found.</p>`;

    return html`
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span><i class="bi bi-receipt me-1"></i> Expenses</span>
          <button class="btn btn-primary btn-sm" @click=${this.#openAddModal}>
            <i class="bi bi-plus-lg me-1"></i>Add
          </button>
        </div>
        ${this.#renderSummaryCards()}
        <div class="card-body border-bottom py-3">
          <div class="d-flex flex-wrap gap-2 justify-content-center align-items-center">
            <div class="form-floating" style="max-width: 180px">
              <input type="date" id="expenseFrom" class="form-control form-control-sm" placeholder="From" @input=${this.#onFromChange} />
              <label>From</label>
            </div>
            <div class="form-floating" style="max-width: 180px">
              <input type="date" id="expenseTo" class="form-control form-control-sm" placeholder="To" @input=${this.#onToChange} />
              <label>To</label>
            </div>
            <user-filter-dropdown
              .users=${state.allUsers}
              @change=${this.#onUserChange}
            ></user-filter-dropdown>
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="showProcessed" .checked=${this._showProcessed} @change=${this.#onShowProcessedChange} />
              <label class="form-check-label" for="showProcessed">Show settled</label>
            </div>
          </div>
        </div>
        <div>${listContent}</div>
      </div>
      ${this.#renderAddModal()}
      ${this.#renderEditModal()}
    `;
  }
}

customElements.define("expenses-tab", ExpensesTab);

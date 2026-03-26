import { LitElement, html } from "../../lib/lit.min.js";
import { userBadge } from "../components/userBadge.js";
import "../components/userFilterDropdown.js";
import { showConfirm } from "../confirm.js";
import { state } from "../state.js";
import { formatDateTime, toLocalDatetimeInput } from "../utils.js";

function validatePaymentForm(amountEuros, fromUserId, toUserId, dateValue) {
  const errors = [];
  if (!dateValue) {
    errors.push("Date is required.");
  }

  if (!fromUserId) {
    errors.push("Please select who is paying.");
  }

  if (!toUserId) {
    errors.push("Please select who is receiving.");
  }

  if (fromUserId && toUserId && fromUserId === toUserId) {
    errors.push("Payer and receiver must be different.");
  }

  if (isNaN(amountEuros) || amountEuros <= 0) {
    errors.push("Amount must be greater than 0.");
  }

  return errors;
}

class PaymentsTab extends LitElement {
  static properties = {
    _filteredPayments: { state: true },
    _addErrors: { state: true },
    _editErrors: { state: true },
    _addSaving: { state: true },
    _editSaving: { state: true },
    _showSettled: { state: true },
  };

  #fromDate = "";
  #toDate = "";
  #selectedUserIds = null;

  constructor() {
    super();
    this._filteredPayments = [];
    this._addErrors = [];
    this._editErrors = [];
    this._addSaving = false;
    this._editSaving = false;
    this._showSettled = false;
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
    this._filteredPayments = state.allPayments.filter((payment) => {
      if (!this._showSettled && payment.BalanceId) return false;

      if (this.#fromDate && payment.DateCreatedUtc.substring(0, 10) < this.#fromDate) {
        return false;
      }

      if (this.#toDate && payment.DateCreatedUtc.substring(0, 10) > this.#toDate) {
        return false;
      }

      if (
        this.#selectedUserIds !== null &&
        !this.#selectedUserIds.includes(payment.FromUserId) &&
        !this.#selectedUserIds.includes(payment.ToUserId)
      ) {
        return false;
      }

      return true;
    });
  }

  #onShowSettledChange(event) {
    this._showSettled = event.target.checked;
    this.#applyFilters();
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

  #openAddModal() {
    this._addErrors = [];
    this._addSaving = false;
    const modal = bootstrap.Modal.getOrCreateInstance(this.querySelector("#addPaymentModal"));
    modal.show();
    this.updateComplete.then(() => {
      this.querySelector("#addPaymentDate").value = toLocalDatetimeInput();
      this.querySelector("#addPaymentAmount").value = "";
      this.querySelector("#addPaymentNote").value = "";
      const currentUser = state.allUsers.find((u) => u.Emails && u.Emails.includes(state.currentUserEmail));
      this.querySelector("#addPaymentFrom").value = currentUser ? currentUser.Id : (state.allUsers[0]?.Id || "");
      const firstOther = state.allUsers.find((u) => u.Id !== (currentUser?.Id ?? null));
      this.querySelector("#addPaymentTo").value = firstOther ? firstOther.Id : (state.allUsers[0]?.Id || "");
    });
  }

  #openEditModal(payment) {
    this._editErrors = [];
    this._editSaving = false;
    const modal = bootstrap.Modal.getOrCreateInstance(this.querySelector("#editPaymentModal"));
    modal.show();
    this.updateComplete.then(() => {
      this.querySelector("#editPaymentId").value = payment.Id;
      this.querySelector("#editPaymentDate").value = toLocalDatetimeInput(payment.DateCreatedUtc);
      this.querySelector("#editPaymentAmount").value = payment.AmountEuros;
      this.querySelector("#editPaymentNote").value = payment.Note || "";
      this.querySelector("#editPaymentFrom").value = payment.FromUserId || "";
      this.querySelector("#editPaymentTo").value = payment.ToUserId || "";
    });
  }

  async #submitAdd() {
    const dateValue = this.querySelector("#addPaymentDate").value;
    const amountEuros = parseFloat(this.querySelector("#addPaymentAmount").value);
    const note = this.querySelector("#addPaymentNote").value.trim();
    const fromUserId = this.querySelector("#addPaymentFrom").value;
    const toUserId = this.querySelector("#addPaymentTo").value;
    const errors = validatePaymentForm(amountEuros, fromUserId, toUserId, dateValue);
    if (errors.length) {
      this._addErrors = errors;
      return;
    }

    this._addErrors = [];
    this._addSaving = true;
    try {
      await window.api.addPayment({
        AmountEuros: amountEuros,
        DateCreatedUtc: dateValue ? new Date(dateValue).toISOString() : undefined,
        FromUserId: fromUserId,
        ToUserId: toUserId,
        Note: note,
      });
      bootstrap.Modal.getInstance(this.querySelector("#addPaymentModal")).hide();
      await this.#reload();
    } catch (error) {
      this._addErrors = [error.message];
    } finally {
      this._addSaving = false;
    }
  }

  async #submitEdit() {
    const paymentId = this.querySelector("#editPaymentId").value;
    const dateValue = this.querySelector("#editPaymentDate").value;
    const amountEuros = parseFloat(this.querySelector("#editPaymentAmount").value);
    const note = this.querySelector("#editPaymentNote").value.trim();
    const fromUserId = this.querySelector("#editPaymentFrom").value;
    const toUserId = this.querySelector("#editPaymentTo").value;
    const errors = validatePaymentForm(amountEuros, fromUserId, toUserId, dateValue);
    if (errors.length) {
      this._editErrors = errors;
      return;
    }

    this._editErrors = [];
    this._editSaving = true;
    try {
      await window.api.updatePayment(paymentId, {
        AmountEuros: amountEuros,
        DateCreatedUtc: dateValue ? new Date(dateValue).toISOString() : undefined,
        FromUserId: fromUserId,
        ToUserId: toUserId,
        Note: note,
      });
      bootstrap.Modal.getInstance(this.querySelector("#editPaymentModal")).hide();
      await this.#reload();
    } catch (error) {
      this._editErrors = [error.message];
    } finally {
      this._editSaving = false;
    }
  }

  #confirmDelete(payment) {
    showConfirm(
      "Delete Payment",
      "Are you sure you want to delete this payment?",
      "Delete",
      "btn-danger",
      (done) => {
        window.api.deletePayment(payment.Id)
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
        <ul class="mb-0 ps-3">${errors.map((errorMessage) => html`<li>${errorMessage}</li>`)}</ul>
      </div>
    `;
  }


  #renderAddModal() {
    return html`
      <div class="modal fade" data-bs-backdrop="static" data-bs-keyboard="false" id="addPaymentModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-arrow-left-right me-2"></i>Add Payment</h5>
            </div>
            <div class="modal-body">
              <div class="form-floating mb-3">
                <input type="datetime-local" id="addPaymentDate" class="form-control" placeholder="Date" />
                <label><i class="bi bi-calendar me-1"></i>Date</label>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold small"><i class="bi bi-person-dash me-1"></i>Sender</label>
                <select id="addPaymentFrom" class="form-select">
                  ${state.allUsers.map((u) => html`<option value="${u.Id}">${u.DisplayName}</option>`)}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold small"><i class="bi bi-person-plus me-1"></i>Receiver</label>
                <select id="addPaymentTo" class="form-select">
                  ${state.allUsers.map((u) => html`<option value="${u.Id}">${u.DisplayName}</option>`)}
                </select>
              </div>
              <div class="form-floating mb-3">
                <input type="number" id="addPaymentAmount" class="form-control" step="0.01" min="0.01" placeholder="0.00" />
                <label><i class="bi bi-currency-euro me-1"></i>Amount (€)</label>
              </div>
              <div class="form-floating mb-3">
                <input type="text" id="addPaymentNote" class="form-control" placeholder="Note" list="paymentNotesSuggestions" autocomplete="off" />
                <label><i class="bi bi-chat-left-text me-1"></i>Note</label>
              </div>
              ${this.#renderErrors(this._addErrors)}
            </div>
            <div class="modal-footer">
              <button id="addPaymentCancelBtn" class="btn btn-secondary" data-bs-dismiss="modal" ?disabled=${this._addSaving}>Cancel</button>
              <button id="addPaymentSaveBtn" class="btn btn-primary" @click=${this.#submitAdd} ?disabled=${this._addSaving}>
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
      <div class="modal fade" data-bs-backdrop="static" data-bs-keyboard="false" id="editPaymentModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-pencil me-2"></i>Edit Payment</h5>
            </div>
            <div class="modal-body">
              <input type="hidden" id="editPaymentId" />
              <div class="form-floating mb-3">
                <input type="datetime-local" id="editPaymentDate" class="form-control" placeholder="Date" />
                <label><i class="bi bi-calendar me-1"></i>Date</label>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold small"><i class="bi bi-person-dash me-1"></i>Sender</label>
                <select id="editPaymentFrom" class="form-select">
                  ${state.allUsers.map((u) => html`<option value="${u.Id}">${u.DisplayName}</option>`)}
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold small"><i class="bi bi-person-plus me-1"></i>Receiver</label>
                <select id="editPaymentTo" class="form-select">
                  ${state.allUsers.map((u) => html`<option value="${u.Id}">${u.DisplayName}</option>`)}
                </select>
              </div>
              <div class="form-floating mb-3">
                <input type="number" id="editPaymentAmount" class="form-control" step="0.01" min="0.01" placeholder="0.00" />
                <label><i class="bi bi-currency-euro me-1"></i>Amount (€)</label>
              </div>
              <div class="form-floating mb-3">
                <input type="text" id="editPaymentNote" class="form-control" placeholder="Note" list="paymentNotesSuggestions" autocomplete="off" />
                <label><i class="bi bi-chat-left-text me-1"></i>Note</label>
              </div>
              ${this.#renderErrors(this._editErrors)}
            </div>
            <div class="modal-footer">
              <button id="editPaymentCancelBtn" class="btn btn-secondary" data-bs-dismiss="modal" ?disabled=${this._editSaving}>Cancel</button>
              <button id="editPaymentSaveBtn" class="btn btn-primary" @click=${this.#submitEdit} ?disabled=${this._editSaving}>
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
    const payments = this._filteredPayments;
    const totalAmount = payments.reduce((sum, p) => sum + p.AmountEuros, 0);

    return html`
      <div class="row g-3 p-3 border-bottom">
        <div class="col-6 col-lg">
          <div class="rounded-3 p-3 bg-primary bg-opacity-10 h-100 text-center">
            <div class="text-uppercase small fw-semibold text-muted">Total Payments</div>
            <div class="fs-4 fw-bold text-primary">${payments.length}</div>
          </div>
        </div>
        <div class="col-6 col-lg">
          <div class="rounded-3 p-3 bg-success bg-opacity-10 h-100 text-center">
            <div class="text-uppercase small fw-semibold text-muted">Total Amount</div>
            <div class="fs-4 fw-bold text-success">${totalAmount.toFixed(2)}€</div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const listContent = this._filteredPayments.length
      ? html`
          <!-- Desktop layout -->
          <table class="table table-hover align-middle mb-0 d-none d-md-table">
            <colgroup>
              <col style="width:150px">
              <col style="width:220px">
              <col>
              <col style="width:80px">
              <col style="width:90px">
              <col style="width:80px">
            </colgroup>
            <thead class="table-light">
              <tr>
                <th class="fw-semibold small text-muted text-uppercase ps-3">Date</th>
                <th class="fw-semibold small text-muted text-uppercase">From → To</th>
                <th class="fw-semibold small text-muted text-uppercase">Note</th>
                <th class="fw-semibold small text-muted text-uppercase">Status</th>
                <th class="fw-semibold small text-muted text-uppercase text-end">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${this._filteredPayments.map((payment) => html`
                <tr>
                  <td class="text-muted small ps-3">${formatDateTime(payment.DateCreatedUtc)}</td>
                  <td>
                    <span class="d-flex align-items-center gap-1">
                      ${userBadge(payment.fromUser)}
                      <i class="bi bi-arrow-right text-muted small"></i>
                      ${userBadge(payment.toUser)}
                    </span>
                  </td>
                  <td class="text-muted small">${payment.Note || ""}</td>
                  <td>
                    ${payment.BalanceId
                      ? html`<span class="badge bg-success-subtle text-success border border-success-subtle">Settled</span>`
                      : html`<span class="badge bg-warning-subtle text-warning border border-warning-subtle">Open</span>`}
                  </td>
                  <td class="fw-bold text-end">${payment.AmountEuros.toFixed(2)}€</td>
                  <td>
                    ${!payment.BalanceId ? html`
                      <div class="d-flex gap-2 justify-content-end">
                        <button class="btn btn-sm btn-outline-secondary" @click=${() => this.#openEditModal(payment)}>
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" @click=${() => this.#confirmDelete(payment)}>
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
            ${this._filteredPayments.map((payment) => html`
              <div class="card border rounded-3 px-3 pt-3 pb-2">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div class="d-flex gap-1 align-items-center flex-wrap">
                    ${userBadge(payment.fromUser)}
                    <i class="bi bi-arrow-right text-muted"></i>
                    ${userBadge(payment.toUser)}
                    ${payment.BalanceId
                      ? html`<span class="badge bg-success-subtle text-success border border-success-subtle">Settled</span>`
                      : html`<span class="badge bg-warning-subtle text-warning border border-warning-subtle">Open</span>`}
                  </div>
                  ${!payment.BalanceId ? html`
                    <div class="d-flex gap-2">
                      <button class="btn btn-sm btn-outline-secondary" @click=${() => this.#openEditModal(payment)}>
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger" @click=${() => this.#confirmDelete(payment)}>
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  ` : ""}
                </div>
                ${payment.Note ? html`<div class="text-muted small mb-1">${payment.Note}</div>` : ""}
                <div class="d-flex justify-content-between align-items-center">
                  <span class="text-muted small">${formatDateTime(payment.DateCreatedUtc)}</span>
                  <span class="fw-bold">${payment.AmountEuros.toFixed(2)}€</span>
                </div>
              </div>
            `)}
          </div>
        `
      : html`<p class="text-muted p-3">No payments found.</p>`;

    return html`
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span><i class="bi bi-arrow-left-right me-1"></i> Payments</span>
          <button class="btn btn-primary btn-sm" @click=${this.#openAddModal}>
            <i class="bi bi-plus-lg me-1"></i>Add
          </button>
        </div>
        ${this.#renderSummaryCards()}
        <div class="card-body border-bottom py-3">
          <div class="d-flex flex-wrap gap-2 justify-content-center align-items-center">
            <div class="form-floating" style="max-width: 180px">
              <input type="date" id="paymentFrom" class="form-control form-control-sm" placeholder="From" @input=${this.#onFromChange} />
              <label>From</label>
            </div>
            <div class="form-floating" style="max-width: 180px">
              <input type="date" id="paymentTo" class="form-control form-control-sm" placeholder="To" @input=${this.#onToChange} />
              <label>To</label>
            </div>
            <user-filter-dropdown
              .users=${state.allUsers}
              @change=${this.#onUserChange}
            ></user-filter-dropdown>
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" id="showSettledPayments" .checked=${this._showSettled} @change=${this.#onShowSettledChange} />
              <label class="form-check-label" for="showSettledPayments">Show settled</label>
            </div>
          </div>
        </div>
        <div>${listContent}</div>
      </div>
      ${this.#renderAddModal()}
      ${this.#renderEditModal()}
      <datalist id="paymentNotesSuggestions">
        ${state.allNotes.map((note) => html`<option value="${note}"></option>`)}
      </datalist>
    `;
  }
}

customElements.define("payments-tab", PaymentsTab);

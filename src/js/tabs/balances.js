import { LitElement, html } from "../../lib/lit.min.js";
import { userBadge } from "../components/userBadge.js";
import { state } from "../state.js";
import { formatDateOnly } from "../utils.js";

class BalancesTab extends LitElement {
  static properties = {
    _balances: { state: true },
    _unprocessedExpenses: { state: true },
    _unprocessedPayments: { state: true },
    _previewSettlements: { state: true },
    _committing: { state: true },
    _commitError: { state: true },
    _showCommitModal: { state: true },
  };

  constructor() {
    super();
    this._balances = [];
    this._unprocessedExpenses = [];
    this._unprocessedPayments = [];
    this._previewSettlements = [];
    this._committing = false;
    this._commitError = "";
    this._showCommitModal = false;
  }

  createRenderRoot() {
    return this;
  }

  load() {
    this._balances = state.allBalances;
    this._unprocessedExpenses = state.allExpenses.filter((e) => !e.BalanceId);
    this._unprocessedPayments = state.allPayments.filter((p) => !p.BalanceId);
    this._previewSettlements = window.api.computePeriodSettlement().map((s) => {
      const userMap = Object.fromEntries(state.allUsers.map((u) => [u.Id, u]));
      return {
        ...s,
        fromUser: userMap[s.fromUserId] || null,
        toUser: userMap[s.toUserId] || null,
      };
    });
  }

  async #reload() {
    await window.api.loadAll();
    window.refreshCurrentTab();
  }

  async #commitBalance() {
    if (!this._unprocessedExpenses.length && !this._unprocessedPayments.length) return;
    this._committing = true;
    this._commitError = "";
    try {
      await window.api.commitBalance();
      await this.#reload();
    } catch (error) {
      this._commitError = error.message;
    } finally {
      this._committing = false;
    }
  }

  #openCommitModal() {
    this._showCommitModal = true;
    this.updateComplete.then(() => {
      const modal = bootstrap.Modal.getOrCreateInstance(this.querySelector("#commitConfirmModal"));
      modal.show();
    });
  }

  #getPeriodDates(expenses, payments) {
    const dates = [
      ...expenses.map((e) => e.DateCreatedUtc),
      ...payments.map((p) => p.DateCreatedUtc),
    ].filter(Boolean).sort();
    if (!dates.length) return { start: null, end: null };
    return { start: dates[0], end: dates[dates.length - 1] };
  }

  async #confirmCommit() {
    bootstrap.Modal.getInstance(this.querySelector("#commitConfirmModal"))?.hide();
    await this.#commitBalance();
  }

  #renderCommitModal() {
    return html`
      <div class="modal fade" id="commitConfirmModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-check2-circle me-2"></i>Close Period</h5>
            </div>
            <div class="modal-body">
              <p class="text-muted mb-2">The following will be closed and archived:</p>
              ${this._unprocessedExpenses.length ? html`
                <div class="fw-semibold small text-muted text-uppercase mb-1">Expenses</div>
                <ul class="list-unstyled mb-3">
                  ${this._unprocessedExpenses.map((e) => html`
                    <li class="d-flex justify-content-between align-items-center py-1 border-bottom">
                      <span>${userBadge(e.createdByUser)} ${e.Note || "—"}</span>
                      <span class="fw-bold ms-2 flex-shrink-0">${e.AmountEuros.toFixed(2)}€</span>
                    </li>
                  `)}
                </ul>
              ` : ""}
              ${this._unprocessedPayments?.length ? html`
                <div class="fw-semibold small text-muted text-uppercase mb-1">Payments</div>
                <ul class="list-unstyled mb-0">
                  ${this._unprocessedPayments.map((p) => html`
                    <li class="d-flex justify-content-between align-items-center py-1 border-bottom">
                      <span class="d-flex align-items-center gap-1">
                        ${userBadge(p.fromUser)}
                        <i class="bi bi-arrow-right text-muted small"></i>
                        ${userBadge(p.toUser)}
                        ${p.Note ? html`<span class="text-muted small ms-1">${p.Note}</span>` : ""}
                      </span>
                      <span class="fw-bold text-success ms-2 flex-shrink-0">${p.AmountEuros.toFixed(2)}€</span>
                    </li>
                  `)}
                </ul>
              ` : ""}
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-primary" @click=${this.#confirmCommit}>
                <i class="bi bi-check2-circle me-1"></i>Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

#renderPreviewCard() {
    const count = this._unprocessedExpenses.length;
    const total = this._unprocessedExpenses.reduce((sum, e) => sum + e.AmountEuros, 0);
    const paymentCount = this._unprocessedPayments.length;
    const hasAnything = count || paymentCount;
    const { start, end } = this.#getPeriodDates(this._unprocessedExpenses, this._unprocessedPayments);

    return html`
      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span>
            <i class="bi bi-calculator me-1"></i> Close Period
            ${start ? html`<span class="text-muted small ms-2">${formatDateOnly(start)}${start !== end ? html` – ${formatDateOnly(end)}` : ""}</span>` : ""}
          </span>
          <button
            class="btn btn-primary btn-sm"
            @click=${this.#openCommitModal}
            ?disabled=${!hasAnything || this._committing}
          >
            ${this._committing
              ? html`<span class="spinner-border spinner-border-sm me-1"></span>Closing…`
              : html`<i class="bi bi-check2-circle me-1"></i>Close`}
          </button>
        </div>
        <div class="row g-3 p-3 border-bottom">
          <div class="col-4">
            <div class="rounded-3 p-3 bg-primary bg-opacity-10 h-100 text-center">
              <div class="text-uppercase small fw-semibold text-muted">Open Expenses</div>
              <div class="fs-4 fw-bold text-primary">${count}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="rounded-3 p-3 bg-success bg-opacity-10 h-100 text-center">
              <div class="text-uppercase small fw-semibold text-muted">Open Payments</div>
              <div class="fs-4 fw-bold text-success">${paymentCount}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="rounded-3 p-3 bg-warning bg-opacity-10 h-100 text-center">
              <div class="text-uppercase small fw-semibold text-muted">Total Amount</div>
              <div class="fs-4 fw-bold text-warning">${total.toFixed(2)}€</div>
            </div>
          </div>
        </div>
        <div class="card-body">
          ${this._commitError
            ? html`<div class="alert alert-danger py-2 mb-3">${this._commitError}</div>`
            : ""}
          ${hasAnything
            ? html`
                <h6 class="fw-semibold mb-2">Settlement Preview</h6>
                ${this._previewSettlements.length
                  ? html`
                      <ul class="list-group list-group-flush">
                        ${this._previewSettlements.map((s) => html`
                          <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                            <span>
                              ${userBadge(s.fromUser)}
                              <i class="bi bi-arrow-right mx-1 text-muted"></i>
                              ${userBadge(s.toUser)}
                            </span>
                            <span class="fw-bold text-danger">${s.amountEuros.toFixed(2)}€</span>
                          </li>
                        `)}
                      </ul>
                    `
                  : html`<p class="text-muted mb-0">Everyone is already settled up.</p>`}
              `
            : html`<p class="text-muted mb-0">No open expenses or payments to close.</p>`}
        </div>
      </div>
    `;
  }

  #renderBalanceHistory() {
    if (!this._balances.length) {
      return html`<p class="text-muted p-3">No past balances.</p>`;
    }

    return html`
      <div class="accordion" id="balancesAccordion">
        ${this._balances.map((balance, index) => {
          const collapseId = `balanceCollapse_${balance.Id}`;
          const headerId = `balanceHeader_${balance.Id}`;
          const { start, end } = this.#getPeriodDates(balance.expenses, balance.payments);
          return html`
            <div class="accordion-item">
              <h2 class="accordion-header" id="${headerId}">
                <button
                  class="accordion-button collapsed text-truncate"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#${collapseId}"
                >
                  <i class="bi bi-archive me-2 text-muted flex-shrink-0"></i>
                  <span class="me-2 fw-semibold flex-shrink-0">${start ? formatDateOnly(start) : "—"}${start && end && start !== end ? ` – ${formatDateOnly(end)}` : ""}</span>
                  <span class="badge bg-primary bg-opacity-10 text-primary me-2 flex-shrink-0">${balance.expenses.length} expenses</span>
                  ${balance.payments.length ? html`<span class="badge bg-success bg-opacity-10 text-success flex-shrink-0">${balance.payments.length} payments</span>` : ""}
                </button>
              </h2>
              <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#balancesAccordion">
                <div class="accordion-body p-0">
                  <div class="p-3 border-bottom">
                    <div class="fw-semibold small text-muted text-uppercase mb-2">Settlements</div>
                    ${balance.settlements.length
                      ? html`
                          <ul class="list-group list-group-flush">
                            ${balance.settlements.map((s) => html`
                              <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                <span>
                                  ${userBadge(s.fromUser)}
                                  <i class="bi bi-arrow-right mx-1 text-muted"></i>
                                  ${userBadge(s.toUser)}
                                </span>
                                <span class="fw-bold">${s.AmountEuros.toFixed(2)}€</span>
                              </li>
                            `)}
                          </ul>
                        `
                      : html`<p class="text-success mb-0 small"><i class="bi bi-check-circle me-1"></i>All settled up.</p>`}
                  </div>
                  ${balance.expenses.length
                    ? html`
                        <div class="p-3 border-bottom">
                          <div class="fw-semibold small text-muted text-uppercase mb-2">Expenses</div>
                          <!-- Desktop -->
                          <ul class="list-group list-group-flush d-none d-md-block">
                            ${balance.expenses.map((expense) => html`
                              <li class="list-group-item d-flex align-items-center py-2 gap-3">
                                ${userBadge(expense.createdByUser)}
                                <span class="flex-grow-1">${expense.Note || "—"}</span>
                                ${expense.splitUsers.length
                                  ? html`<span class="text-muted small flex-shrink-0">Split: ${expense.splitUsers.map((u) => u.DisplayName).join(", ")}</span>`
                                  : ""}
                                <span class="fw-bold flex-shrink-0">${expense.AmountEuros.toFixed(2)}€</span>
                              </li>
                            `)}
                          </ul>
                          <!-- Mobile -->
                          <div class="d-md-none d-flex flex-column gap-2">
                            ${balance.expenses.map((expense) => html`
                              <div class="card border rounded-3 px-3 pt-3 pb-2">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                  ${userBadge(expense.createdByUser)}
                                  <span class="fw-bold">${expense.AmountEuros.toFixed(2)}€</span>
                                </div>
                                <div class="text-muted small">${expense.Note || "—"}</div>
                                ${expense.splitUsers.length
                                  ? html`<div class="text-muted small">Split: ${expense.splitUsers.map((u) => u.DisplayName).join(", ")}</div>`
                                  : ""}
                              </div>
                            `)}
                          </div>
                        </div>
                      `
                    : ""}
                  ${balance.payments.length
                    ? html`
                        <div class="p-3">
                          <div class="fw-semibold small text-muted text-uppercase mb-2">Payments</div>
                          <ul class="list-group list-group-flush">
                            ${balance.payments.map((payment) => html`
                              <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                                <span class="d-flex align-items-center gap-1">
                                  ${userBadge(payment.fromUser)}
                                  <i class="bi bi-arrow-right text-muted small"></i>
                                  ${userBadge(payment.toUser)}
                                  ${payment.Note ? html`<span class="text-muted small ms-1">${payment.Note}</span>` : ""}
                                </span>
                                <span class="fw-bold text-success flex-shrink-0">${payment.AmountEuros.toFixed(2)}€</span>
                              </li>
                            `)}
                          </ul>
                        </div>
                      `
                    : ""}
                </div>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  render() {
    return html`
      ${this.#renderPreviewCard()}
      <div class="card">
        <div class="card-header"><i class="bi bi-clock-history me-1"></i> Balance History</div>
        <div>${this.#renderBalanceHistory()}</div>
      </div>
      ${this.#renderCommitModal()}
    `;
  }
}

customElements.define("balances-tab", BalancesTab);

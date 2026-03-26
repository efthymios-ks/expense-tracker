import { LitElement, html } from "../../lib/lit.min.js";
import { userBadge } from "../components/userBadge.js";
import { state } from "../state.js";
import { formatDateTime } from "../utils.js";

class DashboardTab extends LitElement {
  static properties = {
    _owed: { state: true },
    _activity: { state: true },
  };

  constructor() {
    super();
    this._owed = [];
    this._activity = [];
  }

  createRenderRoot() {
    return this;
  }

  load() {
    const userMap = Object.fromEntries(state.allUsers.map((u) => [u.Id, u]));

    this._owed = window.api.computeCurrentOwed().map((s) => ({
      ...s,
      fromUser: userMap[s.fromUserId] || null,
      toUser: userMap[s.toUserId] || null,
    }));

    const expenses = state.allExpenses.filter((e) => !e.BalanceId).map((e) => ({ ...e, _type: "expense" }));
    const payments = state.allPayments.filter((p) => !p.BalanceId).map((p) => ({ ...p, _type: "payment" }));
    this._activity = [...expenses, ...payments]
      .sort((a, b) => (b.DateCreatedUtc || "").localeCompare(a.DateCreatedUtc || ""))
      .slice(0, 15);
  }

  #renderCurrentBalance() {
    const openExpenses = state.allExpenses.filter((e) => !e.BalanceId);
    const openPayments = state.allPayments.filter((p) => !p.BalanceId);
    const expenseTotal = openExpenses.reduce((sum, e) => sum + e.AmountEuros, 0);
    const paymentTotal = openPayments.reduce((sum, p) => sum + p.AmountEuros, 0);
    const settlementTotal = state.allSettlements.reduce((sum, s) => sum + s.AmountEuros, 0);

    return html`
      <div class="col-12 col-md-6">
        <div class="card">
          <div class="card-header"><i class="bi bi-hourglass-split me-1"></i> Current Balance</div>
          <div class="card-body">
            ${this._owed.length
              ? html`
                  <ul class="list-group list-group-flush mb-3">
                    ${this._owed.map((s) => html`
                      <li class="list-group-item px-0 d-flex justify-content-between align-items-center py-2">
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
              : html`<p class="text-success fw-semibold mb-3"><i class="bi bi-check-circle me-1"></i>Everyone is settled up.</p>`}
            <ul class="list-unstyled text-muted small mb-0 border-top pt-3">
              <li class="d-flex justify-content-between">
                <span><i class="bi bi-receipt me-1"></i>Open expenses</span>
                <span>${openExpenses.length} &middot; ${expenseTotal.toFixed(2)}€</span>
              </li>
              <li class="d-flex justify-content-between mt-1">
                <span><i class="bi bi-arrow-left-right me-1"></i>Payments</span>
                <span>${openPayments.length} &middot; ${paymentTotal.toFixed(2)}€</span>
              </li>
              ${state.allSettlements.length ? html`
                <li class="d-flex justify-content-between mt-1">
                  <span><i class="bi bi-check2-circle me-1"></i>Past settlements</span>
                  <span>${state.allSettlements.length} &middot; ${settlementTotal.toFixed(2)}€</span>
                </li>
              ` : ""}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  #renderActivity() {
    return html`
      <div class="col-12 col-md-6">
        <div class="card h-100">
          <div class="card-header"><i class="bi bi-clock-history me-1"></i> Recent Activity</div>
          <div class="card-body p-0">
            ${this._activity.length
              ? html`
                  <ul class="list-group list-group-flush">
                    ${this._activity.map((item) => item._type === "expense"
                      ? html`
                          <li class="list-group-item py-2">
                            <div class="d-flex justify-content-between align-items-start">
                              <div>
                                <i class="bi bi-receipt text-muted me-1"></i>
                                <span class="fw-semibold">${item.Note || "—"}</span>
                                <div class="d-flex align-items-center gap-1 flex-wrap mt-1">
                                  ${userBadge(item.createdByUser)}
                                  <i class="bi bi-chevron-right text-muted small"></i>
                                  ${item.splitUsers.map((u) => userBadge(u))}
                                </div>
                              </div>
                              <div class="text-end flex-shrink-0 ms-2">
                                <div class="fw-bold">${item.AmountEuros.toFixed(2)}€</div>
                                <div class="text-muted small">${formatDateTime(item.DateCreatedUtc)}</div>
                              </div>
                            </div>
                          </li>
                        `
                      : html`
                          <li class="list-group-item py-2">
                            <div class="d-flex justify-content-between align-items-start">
                              <div>
                                <i class="bi bi-arrow-left-right text-muted me-1"></i>
                                <span class="fw-semibold">Payment</span>
                                ${item.Note ? html`<span class="text-muted ms-1 small">${item.Note}</span>` : ""}
                                <div class="d-flex align-items-center gap-1 mt-1">
                                  ${userBadge(item.fromUser)}
                                  <i class="bi bi-arrow-right text-muted small"></i>
                                  ${userBadge(item.toUser)}
                                </div>
                              </div>
                              <div class="text-end flex-shrink-0 ms-2">
                                <div class="fw-bold text-success">${item.AmountEuros.toFixed(2)}€</div>
                                <div class="text-muted small">${formatDateTime(item.DateCreatedUtc)}</div>
                              </div>
                            </div>
                          </li>
                        `
                    )}
                  </ul>
                `
              : html`<p class="text-muted p-3 mb-0">No recent activity.</p>`}
          </div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="row g-3 mt-0">
        ${this.#renderCurrentBalance()}
        ${this.#renderActivity()}
      </div>
    `;
  }
}

customElements.define("dashboard-tab", DashboardTab);

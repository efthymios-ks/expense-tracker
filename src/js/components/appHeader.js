import { LitElement, html, nothing } from "../../lib/lit.min.js";

const TABS = [
  { name: "dashboard", label: "Dashboard", icon: "bi-speedometer2" },
  { name: "expenses", label: "Expenses", icon: "bi-receipt" },
  { name: "payments", label: "Payments", icon: "bi-arrow-left-right" },
  { name: "balances", label: "Balances", icon: "bi-graph-up" },
];

const navItem = (tab, { dismiss = false } = {}) => html`
  <a href="#" class="nav-link rounded px-3" data-tab="${tab.name}"
    data-bs-dismiss=${dismiss ? "offcanvas" : nothing}
    @click=${(e) => { e.preventDefault(); window.showTab(tab.name); }}>
    <i class="bi ${tab.icon} me-2"></i>${tab.label}
  </a>
`;

class AppHeader extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <!-- Desktop Sidebar -->
      <nav class="d-none d-md-flex flex-column bg-primary flex-shrink-0 position-sticky top-0 vh-100 overflow-auto navbar-dark" style="width: 220px">
        <div class="px-3 py-3 fw-bold text-white border-bottom border-white border-opacity-25 small">
          💸 Expense Tracker
        </div>
        <div class="navbar-nav flex-column p-2 flex-grow-1 gap-1">
          ${TABS.map((tab) => navItem(tab))}
        </div>
      </nav>

      <!-- Mobile Offcanvas -->
      <div class="offcanvas offcanvas-start bg-primary" tabindex="-1" id="mobileOffcanvas">
        <div class="offcanvas-header border-bottom border-white border-opacity-25">
          <h6 class="offcanvas-title fw-bold text-white">💸 Expense Tracker</h6>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body p-2 navbar-dark">
          <nav class="navbar-nav flex-column gap-1">
            ${TABS.map((tab) => navItem(tab, { dismiss: true }))}
          </nav>
        </div>
      </div>

      <!-- Mobile Top Navbar -->
      <nav class="navbar navbar-dark bg-primary d-md-none position-fixed top-0 start-0 end-0" style="z-index: 1030">
        <div class="container-fluid">
          <span class="navbar-brand fw-bold">💸 Expense Tracker</span>
          <button class="navbar-toggler border-0" type="button"
            data-bs-toggle="offcanvas" data-bs-target="#mobileOffcanvas">
            <span class="navbar-toggler-icon"></span>
          </button>
        </div>
      </nav>
    `;
  }
}

customElements.define("app-header", AppHeader);

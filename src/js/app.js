import { state } from "./state.js";
import "./components/appHeader.js";
import "./components/loadingOverlay.js";
import "./tabs/dashboard.js";
import "./tabs/expenses.js";
import "./tabs/payments.js";
import "./tabs/balances.js";

function setLoading(visible, text = "") {
  visible ? window.loadingModal.show(text) : window.loadingModal.hide();
}

async function onAuthReady() {
  setLoading(true);
  await window.sheets.init();
  await window.api.loadAll();
  setLoading(false);
  showTab("dashboard");
}

function showTab(tabName) {
  state.currentTab = tabName;
  const tabNames = ["dashboard", "expenses", "payments", "balances"];

  tabNames.forEach((currentTabName) => {
    document.getElementById(`tab-${currentTabName}`).classList.toggle("d-none", currentTabName !== tabName);
  });

  document.querySelectorAll("[data-tab]").forEach((link) => {
    link.dataset.tab === tabName
      ? link.setAttribute("data-selected", "")
      : link.removeAttribute("data-selected");
  });

  if (tabName === "dashboard") {
    document.getElementById("tab-dashboard").load();
  }

  if (tabName === "expenses") {
    document.getElementById("tab-expenses").load();
  }

  if (tabName === "payments") {
    document.getElementById("tab-payments").load();
  }

  if (tabName === "balances") {
    document.getElementById("tab-balances").load();
  }
}

function refreshCurrentTab() {
  showTab(state.currentTab);
}

window.onAuthReady = onAuthReady;
window.showTab = showTab;
window.refreshCurrentTab = refreshCurrentTab;
window.setLoading = setLoading;

window.onload = () => {
  window.auth.initAuth(onAuthReady);
};

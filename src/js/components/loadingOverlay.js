let _modal = null;

function getModal() {
  if (!_modal) {
    _modal = new bootstrap.Modal(document.getElementById("loadingModal"));
  }
  return _modal;
}

window.loadingModal = {
  show(text = "") {
    document.getElementById("loadingSpinnerSection").classList.remove("d-none");
    document.getElementById("loadingErrorSection").classList.add("d-none");
    document.getElementById("loadingText").textContent = text;
    getModal().show();
  },

  hide() {
    getModal().hide();
  },

  showError(message) {
    document.getElementById("loadingSpinnerSection").classList.add("d-none");
    document.getElementById("loadingErrorMessage").textContent = message;
    document.getElementById("loadingErrorSection").classList.remove("d-none");
  },
};

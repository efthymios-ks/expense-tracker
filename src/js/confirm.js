export function showConfirm(title, message, confirmLabel, confirmClass, onConfirm) {
  document.getElementById("confirmModalTitle").textContent = title;
  document.getElementById("confirmModalBody").textContent = message;
  const actionButton = document.getElementById("confirmModalActionBtn");
  const cancelButton = document.querySelector("#confirmModal .btn-secondary");
  actionButton.textContent = confirmLabel;
  actionButton.className = `btn btn-sm ${confirmClass}`;
  actionButton.disabled = false;
  if (cancelButton) {
    cancelButton.disabled = false;
  }

  actionButton.onclick = () => {
    actionButton.disabled = true;
    actionButton.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Deleting…`;
    if (cancelButton) {
      cancelButton.disabled = true;
    }

    onConfirm(() => {
      bootstrap.Modal.getInstance(document.getElementById("confirmModal")).hide();
      actionButton.disabled = false;
      actionButton.textContent = confirmLabel;
      if (cancelButton) {
        cancelButton.disabled = false;
      }
    });
  };

  new bootstrap.Modal(document.getElementById("confirmModal")).show();
}

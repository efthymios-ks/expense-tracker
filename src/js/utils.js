export function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

export function formatDate(dateString) {
  if (!dateString) {
    return "—";
  }

  const dateParts = dateString.split("-");
  return dateParts.length !== 3 ? dateString : `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
}

export function toLocalDatetimeInput(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateOnly(isoString) {
  if (!isoString) {
    return "—";
  }
  try {
    const date = new Date(isoString);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString) {
  if (!isoString) {
    return "—";
  }

  try {
    const date = new Date(isoString);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return isoString;
  }
}

export function normalizeSearch(value) {
  return String(value == null ? "" : value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

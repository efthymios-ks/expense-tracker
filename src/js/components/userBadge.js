import { html } from "../../lib/lit.min.js";

export function userBadge(user) {
  if (!user) return html`<span class="badge bg-secondary">Unknown</span>`;
  return html`<span class="badge rounded-pill" style="background-color: ${user.BackgroundColor}; color: ${user.ForegroundColor}">${user.DisplayName}</span>`;
}

import { LitElement, html } from "../../lib/lit.min.js";
import { userBadge } from "./userBadge.js";

class UserFilterDropdown extends LitElement {
  static properties = {
    users: { type: Array },
    _checkedIds: { state: true },
  };

  constructor() {
    super();
    this.users = [];
    this._checkedIds = [];
  }

  createRenderRoot() {
    return this;
  }

  willUpdate(changedProperties) {
    if (changedProperties.has("users") && this.users.length) {
      this._checkedIds = this.users.map((u) => u.Id);
    }
  }

  get selectedIds() {
    return this._checkedIds.length === this.users.length ? null : this._checkedIds;
  }

  get #label() {
    if (this._checkedIds.length === this.users.length) {
      return "All Users";
    }

    if (this._checkedIds.length === 0) {
      return "No Users";
    }

    return this.users
      .filter((u) => this._checkedIds.includes(u.Id))
      .map((u) => u.DisplayName)
      .join(", ");
  }

  #handleChange(userId, checked) {
    this._checkedIds = checked
      ? [...this._checkedIds, userId]
      : this._checkedIds.filter((id) => id !== userId);
    this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="dropdown">
        <button
          class="btn btn-outline-secondary btn-sm dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          data-bs-auto-close="outside"
        >
          ${this.#label}
        </button>
        <ul class="dropdown-menu p-2" style="min-width: 180px">
          ${this.users.map((user) => html`
            <li>
              <label class="dropdown-item d-flex gap-2 align-items-center" style="cursor: pointer">
                <input
                  type="checkbox"
                  .checked=${this._checkedIds.includes(user.Id)}
                  @change=${(e) => { e.stopPropagation(); this.#handleChange(user.Id, e.target.checked); }}
                />
                ${userBadge(user)}
              </label>
            </li>
          `)}
        </ul>
      </div>
    `;
  }
}

customElements.define("user-filter-dropdown", UserFilterDropdown);

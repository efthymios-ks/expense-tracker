import { LitElement, html } from "../../lib/lit.min.js";
import { userBadge } from "./userBadge.js";

class UserCheckboxes extends LitElement {
  static properties = {
    users: { type: Array },
    initialIds: { type: Array },
    _checkedIds: { state: true },
  };

  constructor() {
    super();
    this.users = [];
    this.initialIds = null;
    this._checkedIds = [];
  }

  createRenderRoot() {
    return this;
  }

  willUpdate(changedProperties) {
    if (changedProperties.has("users") || changedProperties.has("initialIds")) {
      // null = all users selected (default); [] = none selected
      this._checkedIds = this.initialIds === null
        ? this.users.map((u) => u.Id)
        : [...this.initialIds];
    }
  }

  get selectedIds() {
    return this._checkedIds;
  }

  #handleChange(userId, checked) {
    this._checkedIds = checked
      ? [...this._checkedIds, userId]
      : this._checkedIds.filter((id) => id !== userId);
  }

  render() {
    return html`
      <div class="d-flex flex-wrap gap-2">
        ${this.users.map((user) => html`
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="userCb_${this.id}_${user.Id}"
              .checked=${this._checkedIds.includes(user.Id)}
              @change=${(e) => this.#handleChange(user.Id, e.target.checked)}
            />
            <label class="form-check-label" for="userCb_${this.id}_${user.Id}">
              ${userBadge(user)}
            </label>
          </div>
        `)}
      </div>
    `;
  }
}

customElements.define("user-checkboxes", UserCheckboxes);

import { LitElement, html } from "../../lib/lit.min.js";

class NoteAutocomplete extends LitElement {
  static properties = {
    suggestions: {},
    _value: { state: true },
    _open: { state: true },
    _filtered: { state: true },
  };

  constructor() {
    super();
    this.suggestions = [];
    this._value = "";
    this._open = false;
    this._filtered = [];
  }

  createRenderRoot() {
    return this;
  }

  get value() {
    return this._value;
  }

  set value(v) {
    this._value = v ?? "";
  }

  #onFocus() {
    const q = this._value.trim().toLowerCase();
    this._filtered = q
      ? this.suggestions.filter((n) => n.toLowerCase().includes(q))
      : [...this.suggestions];
    this._open = this._filtered.length > 0;
  }

  #onInput(e) {
    this._value = e.target.value;
    const q = this._value.trim().toLowerCase();
    this._filtered = q
      ? this.suggestions.filter((n) => n.toLowerCase().includes(q))
      : [...this.suggestions];
    this._open = this._filtered.length > 0;
  }

  #onBlur() {
    setTimeout(() => { this._open = false; }, 200);
  }

  #select(note) {
    this._value = note;
    this._open = false;
    this.dispatchEvent(new Event("input", { bubbles: true }));
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  render() {
    const open = this._open && this._filtered.length > 0;
    return html`
      <div style="position:relative">
        <div class="form-floating">
          <input
            type="text"
            class="form-control${open ? " note-ac-open" : ""}"
            placeholder="Note"
            autocomplete="off"
            .value=${this._value}
            @focus=${this.#onFocus}
            @input=${this.#onInput}
            @blur=${this.#onBlur}
          />
          <label><i class="bi bi-chat-left-text me-1"></i>Note</label>
        </div>
        ${open ? html`
          <div class="note-ac-dropdown">
            ${this._filtered.map((note) => html`
              <div
                class="note-ac-item"
                @touchstart=${(e) => { e.preventDefault(); this.#select(note); }}
                @mousedown=${(e) => { e.preventDefault(); this.#select(note); }}
              >${note}</div>
            `)}
          </div>
        ` : ""}
      </div>
    `;
  }
}

customElements.define("note-autocomplete", NoteAutocomplete);

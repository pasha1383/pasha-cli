const template = document.createElement('template');
template.innerHTML = `
  <style>
    .counter {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      min-width: 250px;
    }
    .counter-display {
      font-size: 3rem;
      font-weight: 800;
      color: var(--color-primary);
      font-variant-numeric: tabular-nums;
      transition: color 0.15s;
    }
    .counter-buttons {
      display: flex;
      gap: 0.5rem;
    }
    .counter-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: white;
      font-size: 1.5rem;
      cursor: pointer;
      transition: all 0.15s;
      color: var(--color-text);
    }
    .counter-btn:hover {
      background: var(--color-bg-alt);
      border-color: var(--color-primary);
    }
    .counter-btn:active {
      transform: scale(0.95);
    }
    .counter-reset {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 0.875rem;
      text-decoration: underline;
      margin-top: 0.5rem;
    }
    .counter-reset:hover {
      color: var(--color-text);
    }
  </style>
  <div class="counter" role="group" aria-label="Interactive counter">
    <span class="counter-display" id="count" aria-live="polite">0</span>
    <div class="counter-buttons">
      <button class="counter-btn" id="decrement" aria-label="Decrement">-</button>
      <button class="counter-btn" id="increment" aria-label="Increment">+</button>
    </div>
    <button class="counter-reset" id="reset">Reset</button>
  </div>
`;

class InteractiveCounter extends HTMLElement {
  constructor() {
    super();
    this._count = 0;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this._display = this.shadowRoot.getElementById('count');
    this.shadowRoot.getElementById('increment').addEventListener('click', () => this._update(1));
    this.shadowRoot.getElementById('decrement').addEventListener('click', () => this._update(-1));
    this.shadowRoot.getElementById('reset').addEventListener('click', () => this._update(-this._count));
  }

  _update(delta) {
    this._count += delta;
    this._display.textContent = this._count;
  }
}

customElements.define('interactive-counter', InteractiveCounter);

const icons = {
  lightning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  devices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.6 1.5-1.5 0-.4-.1-.7-.3-1-.4-.5-.7-1.1-.7-1.8 0-1.2 1-2.2 2.2-2.2H17c5.5 0 7-4.5 7-7C24 5.5 19.5 2 12 2z"/></svg>',
  rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7"/></svg>',
};

const template = document.createElement('template');
template.innerHTML = `
  <style>
    @import '/styles/components/card.css';
  </style>
  <div class="card">
    <div class="card-icon" part="icon"></div>
    <h3 class="card-title" part="title"></h3>
    <p class="card-desc" part="desc"></p>
  </div>
`;

class FeatureCard extends HTMLElement {
  static get observedAttributes() {
    return ['icon', 'title', 'description'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    const iconName = this.getAttribute('icon') || 'code';
    this.shadowRoot.querySelector('.card-icon').innerHTML = icons[iconName] || icons.code;
    this.shadowRoot.querySelector('.card-title').textContent = this.getAttribute('title') || '';
    this.shadowRoot.querySelector('.card-desc').textContent = this.getAttribute('description') || '';
  }
}

customElements.define('feature-card', FeatureCard);

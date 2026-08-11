const template = document.createElement('template');
template.innerHTML = `
  <style>
    @import '/styles/components/header.css';
  </style>
  <header class="header" role="banner">
    <div class="container">
      <a href="/" class="logo" aria-label="{{projectName}} home">{{projectName}}</a>
      <button class="menu-btn" aria-expanded="false" aria-controls="mobile-nav" aria-label="Toggle navigation menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="4" y1="6" x2="20" y2="6"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      </button>
      <nav aria-label="Main navigation">
        <ul class="nav-desktop" role="menubar">
          <li role="none"><a href="#features" role="menuitem">Features</a></li>
          <li role="none"><a href="#demo" role="menuitem">Demo</a></li>
          <li role="none"><a href="#about" role="menuitem">About</a></li>
        </ul>
      </nav>
    </div>
    <ul id="mobile-nav" class="nav-mobile" role="menu" aria-label="Mobile navigation">
      <li role="none"><a href="#features" role="menuitem">Features</a></li>
      <li role="none"><a href="#demo" role="menuitem">Demo</a></li>
      <li role="none"><a href="#about" role="menuitem">About</a></li>
    </ul>
  </header>
`;

class AppHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const btn = this.shadowRoot.querySelector('.menu-btn');
    const mobileNav = this.shadowRoot.getElementById('mobile-nav');
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      mobileNav.classList.toggle('open');
    });
  }
}

customElements.define('app-header', AppHeader);

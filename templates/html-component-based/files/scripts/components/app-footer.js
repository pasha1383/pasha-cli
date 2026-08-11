const template = document.createElement('template');
template.innerHTML = `
  <style>
    @import '/styles/components/footer.css';
  </style>
  <footer class="footer" role="contentinfo">
    <div class="container">
      <p>&copy; <span id="year"></span> <slot name="project-name">Project</slot>. Built with Web Components.</p>
      <nav aria-label="Footer navigation">
        <ul class="footer-nav">
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Terms of Service</a></li>
          <li><a id="github-link" href="#" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        </ul>
      </nav>
    </div>
  </footer>
`;

class AppFooter extends HTMLElement {
  static get observedAttributes() {
    return ['author', 'github'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.shadowRoot.getElementById('year').textContent = new Date().getFullYear();
    const githubLink = this.shadowRoot.getElementById('github-link');
    const username = this.getAttribute('github') || 'developer';
    githubLink.href = `https://github.com/${username}`;
    githubLink.textContent = `@${username}`;
  }
}

customElements.define('app-footer', AppFooter);

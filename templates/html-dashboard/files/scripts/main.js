document.getElementById('current-year').textContent = new Date().getFullYear();

(function initAvatar() {
  const appDataEl = document.getElementById('app-data');
  if (appDataEl) {
    try {
      const data = JSON.parse(appDataEl.textContent);
      const names = data.author.split(' ');
      const initials = names.map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2);
      const avatarEl = document.getElementById('user-avatar');
      if (avatarEl) avatarEl.textContent = initials;
    } catch (_) {}
  }
})();

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const openBtn = document.getElementById('sidebar-open-btn');
const closeBtn = document.getElementById('sidebar-close-btn');

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

openBtn.addEventListener('click', openSidebar);
closeBtn.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar.classList.contains('open')) {
    closeSidebar();
  }
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

document.querySelectorAll('.sidebar-nav a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  });
});

const searchInput = document.getElementById('topbar-search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.data-table tbody tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

document.querySelectorAll('.chart-select').forEach(select => {
  select.addEventListener('change', (e) => {
    const card = select.closest('.chart-card');
    const title = card.querySelector('.chart-title');
    console.log(`${title.textContent}: ${e.target.value} selected`);
  });
});

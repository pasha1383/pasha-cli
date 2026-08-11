const currentYear = new Date().getFullYear();
document.getElementById('current-year').textContent = currentYear;

const menuBtn = document.getElementById('mobile-menu-btn');
const mainNav = document.getElementById('main-nav');

if (menuBtn && mainNav) {
  menuBtn.addEventListener('click', () => {
    const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!expanded));
    mainNav.classList.toggle('hidden');
    mainNav.classList.toggle('flex');
    mainNav.classList.toggle('flex-col');
    mainNav.classList.toggle('absolute');
    mainNav.classList.toggle('top-16');
    mainNav.classList.toggle('left-0');
    mainNav.classList.toggle('right-0');
    mainNav.classList.toggle('bg-white');
    mainNav.classList.toggle('shadow-md');
    mainNav.classList.toggle('p-4');
    mainNav.classList.toggle('space-y-2');
  });
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (mainNav && mainNav.classList.contains('flex') && window.innerWidth < 768) {
      menuBtn.click();
    }
  });
});

const contactForm = document.querySelector('form[aria-label="Contact form"]');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());
    console.log('Form submitted:', data);
    contactForm.reset();
    alert('Thank you for your message! We\'ll get back to you soon.');
  });
}

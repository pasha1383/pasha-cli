document.getElementById('current-year').textContent = new Date().getFullYear();

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const toggler = document.querySelector('.navbar-toggler');
    const collapse = document.querySelector('#mainNavbar');
    if (toggler && collapse && collapse.classList.contains('show')) {
      toggler.click();
    }
  });
});

const contactForm = document.querySelector('form[aria-label="Contact form"]');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!contactForm.checkValidity()) {
      contactForm.classList.add('was-validated');
      return;
    }
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData.entries());
    console.log('Form submitted:', data);
    contactForm.reset();
    contactForm.classList.remove('was-validated');
    alert('Thank you for your message! We\'ll get back to you soon.');
  });
}

document.querySelectorAll('.accordion-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.querySelector(btn.getAttribute('data-bs-target'));
    if (target) {
      btn.setAttribute('aria-expanded', target.classList.contains('show') ? 'false' : 'true');
    }
  });
});

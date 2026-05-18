// ===== NAV SCROLL EFFECT =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
});

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, i * 120);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));

// ===== FAQ TOGGLE =====
function toggleFaq(btn) {
  const item = btn.parentElement;
  const answer = item.querySelector('.faq-a');
  const isOpen = answer.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q').forEach(q => {
    q.classList.remove('open');
    q.setAttribute('aria-expanded', 'false');
  });

  if (!isOpen) {
    answer.classList.add('open');
    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}

// ===== FORM SUBMIT =====
function handleSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('registerForm');
  const success = document.getElementById('successMsg');
  const btn = document.getElementById('submitBtn');
  
  btn.textContent = 'Đang gửi...';
  btn.disabled = true;

  // URL Web App của Google Apps Script
  const scriptURL = 'https://script.google.com/macros/s/AKfycbzw19G0V-YPumTN_AGbc2bgU5HkOiintI9GdlgaCgZ1EoQpZPmOg1Hf2QTT8vHgM6Z7/exec';

  const formData = new FormData(form);
  const data = new URLSearchParams();
  for (const pair of formData) {
    data.append(pair[0], pair[1]);
  }

  fetch(scriptURL, { 
    method: 'POST', 
    body: data,
    mode: 'no-cors' 
  })
    .then(response => {
      // Vì dùng no-cors nên không check được response thực sự, nhưng nếu vào đây thì request đã được gửi
      btn.textContent = 'Đã gửi!';
      form.style.display = 'none';
      success.classList.add('show');
    })
    .catch(error => {
      console.error('Error!', error.message);
      btn.textContent = 'Đăng Ký Giữ Chỗ Ngay ✦';
      btn.disabled = false;
      alert('Có lỗi xảy ra khi gửi đăng ký. Vui lòng thử lại sau.');
    });
}

// ===== SMOOTH PARALLAX =====
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    heroBg.style.transform = `translateY(${scrollY * 0.35}px)`;
  }
});

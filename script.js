// ═══════════════════════════════════════════════════════════════
//  ⚙️  CẤU HÌNH THANH TOÁN — chỉnh tại đây
// ═══════════════════════════════════════════════════════════════
const PAYMENT = {
  GAS_URL:       'https://script.google.com/macros/s/AKfycbxYx0u0kOuSH9F26Dlni6RjWMXcuTrqvvtvhWNjX63vNDU89FBiVLI9JxxEgTRBKwk/exec',

  BANK_BIN:      '970415',          // VietinBank
  ACCOUNT_NO:    '109006855197',    // Số tài khoản
  ACCOUNT_NAME:  'TO THI MY PHUONG', // Tên chủ tài khoản
  AMOUNT:        279000,          // Giá vé (VNĐ)
  THANK_YOU_URL: 'thank-you.html',// URL trang cảm ơn sau thanh toán

  POLL_INTERVAL: 3000,  // Kiểm tra mỗi 3 giây
  POLL_TIMEOUT:  200,   // 200 lần × 3s = 10 phút tối đa
};


// ═══════════════════════════════════════════════════════════════
//  NAV SCROLL EFFECT
// ═══════════════════════════════════════════════════════════════
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
});


// ═══════════════════════════════════════════════════════════════
//  SCROLL ANIMATIONS
// ═══════════════════════════════════════════════════════════════
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


// ═══════════════════════════════════════════════════════════════
//  FAQ TOGGLE
// ═══════════════════════════════════════════════════════════════
function toggleFaq(btn) {
  const item   = btn.parentElement;
  const answer = item.querySelector('.faq-a');
  const isOpen = answer.classList.contains('open');

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


// ═══════════════════════════════════════════════════════════════
//  SMOOTH PARALLAX
// ═══════════════════════════════════════════════════════════════
window.addEventListener('scroll', () => {
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) heroBg.style.transform = `translateY(${window.scrollY * 0.35}px)`;
});


// ═══════════════════════════════════════════════════════════════
//  LUỒNG 1A: FORM SUBMIT → ĐĂNG KÝ ĐƠN HÀNG
// ═══════════════════════════════════════════════════════════════
async function handleSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('registerForm');
  const btn  = document.getElementById('submitBtn');

  btn.textContent = 'Đang xử lý…';
  btn.disabled    = true;

  // Thu thập dữ liệu form
  const params = new URLSearchParams({
    action: 'register',
    Name:   form.Name.value.trim(),
    Phone:  form.Phone.value.trim(),
    Email:  form.Email.value.trim(),
    Status: form.Status.value,
    Why:    form.Why.value.trim(),
  });

  try {
    const res  = await fetch(`${PAYMENT.GAS_URL}?${params.toString()}`);
    const data = await res.json();

    if (!data.success || !data.orderId) throw new Error(data.error || 'Không nhận được mã đơn');

    showQRModal(data.orderId);
    startPolling(data.orderId);

  } catch (err) {
    alert('Có lỗi khi đăng ký. Vui lòng thử lại.\n(' + err.message + ')');
    btn.textContent = 'Đăng Ký Giữ Chỗ Ngay ✦';
    btn.disabled    = false;
  }
}


// ═══════════════════════════════════════════════════════════════
//  MODAL QR CODE
// ═══════════════════════════════════════════════════════════════
function showQRModal(orderId) {
  const modal  = document.getElementById('qrModal');
  const qrImg  = document.getElementById('qrCodeImg');
  const qrId   = document.getElementById('qrOrderId');
  const qrAmt  = document.getElementById('qrAmount');
  const status = document.getElementById('qrStatus');
  const success = document.getElementById('qrSuccess');

  // Đặt lại trạng thái
  status.style.display  = 'flex';
  success.style.display = 'none';

  // Điền thông tin
  qrId.textContent  = orderId;
  qrAmt.textContent = PAYMENT.AMOUNT.toLocaleString('vi-VN') + ' ₫';

  // Tạo QR SePay
  const qrUrl = `https://qr.sepay.vn/img?bank=${PAYMENT.BANK_BIN}&acc=${PAYMENT.ACCOUNT_NO}&template=compact&amount=${PAYMENT.AMOUNT}&des=${orderId}`;
  qrImg.src = qrUrl;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function hideQRModal() {
  const modal = document.getElementById('qrModal');
  modal.classList.remove('open');
  document.body.style.overflow = '';
  stopPolling();

  // Khôi phục form
  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Đăng Ký Giữ Chỗ Ngay ✦';
  btn.disabled    = false;
}

function copyOrderId() {
  const orderId = document.getElementById('qrOrderId').textContent;
  navigator.clipboard.writeText(orderId).then(() => {
    const btn = document.querySelector('.btn-copy');
    btn.textContent = '✅';
    setTimeout(() => { btn.textContent = '📋'; }, 1500);
  });
}


// ═══════════════════════════════════════════════════════════════
//  LUỒNG 1B: POLLING KIỂM TRA TRẠNG THÁI
// ═══════════════════════════════════════════════════════════════
let _pollTimer = null;
let _pollCount = 0;

function startPolling(orderId) {
  _pollCount = 0;
  _pollTimer = setInterval(async () => {
    _pollCount++;

    if (_pollCount > PAYMENT.POLL_TIMEOUT) {
      stopPolling();
      showPollTimeout();
      return;
    }

    try {
      const res  = await fetch(`${PAYMENT.GAS_URL}?action=check&orderId=${orderId}`);
      const data = await res.json();
      if (data.paid) {
        stopPolling();
        showPaymentSuccess();
      }
    } catch (_) {
      // Lỗi mạng tạm thời — thử lại lần sau
    }
  }, PAYMENT.POLL_INTERVAL);
}

function stopPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

function showPaymentSuccess() {
  document.getElementById('qrStatus').style.display  = 'none';
  document.getElementById('qrSuccess').style.display = 'flex';
  setTimeout(() => {
    window.location.href = PAYMENT.THANK_YOU_URL;
  }, 2000);
}

function showPollTimeout() {
  const status = document.getElementById('qrStatus');
  status.innerHTML = `
    <span style="color:#c0392b; text-align:center; font-size:0.9rem;">
      Hệ thống chưa nhận được giao dịch sau 10 phút.<br>
      Nếu bạn đã chuyển khoản, vui lòng liên hệ qua email để xác nhận thủ công.
    </span>`;
}

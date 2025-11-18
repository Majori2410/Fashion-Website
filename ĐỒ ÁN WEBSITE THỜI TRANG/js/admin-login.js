(function(){
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', (e)=>{
    e.preventDefault();

    // Lấy dữ liệu form
    const fd = new FormData(form);
    const email = (fd.get('email') || '').trim();
    const password = (fd.get('password') || '').trim();
    const displayName = (fd.get('displayName') || '').trim() || 'Nguyễn Admin';
    const avatarUrl = (fd.get('avatarUrl') || '').trim();

    // Kiểm tra đầu vào
    if (!email) {
      alert('Vui lòng nhập Email');
      return;
    }

    // (Demo) Chấp nhận bất kỳ mật khẩu, miễn có email
    const profile = {
      email,
      displayName,
      avatarUrl,
      role: 'admin',
      loggedAt: Date.now()
    };

    // Lưu session vào localStorage
    localStorage.setItem('adminProfile', JSON.stringify(profile));
    localStorage.setItem('adminLoggedIn', '1');

    // ✅ Lấy tham số ?next để quay lại đúng trang đang mở, nếu không có thì về dashboard
    const params = new URLSearchParams(location.search);
    const next = params.get('next') || './dashboard.html';

    // Điều hướng
    window.location.href = next;
  });
})();

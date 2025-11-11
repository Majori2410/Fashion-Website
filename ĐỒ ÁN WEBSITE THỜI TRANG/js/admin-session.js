(function(){
  const REQUIRE_LOGIN = true; // true => chặn truy cập khi chưa đăng nhập

  const raw = localStorage.getItem('adminProfile');
  const logged = localStorage.getItem('adminLoggedIn') === '1';
  let profile = null;
  try { profile = raw ? JSON.parse(raw) : null; } catch(e){ profile = null; }

  const here = location.pathname.split('/').pop();

  // 1️⃣ Nếu chưa login => chuyển sang admin-login kèm ?next=...
  if (REQUIRE_LOGIN && (!logged || !profile)) {
    if (here !== 'admin-login.html') {
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      location.href = `./admin-login.html?next=${next}`;
    }
    return;
  }

  // 2️⃣ Nếu đã login mà vẫn mở trang admin-login => chuyển ngược về dashboard
  if (here === 'admin-login.html' && logged && profile) {
    location.href = './dashboard.html';
    return;
  }

  // 3️⃣ Áp tên & avatar cho topbar
  const nameEls = document.querySelectorAll('[data-admin-name]');
  const avatarEls = document.querySelectorAll('[data-admin-avatar]');

  const name = profile?.displayName || 'Nguyễn Admin';
  const avatar = profile?.avatarUrl || '../assets/img/avatar-default.png';

  nameEls.forEach(el => { el.textContent = name; });
  avatarEls.forEach(img => {
    img.src = avatar;
    img.alt = name;
  });

  // 4️⃣ Logout (nếu có nút)
  const logoutBtn = document.querySelector('[data-admin-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', ()=>{
      localStorage.removeItem('adminProfile');
      localStorage.removeItem('adminLoggedIn');
      location.href = './admin-login.html';
    });
  }
})();

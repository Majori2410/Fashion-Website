// /js/search-modal.js
(function () {
  // Lấy phần tử
  const openBtn = document.getElementById('openSearch');
  const modal = document.getElementById('searchModal');
  const overlay = document.getElementById('searchOverlay');
  const closeBtn = document.getElementById('closeSearch');
  const form = document.getElementById('searchForm');

  // Nếu trang không có popup thì bỏ qua, tránh lỗi
  if (!openBtn || !modal || !overlay || !form) return;

  function openModal() {
    modal.hidden = false;
    overlay.hidden = false;
    document.getElementById('sName')?.focus();
  }
  function closeModal() {
    modal.hidden = true;
    overlay.hidden = true;
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Chọn loại (single-select)
  const pillsWrap = document.querySelector('.cat-pills');
  const hiddenCat = document.getElementById('sCategory');
  pillsWrap?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    pillsWrap.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    hiddenCat.value = btn.dataset.cat || '';
  });

  // Submit => điều hướng tới trang category chung
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('sName').value.trim();
    const category = document.getElementById('sCategory').value.trim();
    const min = document.getElementById('sMin').value.trim();
    const max = document.getElementById('sMax').value.trim();

    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (category) params.append('category', category);
    if (min) params.append('min', min);
    if (max) params.append('max', max);

    window.location.href = '/pages/search.html?' + params.toString();
  });
})();

// --- Chỉ highlight link cấp 1 trên topbar ---
(function highlightActiveNav(){
  const current = location.pathname.split('/').pop().split('?')[0]; // "user-category.html"
  // chỉ chọn <a> cấp 1, bỏ qua link trong dropdown
  document.querySelectorAll('.main-nav > a').forEach(a=>{
    const href = a.getAttribute('href') || '';
    const file = href.split('/').pop().split('?')[0]; // "./user-category.html" -> "user-category.html"
    if (file && file === current){
      a.classList.add('active');
    }
  });
})();


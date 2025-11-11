// /js/search.js
(function () {
  const PRODUCTS_URL = '../mock-data/products.json'; // đổi nếu bạn để chỗ khác

  const grid = document.getElementById('productGrid');
  const info = document.getElementById('searchInfo');
  const pag  = document.getElementById('pagination');

  // Lấy tham số từ URL
  const params   = new URLSearchParams(location.search);
  const q        = (params.get('q') || '').trim();
  const category = (params.get('category') || '').trim();
  const min      = Number(params.get('min') || 0);
  const max      = Number(params.get('max') || 0);

  // Hiển thị tiêu đề phụ
  function setInfo(total){
    const parts = [];
    parts.push(`Từ khóa: "${q || 'Tất cả'}"`);
    if (category) parts.push(`Loại: ${category}`);
    if (min) parts.push(`Tối thiểu: ${min.toLocaleString('vi-VN')}đ`);
    if (max) parts.push(`Tối đa: ${max.toLocaleString('vi-VN')}đ`);
    const head = parts.length ? parts.join(' • ') : 'Tất cả sản phẩm';
    info.textContent = `${head} — ${total} kết quả`;
  }

  // HTML 1 thẻ sản phẩm
  function cardHTML(p){
    const img = p.img || 'https://picsum.photos/seed/placeholder/400/300';
    const price = (p.price || 0).toLocaleString('vi-VN') + 'đ';
    return `
      <article class="card" title="${p.name}">
        <img src="${img}" alt="${p.name}" onerror="this.src='https://picsum.photos/seed/fallback/400/300'">
        <div class="info">
          <div class="name">${p.name}</div>
          <div class="price">${price}</div>
        </div>
      </article>
    `;
  }

  // Phân trang
  const PER_PAGE = 12;
  let filtered = [];
  let current = 1;
  let totalPage = 1;

  function renderPage(page){
    current = page;
    const start = (page - 1) * PER_PAGE;
    const slice = filtered.slice(start, start + PER_PAGE);

    grid.innerHTML = slice.length
      ? slice.map(cardHTML).join('')
      : '<p class="muted">Không tìm thấy sản phẩm nào.</p>';

    renderPagination();
  }

  function renderPagination(){
    if (totalPage <= 1) { pag.innerHTML = ''; return; }

    // Nút Prev/Next + số trang
    pag.innerHTML = '';
    const addBtn = (label, page, disabled=false, active=false)=>{
      const btn = document.createElement('button');
      btn.textContent = label;
      if (active) btn.classList.add('active');
      if (disabled){ btn.disabled = true; }
      else { btn.addEventListener('click', ()=> renderPage(page)); }
      pag.appendChild(btn);
    };

    addBtn('‹', Math.max(1, current - 1), current === 1);

    const range = 2; // +/- 2 trang quanh current
    const from = Math.max(1, current - range);
    const to   = Math.min(totalPage, current + range);

    if (from > 1){ addBtn('1', 1, false, current===1); if (from > 2) addBtn('…', current, true); }
    for (let i = from; i <= to; i++){
      addBtn(String(i), i, false, i === current);
    }
    if (to < totalPage){ if (to < totalPage - 1) addBtn('…', current, true); addBtn(String(totalPage), totalPage, false, current===totalPage); }

    addBtn('›', Math.min(totalPage, current + 1), current === totalPage);
  }

  // Lọc
  function applyFilter(products){
    const qLower = q.toLowerCase();
    filtered = products.filter(p=>{
      const matchQ   = !q || p.name?.toLowerCase().includes(qLower);
      const matchCat = !category || p.category === category;
      const matchMin = !min || (p.price||0) >= min;
      const matchMax = !max || (p.price||0) <= max;
      return matchQ && matchCat && matchMin && matchMax;
    });

    totalPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    setInfo(filtered.length);
    renderPage(1);
  }

  // Init
  async function init(){
    try{
      info.textContent = 'Đang tải…';
      const res = await fetch(PRODUCTS_URL, { cache: 'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const products = await res.json();
      applyFilter(products);
    }catch(err){
      console.error(err);
      info.textContent = 'Không thể tải dữ liệu sản phẩm.';
      grid.innerHTML = '';
      pag.innerHTML = '';
    }
  }

  init();
})();

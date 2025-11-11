// js/products.js
(() => {
  // ====== Config đường dẫn JSON (điều chỉnh nếu thư mục khác) ======
  const PRODUCTS_JSON = '../mock-data/products.json'; // đổi sang đúng path bạn đang dùng

  // ====== State ======
  let products = [];        // danh sách gốc từ JSON
  let view     = [];        // danh sách sau lọc
  // Trạng thái hiển thị ẩn/hiện (UI-only, không ghi ra JSON):
  // key: id sản phẩm, value: 'show' | 'hide'
  const uiStatus = new Map();

  // ====== DOM ======
  const tbody     = document.getElementById('prodTbody');
  const kw        = document.getElementById('kw');
  const selCat    = document.getElementById('selCat');
  const selStatus = document.getElementById('selStatus');
  const addBtn    = document.getElementById('btnAddProduct');

  // Modal (đã có sẵn trong HTML)
  const modal   = document.getElementById('productModal');
  const titleEl = document.getElementById('productModalTitle');

  // fields trong modal
  const fType  = document.getElementById('f_type');
  const fSku   = document.getElementById('f_sku');
  const fName  = document.getElementById('f_name');
  const fImg   = document.getElementById('f_image');
  const fDesc  = document.getElementById('f_desc');
  const pvWrap = document.getElementById('f_preview_wrap');
  const pvImg  = document.getElementById('f_preview');

  function openModal(){ modal?.classList.add('open'); }
  function closeModal(){ modal?.classList.remove('open'); }

  // Đóng modal khi click backdrop / nút có data-close
  modal?.addEventListener('click', (e)=>{
    if (e.target.hasAttribute('data-close')) closeModal();
  });

  // ====== Helpers ======
  const toRowHTML = (p) => {
    const status = uiStatus.get(p.id) || 'show';
    const tag = status === 'show'
      ? '<span class="tag ok">Hiển thị</span>'
      : '<span class="tag hidden">Đang ẩn</span>';

    // Giả sử không có SKU trong JSON -> tạo SKU demo từ id
    const sku = p.sku || `SKU-${String(p.id).padStart(4, '0')}`;

    return `
      <tr data-id="${p.id}">
        <td><img class="thumb" src="${p.img}" alt=""></td>
        <td>${sku}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${tag}</td>
        <td>
          <button class="icon-btn" data-edit>Sửa</button>
          <button class="icon-btn" data-toggle>${status === 'show' ? 'Ẩn' : 'Hiện'}</button>
          <button class="icon-btn" data-del>Xóa</button>
        </td>
      </tr>
    `;
  };

  function render(list){
    if (!tbody) return;
    if (!list.length){
      tbody.innerHTML = `<tr><td colspan="6" class="muted">Không có sản phẩm phù hợp.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(toRowHTML).join('');
  }

  function applyFilter(){
    const k  = (kw?.value || '').trim().toLowerCase();
    const c  = selCat?.value || 'Tất cả';
    const st = selStatus?.value || 'all';

    view = products.filter(p => {
      // lọc từ khóa theo tên hoặc sku demo
      const sku = p.sku || `SKU-${String(p.id).padStart(4,'0')}`;
      const matchKw = !k || p.name.toLowerCase().includes(k) || sku.toLowerCase().includes(k);
      const matchCat = (c === 'Tất cả' || !c) ? true : (p.category === c);
      const uiSt = uiStatus.get(p.id) || 'show';
      const matchSt = (st === 'all') ? true : (uiSt === st);
      return matchKw && matchCat && matchSt;
    });

    render(view);
  }

  // ====== Events: lọc tức thì ======
  kw?.addEventListener('input', applyFilter);
  selCat?.addEventListener('change', applyFilter);
  selStatus?.addEventListener('change', applyFilter);

  // ====== Events: click trong bảng (Sửa / Ẩn-Hiện / Xoá) ======
  document.addEventListener('click', (e)=>{
    // Toggle ẩn/hiện
    const tgl = e.target.closest('[data-toggle]');
    if (tgl){
      const row = tgl.closest('tr');
      const id  = Number(row?.dataset?.id);
      if (id){
        const cur = uiStatus.get(id) || 'show';
        const next = (cur === 'show') ? 'hide' : 'show';
        uiStatus.set(id, next);
        applyFilter(); // render lại theo filter hiện tại
      }
      return;
    }

    // Xoá (UI-only)
    const del = e.target.closest('[data-del]');
    if (del){
      const row = del.closest('tr');
      const id  = Number(row?.dataset?.id);
      if (id){
        products = products.filter(p => p.id !== id);
        uiStatus.delete(id);
        applyFilter();
      }
      return;
    }

    // Sửa -> mở modal, prefill
    const edit = e.target.closest('[data-edit]');
    if (edit){
      const row = edit.closest('tr');
      const id  = Number(row?.dataset?.id);
      const p   = products.find(x => x.id === id);
      if (!p) return;

      titleEl.textContent = 'Sửa sản phẩm';
      fType.value = p.category || 'Trang phục Xuân Hè';
      fSku.value  = p.sku || `SKU-${String(p.id).padStart(4,'0')}`;
      fName.value = p.name || '';
      fImg.value  = '';
      fDesc.value = p.description?.[0] || '';

      if (p.img){
        pvImg.src = p.img;
        pvWrap.style.display = 'block';
      } else {
        pvWrap.style.display = 'none';
      }
      openModal();
    }
  });

  // ====== Thêm mới (UI-only) ======
  addBtn?.addEventListener('click', () => {
    titleEl.textContent = 'Thêm sản phẩm';
    fType.value = 'Trang phục Xuân Hè';
    fSku.value  = '';
    fName.value = '';
    fImg.value  = '';
    fDesc.value = '';
    pvWrap.style.display = 'none';
    openModal();
  });

  // ====== Init: fetch JSON rồi render ======
  async function init(){
    try{
      const res = await fetch(PRODUCTS_JSON, { cache: 'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      products = await res.json();

      // Khởi tạo trạng thái UI: mặc định show
      products.forEach(p => uiStatus.set(p.id, 'show'));

      applyFilter();
    }catch(err){
      console.error(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="muted">Không thể tải dữ liệu (${err.message}).</td></tr>`;
    }
  }

  init();
})();

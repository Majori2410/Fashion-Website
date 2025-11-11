(function(){
  const $  = (s,sc)=> (sc||document).querySelector(s);
  const $$ = (s,sc)=> Array.from((sc||document).querySelectorAll(s));
  const fmtVND = n => (n||0).toLocaleString('vi-VN') + 'đ';
  const fmtDate = iso => {
    if(!iso) return '';
    const d = new Date(iso);
    if(Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('vi-VN');
  };

  // === Products lookup ===
  let products = [];
  let byId = new Map();
  let byName = new Map();

  const defaultImportPrice = (p) => Math.round((p.price * 0.6) / 1000) * 1000; // mặc định 60%

  function indexProducts(list){
    products = list || [];
    byId.clear(); byName.clear();
    products.forEach(p => {
      byId.set(String(p.id), p);
      byName.set(p.name.toLowerCase(), p);
    });
    // build datalist options
    const dl = document.getElementById('productNames');
    if (dl) {
      dl.innerHTML = products.map(p => `<option value="${p.name}"></option>`).join('');
    }
  }

  function getProductByName(name){
    if(!name) return null;
    return byName.get(String(name).toLowerCase()) || null;
  }

  // Elements
  const tbody = $('#rcpTbody');
  const search = $('#rcpSearch');
  const btnClear = $('#btnClearSearch');
  const toastEl = $('#toast');

  // Modals
  const modalDetail = $('#modalDetail');
  const detailIdEl = $('#detailId');
  const detailMeta = $('#detailMeta');
  const detailBody = $('#detailBody');
  const detailTotal = $('#detailTotal');

  const modalCreate = $('#modalCreate');
  const createDate = $('#createDate');
  const createItems = $('#createItems');
  const createTotal = $('#createTotal');

  const modalEdit = $('#modalEdit');
  const editIdEl = $('#editId');
  const editDate = $('#editDate');
  const editStatus = $('#editStatus');
  const editItems = $('#editItems');
  const editTotal = $('#editTotal');

  const btnOpenCreate = $('#btnOpenCreate');
  const btnCreateAddRow = $('#btnCreateAddRow');
  const btnCreateSave = $('#btnCreateSave');

  const btnEditAddRow = $('#btnEditAddRow');
  const btnEditSave = $('#btnEditSave');

  // State
  let receipts = [];
  let filtered = [];
  let editingReceiptId = null;

  function toast(msg, ms=1600){
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(()=> toastEl.classList.remove('show'), ms);
  }

  function calcTotal(items){
    return (items||[]).reduce((s,it)=> s + (Number(it.importPrice)||0) * (Number(it.qty)||0), 0);
  }

// ===== RENDER BẢNG PHIẾU NHẬP
function renderTable(list){
  if (!tbody) return;
  if (!list.length){
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Không có phiếu nhập nào.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(r => {
    const total = calcTotal(r.items);
    const badge = (r.status === 'completed')
      ? '<span class="badge completed">Hoàn thành</span>'
      : '<span class="badge processing">Đang xử lý</span>';

    return `
      <tr data-id="${r.id}">
        <td>${r.id}</td>
        <td style="text-align:center">${fmtDate(r.date)}</td>
        <td style="text-align:right">${fmtVND(total)}</td>
        <td style="text-align:center">${badge}</td>
        <td style="text-align:center">
          <div class="actions">
            <button class="icon-btn xs" data-action="edit">Xem / sửa phiếu nhập</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Bind action cho nút xem/sửa
  $$('#rcpTbody [data-action="edit"]').forEach(b => b.addEventListener('click', onOpenEdit));
}


function initReceiptStatusSelects(){
  const rows = $$('#rcpTbody tr');
  rows.forEach(tr => {
    const wrap = tr.querySelector('.rcp-actions');
    const sel  = tr.querySelector('select.rcp-status');   // select ẩn
    const host = tr.querySelector('.rcp-actions .cs');    // nơi gắn UI

    if (!wrap || !sel || !host) return;
    if (host.dataset.enhanced === '1') return;            // tránh gắn lặp

    // Nút hiển thị giá trị hiện tại
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cs-btn'; // style ở CSS
    const label = sel.value === 'completed' ? 'Hoàn thành' : 'Đang xử lý';
    btn.textContent = label;

    // Menu
    const menu = document.createElement('div');
    menu.className = 'cs-menu';
    menu.innerHTML = `
      <button type="button" data-val="processing">Đang xử lý</button>
      <button type="button" data-val="completed">Hoàn thành</button>
    `;

    host.appendChild(btn);
    host.appendChild(menu);
    host.dataset.enhanced = '1';

    // Toggle menu
    btn.addEventListener('click', () => {
      menu.classList.toggle('open');
    });

    // Chọn item
    menu.addEventListener('click', (e) => {
      const v = e.target?.dataset?.val;
      if (!v) return;
      // cập nhật select ẩn + trigger change
      sel.value = v;
      sel.dispatchEvent(new Event('change', {bubbles:true}));
      // cập nhật nút hiển thị
      btn.textContent = v === 'completed' ? 'Hoàn thành' : 'Đang xử lý';
      menu.classList.remove('open');
    });

    // click ra ngoài để đóng
    document.addEventListener('click', (e)=>{
      if (!menu.classList.contains('open')) return;
      if (!host.contains(e.target)) menu.classList.remove('open');
    });
  });
}


  // ===== ĐỔI TÌNH TRẠNG TRỰC TIẾP TRÊN BẢNG
  tbody.addEventListener('change', (e) => {
    const sel = e.target;
    if (!sel.matches('.rcp-status')) return;

    const id = sel.dataset.id;
    const r = receipts.find(x => String(x.id) === String(id));
    if (!r) return;

    r.status = sel.value;                  // cập nhật dữ liệu
    toast(r.status === 'completed' ? 'Đã chuyển tình trạng: Hoàn thành'
                                  : 'Đã chuyển tình trạng: Đang xử lý');

    // render lại (giữ filter hiện tại nếu có)
    renderTable((filtered && filtered.length) ? filtered : receipts);
  });

  function applySearch(){
    const q = (search?.value || '').trim().toLowerCase();
    if(!q) filtered = receipts.slice();
    else {
      filtered = receipts.filter(r =>
        String(r.id).toLowerCase().includes(q) ||
        (r.date && r.date.toLowerCase().includes(q))
      );
    }
    renderTable(filtered);
  }

  // ===== Detail =====
  function onOpenDetail(e){
    const tr = e.currentTarget.closest('tr');
    const id = tr?.getAttribute('data-id');
    const r = receipts.find(x => String(x.id) === String(id));
    if(!r) return;

    detailIdEl.textContent = `#${r.id}`;
    detailMeta.textContent = `Ngày nhập: ${fmtDate(r.date)} • Tình trạng: ${r.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}`;

    detailBody.innerHTML = (r.items||[]).map(it => {
      const p = byId.get(String(it.productId));
      const name = p?.name || '(Không tìm thấy)';
      const img  = p?.img  || '';
      const price = Number(it.importPrice) || 0;
      const qty   = Number(it.qty) || 0;
      const line  = price * qty;
      return `
        <tr>
          <td><img src="${img}" alt=""></td>
          <td title="${name}">${name}</td>
          <td style="text-align:right">${fmtVND(price)}</td>
          <td style="text-align:center">${qty}</td>
          <td style="text-align:right">${fmtVND(line)}</td>
        </tr>`;
    }).join('');
    detailTotal.textContent = fmtVND(calcTotal(r.items));
  }

  // ===== Create =====
  function newEditorRow({productId=null, name='', image='', importPrice='', qty=''}={}, scope='create'){
    // Ưu tiên productId -> lấy p; nếu chưa có, thử theo name
    let p = productId ? byId.get(String(productId)) : null;
    if (!p && name) p = getProductByName(name);

    const resolvedName = p?.name || name || '';
    const resolvedImg  = p?.img  || image || '';
    const resolvedPrice = (importPrice !== '' && importPrice !== null)
      ? Number(importPrice)
      : (p ? defaultImportPrice(p) : '');

    const idVal = p?.id || (productId ?? '');

    const uid = Math.random().toString(36).slice(2, 8);
    return `
      <tr data-uid="${uid}">
        <td><button class="row-del" data-del="${scope}" title="Xóa dòng">✕</button></td>
        <td>
          <input type="text" list="productNames" data-field="name" value="${resolvedName}" placeholder="Nhập tên sản phẩm">
          <input type="hidden" data-field="productId" value="${idVal}">
        </td>
        <td class="imgcell">
          ${resolvedImg ? `<img src="${resolvedImg}" alt="">`
                        : `<div class="img-placeholder"><span>Không có ảnh</span></div>`}
        </td>
        <td><input type="number" data-field="importPrice" value="${resolvedPrice}" min="0" step="500"></td>
        <td><input type="number" data-field="qty" value="${qty||''}" min="0" step="1"></td>
        <td class="line-total" style="text-align:right"></td>
      </tr>
    `;
  }


  function reCalcEditorTotal(tbodyEl, totalEl){
    const rows = Array.from(tbodyEl.querySelectorAll('tr'));
    let sum = 0;
    rows.forEach(tr=>{
      const price = Number(tr.querySelector('[data-field="importPrice"]')?.value || 0);
      const qty   = Number(tr.querySelector('[data-field="qty"]')?.value || 0);
      const line  = price * qty;
      tr.querySelector('.line-total').textContent = fmtVND(line);
      sum += line;
    });
    if(totalEl) totalEl.textContent = fmtVND(sum);
  }

  function collectItems(tbodyEl){
    return Array.from(tbodyEl.querySelectorAll('tr')).map(tr => {
      const name = tr.querySelector('[data-field="name"]')?.value?.trim() || '';
      let pid = tr.querySelector('[data-field="productId"]')?.value || '';
      let p = null;

      if (!pid && name) {
        p = getProductByName(name);
        pid = p?.id || '';
        // cập nhật hidden nếu tìm thấy
        if (pid) tr.querySelector('[data-field="productId"]').value = pid;
      } else if (pid) {
        p = byId.get(String(pid));
      }

      const importPrice = Number(tr.querySelector('[data-field="importPrice"]')?.value || 0);
      const qty = Number(tr.querySelector('[data-field="qty"]')?.value || 0);

      return p ? { productId: p.id, importPrice, qty } : null;
    }).filter(Boolean);
  }

  function onOpenCreate(){
    createDate.value = new Date().toISOString().slice(0,10);
    createItems.innerHTML = newEditorRow({}, 'create');
    reCalcEditorTotal(createItems, createTotal);
    openModal(modalCreate);
  }

  function onCreateAddRow(){
    createItems.insertAdjacentHTML('beforeend', newEditorRow({}, 'create'));
    reCalcEditorTotal(createItems, createTotal);
  }

  function onCreateSave(){
    const date = createDate.value || new Date().toISOString().slice(0,10);
    const items = collectItems(createItems);
    const id = 'RCP' + Math.random().toString(36).slice(2,6).toUpperCase();
    receipts.unshift({ id, date, status:'processing', items });
    filtered = receipts.slice();
    renderTable(filtered);
    closeModal(modalCreate);
    toast('Đã tạo phiếu nhập mới');
  }

  // ===== Edit =====
  function onOpenEdit(e){
    const tr = e.currentTarget.closest('tr');
    const id = tr?.getAttribute('data-id');
    const r = receipts.find(x => String(x.id) === String(id));
    if(!r) return;

    editingReceiptId = r.id;
    editIdEl.textContent = `#${r.id}`;
    editDate.value = r.date;
    editStatus.value = r.status;

    editItems.innerHTML = (r.items||[]).map(it => newEditorRow(it, 'edit')).join('') || newEditorRow({}, 'edit');
    reCalcEditorTotal(editItems, editTotal);
    openModal(modalEdit);

    const completed = (r.status === 'completed');
    toggleEditFields(completed);                           // 🔒 khóa/mở input
    if (completed) {
      btnEditSave.setAttribute('disabled','disabled');
      btnEditSave.classList.add('disabled');
      toast('Phiếu nhập đã hoàn tất, không thể chỉnh sửa');
    } else {
      btnEditSave.removeAttribute('disabled');
      btnEditSave.classList.remove('disabled');
    }
  }

  function onEditAddRow(){
    if (editStatus.value === 'completed') return; // không cho thêm
    editItems.insertAdjacentHTML('beforeend', newEditorRow({}, 'edit'));
    reCalcEditorTotal(editItems, editTotal);
  }

  function onEditSave(){
    const r = receipts.find(x => String(x.id) === String(editingReceiptId));
    if(!r) return;
    r.date = editDate.value || r.date;
    r.status = editStatus.value || r.status;
    r.items = collectItems(editItems);
    // refresh
    applySearch();
    closeModal(modalEdit);
    toast('Đã lưu thay đổi phiếu nhập');
  }

  function toggleEditFields(disabled){
  // khóa/mở các input trong bảng (tên, giá nhập, số lượng)
    editItems.querySelectorAll('input').forEach(inp=>{
      inp.disabled = disabled;
      if (disabled) inp.classList.add('readonly'); else inp.classList.remove('readonly');
    });
    // khóa/mở nút xóa từng dòng
    editItems.querySelectorAll('.row-del').forEach(btn => { btn.disabled = disabled; });
    // khóa/mở nút + Thêm dòng
    if (btnEditAddRow) btnEditAddRow.disabled = disabled;
  }

  // ===== Modal helpers =====
  function openModal(modal){
    if(!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
  }
  function closeModal(modal){
    if(!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
  }

  // ===== Events =====
  btnOpenCreate?.addEventListener('click', onOpenCreate);
  btnCreateAddRow?.addEventListener('click', onCreateAddRow);
  btnCreateSave?.addEventListener('click', onCreateSave);

  btnEditAddRow?.addEventListener('click', onEditAddRow);
  btnEditSave?.addEventListener('click', onEditSave);

  // Delete row in editors
  document.addEventListener('click', (e)=>{
    const delScope = e.target?.getAttribute?.('data-del');
    if(!delScope) return;
    const tr = e.target.closest('tr');
    const tbodyEl = tr?.parentElement;
    tr?.remove();
    if(tbodyEl === createItems) reCalcEditorTotal(createItems, createTotal);
    if(tbodyEl === editItems)   reCalcEditorTotal(editItems, editTotal);
  });

  // Recalc on input change
  // Recalc & auto-fill on input change
  document.addEventListener('input', (e)=>{
    const el = e.target;
    // Tên sản phẩm: khi đổi -> lookup & fill ảnh + giá nhập
    if (el.matches('input[data-field="name"]')) {
      const tr = el.closest('tr');
      const name = el.value.trim();
      const hiddenId = tr.querySelector('[data-field="productId"]');
      const imgCell  = tr.querySelector('.imgcell');
      const priceInp = tr.querySelector('[data-field="importPrice"]');

      const p = getProductByName(name);
      if (p) {
        hiddenId.value = p.id;
        if (imgCell) imgCell.innerHTML = `<img src="${p.img}" alt="">`;
        if (priceInp && !priceInp.value) priceInp.value = defaultImportPrice(p);
      } else {
        hiddenId.value = '';
        if (imgCell) imgCell.innerHTML = `<div class="img-placeholder"><span>Không có ảnh</span></div>`;
      }
    }

    // Bất kỳ input trong bảng -> tính lại dòng & tổng
    if(el.closest('#createItems')){
      reCalcEditorTotal(createItems, createTotal);
    }
    if(el.closest('#editItems')){
      reCalcEditorTotal(editItems, editTotal);
    }
  });


  // Close modals
  document.addEventListener('click', (e)=>{
    const close = e.target?.getAttribute?.('data-close');
    if(close === 'detail') closeModal(modalDetail);
    if(close === 'create') closeModal(modalCreate);
    if(close === 'edit')   closeModal(modalEdit);
  });

  // Search
  search?.addEventListener('input', ()=>{
    clearTimeout(search._t);
    search._t = setTimeout(applySearch, 120);
  });
  btnClear?.addEventListener('click', ()=>{
    search.value = ''; applySearch(); search.focus();
  });

  editStatus?.addEventListener('change', ()=>{
    const isCompleted = editStatus.value === 'completed';
    if (isCompleted) {
      btnEditSave.setAttribute('disabled','disabled');
      btnEditSave.classList.add('disabled');
      toast('Phiếu nhập đã hoàn tất, không thể chỉnh sửa');
    } else {
      btnEditSave.removeAttribute('disabled');
      btnEditSave.classList.remove('disabled');
    }
    toggleEditFields(isCompleted);   // 🔁 đồng bộ khóa/mở input theo trạng thái
  });

  // ===== Init =====
  async function init(){
    try{
      // 1) Load products trước
      const pRes = await fetch('../mock-data/products.json', { cache: 'no-store' });
      if(!pRes.ok) throw new Error(`HTTP ${pRes.status} @ products.json`);
      const pList = await pRes.json();
      indexProducts(pList);

      // 2) Load receipts sau (định dạng mới: productId + importPrice)
      const rRes = await fetch('../mock-data/receipts.json', { cache: 'no-store' });
      if(!rRes.ok) throw new Error(`HTTP ${rRes.status} @ receipts.json`);
      receipts = await rRes.json();

      filtered = receipts.slice();
      renderTable(filtered);
    }catch(err){
      console.error(err);
      if(tbody) tbody.innerHTML = '<tr><td colspan="5" class="muted">Không thể tải dữ liệu</td></tr>';
      toast(`Không thể tải dữ liệu (${err?.message||'unknown'})`);
    }
  }  document.addEventListener('DOMContentLoaded', init);
})();

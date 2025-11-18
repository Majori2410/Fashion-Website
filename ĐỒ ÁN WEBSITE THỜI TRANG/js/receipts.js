// js/receipts.js
(function () {
  const $  = (s, sc) => (sc || document).querySelector(s);
  const $$ = (s, sc) => Array.from((sc || document).querySelectorAll(s));

  const fmtVND = n => (n || 0).toLocaleString('vi-VN') + 'đ';
  const fmtDate = iso => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('vi-VN');
  };

  // ===== SẢN PHẨM MẪU (dùng cho datalist + auto fill) =====
  const STUB_PRODUCTS = [
    {
      id: 1,
      name: 'Đầm nữ sơ mi cotton tay ngắn',
      img: '../assets/products/1.webp',
      price: 599000
    },
    {
      id: 2,
      name: 'Áo khoác len dệt basic',
      img: '../assets/products/2.webp',
      price: 699000
    },
    {
      id: 3,
      name: 'Giày sneaker trắng basic',
      img: '../assets/products/3.webp',
      price: 750000
    },
    {
      id: 4,
      name: 'Túi xách mini da tổng hợp',
      img: '../assets/products/4.webp',
      price: 420000
    }
  ];

  // ===== DỮ LIỆU PHIẾU NHẬP MẪU (FALLBACK) =====
  const STUB_RECEIPTS = [
    {
      id: 'RCP001',
      date: '2024-10-01',
      status: 'completed',
      items: [
        { productId: 1, importPrice: 360000, qty: 20 },
        { productId: 3, importPrice: 450000, qty: 15 }
      ]
    },
    {
      id: 'RCP002',
      date: '2024-10-10',
      status: 'processing',
      items: [
        { productId: 2, importPrice: 480000, qty: 12 },
        { productId: 4, importPrice: 260000, qty: 25 }
      ]
    }
  ];

  // ===== Sản phẩm tra cứu theo id/name =====
  let products = [];
  const byId   = new Map();
  const byName = new Map();

  const defaultImportPrice = (p) =>
    Math.round((p.price * 0.6) / 1000) * 1000; // mặc định 60%

  function indexProducts(list) {
    products = list || [];
    byId.clear();
    byName.clear();
    products.forEach(p => {
      byId.set(String(p.id), p);
      byName.set(p.name.toLowerCase(), p);
    });

    // Datalist tên sản phẩm cho modal
    const dl = document.getElementById('productNames');
    if (dl) {
      dl.innerHTML = products
        .map(p => `<option value="${p.name}"></option>`)
        .join('');
    }
  }

  function getProductByName(name) {
    if (!name) return null;
    return byName.get(String(name).toLowerCase()) || null;
  }

  // ===== DOM chính =====
  const tbody    = $('#rcpTbody');
  const search   = $('#rcpSearch');
  const btnClear = $('#btnClearSearch');
  const toastEl  = $('#toast');

  // Modal
  const modalCreate = $('#modalCreate');
  const createDate  = $('#createDate');
  const createItems = $('#createItems');
  const createTotal = $('#createTotal');
  const btnOpenCreate   = $('#btnOpenCreate');
  const btnCreateAddRow = $('#btnCreateAddRow');
  const btnCreateSave   = $('#btnCreateSave');

  const modalEdit  = $('#modalEdit');
  const editIdEl   = $('#editId');
  const editDate   = $('#editDate');
  const editStatus = $('#editStatus');
  const editItems  = $('#editItems');
  const editTotal  = $('#editTotal');
  const editNotice = $('#editNotice');
  const btnEditAddRow = $('#btnEditAddRow');
  const btnEditSave   = $('#btnEditSave');

  // ===== State =====
  let receipts = [];
  let filtered = [];
  let editingReceiptId = null;

  function toast(msg, ms = 1600) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  function calcTotal(items) {
    return (items || []).reduce(
      (s, it) =>
        s +
        (Number(it.importPrice) || 0) * (Number(it.qty) || 0),
      0
    );
  }

  // ===== RENDER BẢNG =====
  function renderTable(list) {
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="muted">Không có phiếu nhập nào.</td></tr>';
      return;
    }

    tbody.innerHTML = list
      .map(r => {
        const total = calcTotal(r.items);
        const badge =
          r.status === 'completed'
            ? '<span class="badge completed">Hoàn thành</span>'
            : '<span class="badge processing">Đang xử lý</span>';

        return `
          <tr data-id="${r.id}">
            <td>${r.id}</td>
            <td style="text-align:center">${fmtDate(r.date)}</td>
            <td style="text-align:right">${fmtVND(total)}</td>
            <td style="text-align:center">${badge}</td>
            <td style="text-align:center">
              <div class="actions rcp-actions">
                <button class="icon-btn xs" data-action="edit">
                  Xem / sửa phiếu nhập
                </button>
              </div>
            </td>
          </tr>`;
      })
      .join('');

    $$('#rcpTbody [data-action="edit"]').forEach(b =>
      b.addEventListener('click', onOpenEdit)
    );
  }

  // ===== FILTER / SEARCH =====
  function applySearch() {
    const q = (search && search.value ? search.value : '').trim().toLowerCase();
    if (!q) {
      filtered = receipts.slice();
    } else {
      filtered = receipts.filter(r =>
        String(r.id).toLowerCase().includes(q) ||
        (r.date && r.date.toLowerCase().includes(q))
      );
    }
    renderTable(filtered);
  }

  // ===== Modal helper =====
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  // ===== Editor rows (create/edit) =====
  function newEditorRow(
    { productId = null, name = '', image = '', importPrice = '', qty = '' } = {},
    scope = 'create'
  ) {
    let p = productId ? byId.get(String(productId)) : null;
    if (!p && name) p = getProductByName(name);

    const resolvedName  = p ? p.name : name || '';
    const resolvedImg   = p ? p.img  : image || '';
    const resolvedPrice =
      importPrice !== '' && importPrice !== null
        ? Number(importPrice)
        : p
        ? defaultImportPrice(p)
        : '';

    const idVal = p ? p.id : (productId || '');

    const uid = Math.random().toString(36).slice(2, 8);
    return (
      '<tr data-uid="' + uid + '">' +
        '<td><button class="row-del" data-del="' + scope + '" title="Xóa dòng">✕</button></td>' +
        '<td>' +
          '<input type="text" list="productNames" data-field="name"' +
          ' value="' + resolvedName + '" placeholder="Nhập tên sản phẩm">' +
          '<input type="hidden" data-field="productId" value="' + idVal + '">' +
        '</td>' +
        '<td class="imgcell">' +
          (resolvedImg
            ? '<img src="' + resolvedImg + '" alt="">' 
            : '<div class="img-placeholder"><span>Không có ảnh</span></div>') +
        '</td>' +
        '<td><input type="number" data-field="importPrice" value="' + resolvedPrice + '" min="0" step="500"></td>' +
        '<td><input type="number" data-field="qty" value="' + (qty || '') + '" min="0" step="1"></td>' +
        '<td class="line-total" style="text-align:right"></td>' +
      '</tr>'
    );
  }

  function reCalcEditorTotal(tbodyEl, totalEl) {
    if (!tbodyEl) return;
    const rows = Array.from(tbodyEl.querySelectorAll('tr'));
    let sum = 0;
    rows.forEach(tr => {
      const priceInput = tr.querySelector('[data-field="importPrice"]');
      const qtyInput   = tr.querySelector('[data-field="qty"]');
      const price = Number(priceInput && priceInput.value ? priceInput.value : 0);
      const qty   = Number(qtyInput && qtyInput.value ? qtyInput.value : 0);
      const line  = price * qty;
      const cell  = tr.querySelector('.line-total');
      if (cell) cell.textContent = fmtVND(line);
      sum += line;
    });
    if (totalEl) totalEl.textContent = fmtVND(sum);
  }

  function collectItems(tbodyEl) {
    if (!tbodyEl) return [];
    return Array.from(tbodyEl.querySelectorAll('tr'))
      .map(tr => {
        const nameInput = tr.querySelector('[data-field="name"]');
        const idInput   = tr.querySelector('[data-field="productId"]');
        const priceInput = tr.querySelector('[data-field="importPrice"]');
        const qtyInput   = tr.querySelector('[data-field="qty"]');

        const name = nameInput && nameInput.value ? nameInput.value.trim() : '';
        let pid    = idInput && idInput.value ? idInput.value : '';
        let p      = null;

        if (!pid && name) {
          p = getProductByName(name);
          pid = p ? p.id : '';
          if (pid && idInput) idInput.value = pid;
        } else if (pid) {
          p = byId.get(String(pid));
        }

        const importPrice = Number(priceInput && priceInput.value ? priceInput.value : 0);
        const qty         = Number(qtyInput && qtyInput.value ? qtyInput.value : 0);

        return p ? { productId: p.id, importPrice: importPrice, qty: qty } : null;
      })
      .filter(Boolean);
  }

  // ===== CREATE =====
  function onOpenCreate() {
    if (!createDate || !createItems) return;
    createDate.value = new Date().toISOString().slice(0, 10);
    createItems.innerHTML = newEditorRow({}, 'create');
    reCalcEditorTotal(createItems, createTotal);
    openModal(modalCreate);
  }

  function onCreateAddRow() {
    if (!createItems) return;
    createItems.insertAdjacentHTML('beforeend', newEditorRow({}, 'create'));
    reCalcEditorTotal(createItems, createTotal);
  }

  function onCreateSave() {
    if (!createItems) return;
    const date  = createDate && createDate.value
      ? createDate.value
      : new Date().toISOString().slice(0, 10);
    const items = collectItems(createItems);
    const id    = 'RCP' + Math.random().toString(36).slice(2, 6).toUpperCase();

    receipts.unshift({ id: id, date: date, status: 'processing', items: items });
    filtered = receipts.slice();
    renderTable(filtered);
    closeModal(modalCreate);
    toast('Đã tạo phiếu nhập mới');
  }

  // ===== EDIT =====
  function onOpenEdit(e) {
    const tr = e.currentTarget.closest('tr');
    const id = tr ? tr.getAttribute('data-id') : null;
    const r  = receipts.find(x => String(x.id) === String(id));
    if (!r || !editItems) return;

    editingReceiptId = r.id;
    if (editIdEl) editIdEl.textContent = '#' + r.id;
    if (editDate) editDate.value   = r.date;
    if (editStatus) editStatus.value = r.status;

    editItems.innerHTML =
      (r.items || []).map(function (it) { return newEditorRow(it, 'edit'); }).join('') ||
      newEditorRow({}, 'edit');

    reCalcEditorTotal(editItems, editTotal);

    // ===== Chế độ chỉ xem nếu đã hoàn thành =====
    const isCompleted = r.status === 'completed';

    const allInputs = editItems.querySelectorAll('input');
    allInputs.forEach(inp => { inp.disabled = isCompleted; });

    if (editDate)   editDate.disabled   = isCompleted;
    if (editStatus) editStatus.disabled = isCompleted;
    if (btnEditAddRow) btnEditAddRow.disabled = isCompleted;

    if (btnEditSave) {
      btnEditSave.disabled = isCompleted;
      btnEditSave.classList.toggle('disabled', isCompleted);
    }

    if (editNotice) {
      editNotice.textContent = isCompleted
        ? 'Phiếu nhập đã ở trạng thái Hoàn thành, bạn chỉ có thể xem, không thể chỉnh sửa.'
        : '';
    }

    openModal(modalEdit);
  }

  function onEditAddRow() {
    if (!editItems) return;
    editItems.insertAdjacentHTML('beforeend', newEditorRow({}, 'edit'));
    reCalcEditorTotal(editItems, editTotal);
  }

  function onEditSave() {
    if (!editItems) return;
    const r = receipts.find(x => String(x.id) === String(editingReceiptId));
    if (!r) return;

    // Không cho sửa nếu đã hoàn thành (phòng khi nút chưa bị disabled vì lý do gì đó)
    if (r.status === 'completed') {
      toast('Phiếu nhập đã hoàn thành, không thể sửa.');
      closeModal(modalEdit);
      return;
    }

    r.date   = (editDate && editDate.value)   || r.date;
    r.status = (editStatus && editStatus.value) || r.status;
    r.items  = collectItems(editItems);

    applySearch(); // giữ filter hiện tại
    closeModal(modalEdit);
    toast('Đã lưu thay đổi phiếu nhập');
  }

  // ===== Sự kiện chung =====
  document.addEventListener('click', function (e) {
    const target = e.target;
    const scope = target && target.getAttribute ? target.getAttribute('data-del') : null;
    if (!scope) return;
    const tr = target.closest('tr');
    const tb = tr ? tr.parentElement : null;
    if (tr) tr.remove();
    if (tb === createItems) reCalcEditorTotal(createItems, createTotal);
    if (tb === editItems)   reCalcEditorTotal(editItems,   editTotal);
  });

  document.addEventListener('input', function (e) {
    const el = e.target;

    // auto-fill theo tên sản phẩm
    if (el.matches && el.matches('input[data-field="name"]')) {
      const tr   = el.closest('tr');
      const name = el.value.trim();
      const hiddenId = tr ? tr.querySelector('[data-field="productId"]') : null;
      const imgCell  = tr ? tr.querySelector('.imgcell') : null;
      const priceInp = tr ? tr.querySelector('[data-field="importPrice"]') : null;

      const p = getProductByName(name);
      if (p) {
        if (hiddenId) hiddenId.value = p.id;
        if (imgCell) imgCell.innerHTML = '<img src="' + p.img + '" alt="">';
        if (priceInp && !priceInp.value) priceInp.value = defaultImportPrice(p);
      } else {
        if (hiddenId) hiddenId.value = '';
        if (imgCell)
          imgCell.innerHTML =
            '<div class="img-placeholder"><span>Không có ảnh</span></div>';
      }
    }

    if (createItems && el.closest && el.closest('#createItems')) {
      reCalcEditorTotal(createItems, createTotal);
    }
    if (editItems && el.closest && el.closest('#editItems')) {
      reCalcEditorTotal(editItems, editTotal);
    }
  });

  document.addEventListener('click', function (e) {
    const target = e.target;
    const close = target && target.getAttribute ? target.getAttribute('data-close') : null;
    if (close === 'create') closeModal(modalCreate);
    if (close === 'edit')   closeModal(modalEdit);
  });

  if (search) {
    search.addEventListener('input', function () {
      clearTimeout(search._t);
      search._t = setTimeout(applySearch, 120);
    });
  }
  if (btnClear) {
    btnClear.addEventListener('click', function () {
      search.value = '';
      applySearch();
      search.focus();
    });
  }

  if (btnOpenCreate)   btnOpenCreate.addEventListener('click', onOpenCreate);
  if (btnCreateAddRow) btnCreateAddRow.addEventListener('click', onCreateAddRow);
  if (btnCreateSave)   btnCreateSave.addEventListener('click', onCreateSave);
  if (btnEditAddRow)   btnEditAddRow.addEventListener('click', onEditAddRow);
  if (btnEditSave)     btnEditSave.addEventListener('click', onEditSave);

  // ===== ĐỌC DỮ LIỆU TỪ <script id="receipts-data"> (NHÚNG TRONG HTML) =====
  function loadReceiptsFromEmbedded() {
    const el = document.getElementById('receipts-data');
    if (!el || !el.textContent || !el.textContent.trim) return null;
    if (!el.textContent.trim()) return null;
    try {
      const json = JSON.parse(el.textContent);
      return Array.isArray(json) ? json : null;
    } catch (err) {
      console.error('Không parse được receipts-data:', err);
      return null;
    }
  }

  // ===== INIT =====
  function init() {
    try {
      // sản phẩm dùng tạm từ STUB_PRODUCTS (chỉ để gợi ý + ảnh trong modal)
      indexProducts(STUB_PRODUCTS);

      const embedded = loadReceiptsFromEmbedded();
      if (embedded && embedded.length) {
        receipts = embedded;
      } else {
        // fallback nếu quên nhúng JSON
        receipts = STUB_RECEIPTS.slice();
      }

      filtered = receipts.slice();
      renderTable(filtered);
    } catch (err) {
      console.error(err);
      if (tbody) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="muted">Không thể hiển thị dữ liệu.</td></tr>';
      }
    }
  }

  // Gọi init ngay nếu DOM đã sẵn, nếu chưa thì chờ DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

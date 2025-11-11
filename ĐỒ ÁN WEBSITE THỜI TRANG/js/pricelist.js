(() => {
  const $  = (s, sc=document) => sc.querySelector(s);
  const $$ = (s, sc=document) => Array.from(sc.querySelectorAll(s));
  const fmtVND = n => (n||0).toLocaleString("vi-VN") + "đ";

  // ===== STATE =====
  let PRODUCTS = [];
  let CATEGORIES = [];                // [{id, name}]
  let CAT_MARGIN = {};                // {catId: percent}
  let state = { q:"", cat:"", status:"", page:1, perPage:8 };

  // Chuẩn hóa ID loại & nhãn hiển thị
    const CAT_ALIASES = {
    "type-ss": "cat_ss",
    "type-fw": "cat_fw",
    "type-shoes": "cat_shoes",
    "type-accessory": "cat_acc"
    };
    const CAT_LABELS = {
    // dùng khóa chuẩn theo categories.json
    "cat_ss": "Trang phục Xuân Hè",
    "cat_fw": "Trang phục Thu Đông",
    "cat_shoes": "Giày dép",
    "cat_acc": "Phụ kiện"
    };
    const normCatId = id => CAT_ALIASES[id] || id;  // đưa về dạng cat_*

  // sau CAT_LABELS
  const LABEL_TO_ID = Object.fromEntries(
    Object.entries(CAT_LABELS).map(([id, label]) => [label, id])
  );
  // Một vài alias dự phòng nếu bạn dùng nhãn khác:
  LABEL_TO_ID["Trang phục Xuân Hè"] = LABEL_TO_ID["Trang phục Xuân Hè"] || "cat_ss";
  LABEL_TO_ID["Trang phục Thu Đông"] = LABEL_TO_ID["Trang phục Thu Đông"] || "cat_fw";
  LABEL_TO_ID["Giày dép"]             = LABEL_TO_ID["Giày dép"]             || "cat_shoes";
  LABEL_TO_ID["Phụ kiện"]             = LABEL_TO_ID["Phụ kiện"]             || "cat_acc";

  // ===== TABS =====
  document.addEventListener("click", (e)=>{
    const t = e.target.closest(".tab");
    if (!t) return;
    $$(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    const name = t.dataset.tab;
    $$(".tabpane").forEach(p => p.hidden = (p.dataset.pane !== name));
    // render đúng pane
    if (name === "bycat") renderCatTable(); else render();
  });

  // ===== Helpers =====
  function priceOf(p){
    const pct = (p.marginPct != null) ? p.marginPct : (CAT_MARGIN[p.categoryId] ?? 0);
    return Math.round((p.cost||0) * (1 + (pct||0)/100));
  }
  function categories(){ return CATEGORIES; }

  // ===== Render filter choices (an toàn khi thiếu DOM) =====
  function renderFilters(){
    const cats = categories();

    const catSel = $("#cat");
    if (catSel) {
      catSel.innerHTML =
        `<option value="">Tất cả</option>` +
        cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
    }

    // Nếu bạn vẫn giữ form theo loại cũ (không dùng thì sẽ không có các phần tử này)
    const catMarginSel = $("#catMarginCat");
    if (catMarginSel) {
      catMarginSel.innerHTML = cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
      if (cats[0]) catMarginSel.value = cats[0].id;

      const catMarginVal = $("#catMarginVal");
      const curCat = catMarginSel.value;
      if (catMarginVal) catMarginVal.value = CAT_MARGIN[curCat] ?? 20;
    }
  }

  // ===== Filter + paginate (cho tab Theo sản phẩm) =====
  function filter(){
    let arr = [...PRODUCTS];
    const q = state.q.trim().toLowerCase();
    if (q) arr = arr.filter(p =>
      (p.name||"").toLowerCase().includes(q) || (p.sku||"").toLowerCase().includes(q)
    );
    if (state.cat) arr = arr.filter(p => p.categoryId === state.cat);
    if (state.status){
      arr = arr.filter(p => (state.status==="visible") ? p.visible!==false : p.visible===false);
    }
    return arr;
  }
  function paginate(arr){
    const total = arr.length;
    const pages = Math.max(1, Math.ceil(total/state.perPage));
    state.page = Math.min(state.page, pages);
    const start = (state.page-1)*state.perPage;
    return { slice: arr.slice(start, start+state.perPage), pages, total };
  }

  // ===== Render bảng Theo sản phẩm =====
  function render(){
    // lấy DOM mỗi lần vì pane có thể đang ẩn/chưa tồn tại
    const tbody = document.querySelector("#priceTable tbody");
    const pager = document.querySelector("#pager");
    if (!tbody || !pager) return; // đang ở tab "Theo loại"

    const { slice, pages } = paginate(filter());
    tbody.innerHTML = slice.map(p=>{
      const pct = (p.marginPct != null) ? p.marginPct : (CAT_MARGIN[p.categoryId] ?? 0);
      return `
        <tr data-sku="${p.sku}">
          <td><img class="thumb" src="${p.img||'https://picsum.photos/80?blur=1'}" alt=""></td>
          <td>${p.sku}</td>
          <td>${p.name}</td>
          <td>${p.categoryName||"-"}</td>
          <td class="num">${fmtVND(p.cost)}</td>
          <td class="num"><input class="pct" type="number" min="0" max="300" step="1" value="${pct}"></td>
          <td class="num price">${fmtVND(priceOf(p))}</td>
          <td><button class="icon-btn view">Xem</button></td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="8" class="muted">Không có sản phẩm phù hợp</td></tr>`;

    // Pager
    pager.innerHTML = "";
    if (pages>1){
      for (let i=1;i<=pages;i++){
        const b = document.createElement("button");
        b.className = "page"+(i===state.page?" active":"");
        b.textContent = i;
        b.addEventListener("click", ()=>{ state.page=i; render(); });
        pager.appendChild(b);
      }
    }
  }

  // ===== Render bảng Theo loại =====
function renderCatTable() {
  const tbody = document.querySelector("#catTable tbody");
  if (!tbody) return;

  const cats = categories();
  tbody.innerHTML = cats.map(c => {
    const pct = CAT_MARGIN[c.id] ?? 0;
    const count = PRODUCTS.filter(p => p.categoryId === c.id).length;
    return `
      <tr data-cat="${c.id}" class="clickable">
        <td>
          <span class="cat-link">
            <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            ${c.name} <span class="hint">• ${count} SP — nhấn để xem</span>
          </span>
        </td>
        <td class="num">
          <input class="cat-pct" type="number" min="0" max="300" step="1" value="${pct}">
        </td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="2" class="muted">Không có loại sản phẩm</td></tr>`;
}

// === Sự kiện click hiển thị sản phẩm thuộc loại ===
document.addEventListener("click", (e)=>{
  const tr = e.target.closest("#catTable tr[data-cat]");
  if (!tr) return;
  const catId = tr.dataset.cat;
  const catName = tr.querySelector("td").textContent.trim();
  const pct = CAT_MARGIN[catId] ?? 0;

  // Lọc sản phẩm thuộc loại
  const list = PRODUCTS.filter(p => p.categoryId === catId);
  if (!list.length) {
    alert(`Không có sản phẩm nào trong loại "${catName}"`);
    return;
  }

  // Hiển thị popup hoặc bảng phụ
  const html = `
    <div class="popup-overlay" style="
      position:fixed; inset:0; background:rgba(0,0,0,0.3);
      display:flex; align-items:center; justify-content:center; z-index:9999;
    ">
      <div class="popup" style="
        background:#fff; border-radius:12px; padding:20px; width:clamp(500px,70vw,900px);
        max-height:80vh; overflow:auto; box-shadow:0 4px 16px rgba(0,0,0,0.2);
      ">
        <h3 style="margin-bottom:12px">${catName} — Lợi nhuận ${pct}%</h3>
        <table class="tbl-prod" style="width:100%; border-collapse:collapse">
          <thead><tr>
            <th>Ảnh</th><th>Sản phẩm</th><th class="num">Giá vốn</th><th class="num">Giá bán</th>
          </tr></thead>
          <tbody>
          ${list.map(p=>`
            <tr>
              <td><img src="${p.img || 'https://picsum.photos/80'}" style="width:48px;height:48px;border-radius:8px;object-fit:cover"></td>
              <td>${p.name}</td>
              <td class="num">${fmtVND(p.cost)}</td>
              <td class="num">${fmtVND(priceOf(p))}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <div style="text-align:right; margin-top:12px">
          <button id="closeCatPopup" style="padding:6px 14px;border:1px solid #aaa;border-radius:8px;cursor:pointer;background:#f9f9f9;">Đóng</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
});

// Đóng popup
document.addEventListener("click", (e)=>{
  if (e.target.id === "closeCatPopup" || e.target.classList.contains("popup-overlay")){
    document.querySelector(".popup-overlay")?.remove();
  }
});


function renderProducts(){
  const tbody = document.querySelector("#prodTable tbody");
  if (!tbody) return;

  const q = (document.querySelector("#prodSearch")?.value || "").trim().toLowerCase();

  // Lọc nhanh theo tên hoặc SKU
  const list = PRODUCTS.filter(p => {
    if (!q) return true;
    const name = (p.name || "").toLowerCase();
    const sku  = (p.sku  || "").toLowerCase();
    return name.includes(q) || sku.includes(q);
  });

  // Render
  tbody.innerHTML = list.map(p=>{
    const pct = (p.marginPct != null) ? p.marginPct : (CAT_MARGIN[p.categoryId] ?? 0);
    return `
      <tr data-sku="${p.sku}">
        <td><img class="thumb" src="${p.img || 'https://picsum.photos/80?blur=1'}" alt=""></td>
        <td>
          <div class="name">${p.name || "-"}</div>
          <div class="sku">SKU: ${p.sku || "-"}</div>
        </td>
        <td class="num">${fmtVND(p.cost)}</td>
        <td>
          <input class="prod-pct" type="number" min="0" max="300" step="1" value="${pct}">
        </td>
        <td class="num price">${fmtVND(priceOf(p))}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="5" class="muted">Không có sản phẩm phù hợp</td></tr>`;
}


  // ===== Events chung =====
  // Lọc
  $("#apply")?.addEventListener("click", ()=>{
    state.q   = $("#q")?.value || "";
    state.cat = $("#cat")?.value || "";
    state.status = $("#status")?.value || "";
    state.page = 1; render();
  });
  $("#reset")?.addEventListener("click", ()=>{
    if ($("#q")) $("#q").value="";
    if ($("#cat")) $("#cat").value="";
    if ($("#status")) $("#status").value="";
    state = { q:"", cat:"", status:"", page:1, perPage:8 };
    render();
  });

  // Sửa % theo sản phẩm (ô input trong bảng)
  document.addEventListener("input", (e)=>{
    const inp = e.target.closest("input.pct");
    if (!inp) return;
    const tr = inp.closest("tr[data-sku]");
    const sku = tr?.dataset.sku;
    const p = PRODUCTS.find(x=>x.sku===sku);
    if (!p) return;
    const v = Number(inp.value || 0);
    p.marginPct = v;
    tr.querySelector(".price").textContent = fmtVND(priceOf(p));
  });

  // Xem nhanh
  document.addEventListener("click", (e)=>{
    if (e.target.closest(".view")){
      const tr = e.target.closest("tr[data-sku]");
      const sku = tr?.dataset.sku;
      const p = PRODUCTS.find(x=>x.sku===sku);
      if (p) alert(`${p.name}\nGiá vốn: ${fmtVND(p.cost)}\nGiá bán: ${fmtVND(priceOf(p))}`);
    }
  });

  // Cập nhật % theo loại (bảng bycat)
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".btn-edit");
    if (!btn) return;
    const tr = btn.closest("tr[data-cat]");
    const id = tr.dataset.cat;
    const val = Number(tr.querySelector(".cat-pct").value || 0);
    CAT_MARGIN[id] = val;
    renderCatTable();   // cập nhật bảng loại
    render();           // đồng bộ sang bảng sản phẩm nếu chuyển tab
  });

  // Tìm kiếm theo sản phẩm
  const searchBox = document.querySelector("#prodSearch");
  if (searchBox) {
    searchBox.addEventListener("input", () => {
      renderProducts();
    });
  }

  // Chỉnh % lợi nhuận ở bảng sản phẩm -> cập nhật giá bán
  document.addEventListener("input", (e)=>{
    const inp = e.target.closest("input.prod-pct");
    if (!inp) return;
    const tr  = inp.closest("tr[data-sku]");
    const sku = tr?.dataset.sku;
    const p   = PRODUCTS.find(x=>x.sku===sku);
    if (!p) return;
    p.marginPct = Number(inp.value || 0);
    tr.querySelector(".price").textContent = fmtVND(priceOf(p));
  });


  // ===== Load Data (products + categories) =====
  const productsFallback = [
    { sku:"SKU-TS-001", name:"Áo thun basic",   categoryId:"type-ss",    cost:120000, visible:true },
    { sku:"SKU-SN-201", name:"Giày sneaker",    categoryId:"type-shoes", cost:350000, visible:true },
    { sku:"SKU-BG-051", name:"Túi xách mini",   categoryId:"type-accessory", cost:220000, visible:false },
  ];
  const categoriesFallback = [
    { id:"type-ss", name: CAT_LABELS["type-ss"] },
    { id:"type-fw", name: CAT_LABELS["type-fw"] },
    { id:"type-shoes", name: CAT_LABELS["type-shoes"] },
    { id:"type-accessory", name: CAT_LABELS["type-accessory"] },
  ];

  // ==== Load data: products + categories + pricelist (margins & costs) ====
  Promise.all([
    fetch("../mock-data/products.json").then(r => r.json()).catch(() => null),
    fetch("../mock-data/categories.json").then(r => r.json()).catch(() => null),
    fetch("../mock-data/pricelist.json").then(r => r.json()).catch(() => null) // << thêm file mới
  ])
  .then(([pJson, cJson, plJson]) => {
    // ----- CATEGORIES -----
    const rawCats = Array.isArray(cJson) ? cJson
                : Array.isArray(cJson?.categories) ? cJson.categories
                : categoriesFallback;

    CATEGORIES = (rawCats?.length ? rawCats : categoriesFallback).map(c => {
      const rawId = c.id || c.code;
      const id    = normCatId(rawId);                 // chuẩn hóa về dạng cat_*
      const name  = CAT_LABELS[id] || c.name;         // ưu tiên nhãn Việt
      return { id, name };
    });

    // ----- PRODUCTS -----
    const rawProds = Array.isArray(pJson) ? pJson : (pJson?.products || productsFallback);

    // Hàm tìm tên loại Việt từ id
    const catNameVI = (id) => CAT_LABELS[id] || (CATEGORIES.find(x => x.id === id)?.name) || "Khác";

    // Chuẩn hóa sản phẩm
    PRODUCTS = rawProds.map(p => {
      const rawId = p.categoryId || p.category?.id || p.categoryCode || "cat_acc";
      const id = (() => {
        const raw = p.categoryId || p.category?.id || p.categoryCode || p.category || "cat_acc";
        if (typeof raw === "string") return LABEL_TO_ID[raw] || normCatId(raw);
        return normCatId(raw);
      })();
      return {
        id:   p.id,
        sku:  p.sku || p.code || p.id,
        name: p.name || p.title || "Sản phẩm",
        categoryId:   id,
        categoryName: CAT_LABELS[id] || "Khác",
        cost: Number(p.cost || p.importPrice || p.baseCost || 0),
        visible: p.status ? (p.status !== "hidden") : (p.visible !== false),
        img:     p.img || p.image
      };
    });

    // ----- PRICELIST (margins & per-product overrides) -----
    if (plJson?.categoryMargins && typeof plJson.categoryMargins === "object") {
      Object.entries(plJson.categoryMargins).forEach(([key, cfg]) => {
        const id = LABEL_TO_ID[key] || normCatId(key); // 👈 map nhãn -> id
        const pct = Number(cfg?.marginPct);
        if (!Number.isNaN(pct)) CAT_MARGIN[id] = pct;
      });
    }

    if (Array.isArray(plJson?.productMargins)) {
      // Mỗi phần tử có thể chứa productId hoặc sku + cost + marginPct
      plJson.productMargins.forEach(m => {
        const keySku = m.sku || m.SKU;
        const keyId  = m.productId ?? m.id;

        // tìm theo sku trước, không có thì theo id
        const prod = PRODUCTS.find(p =>
          (keySku && p.sku == keySku) ||
          (keyId  != null && p.id == keyId)
        );
        if (!prod) return;

        if (m.cost != null && !Number.isNaN(Number(m.cost))) {
          prod.cost = Number(m.cost);
        }
        if (m.marginPct != null && !Number.isNaN(Number(m.marginPct))) {
          prod.marginPct = Number(m.marginPct); // override % theo sản phẩm
        }
      });
    }

    // Bổ sung mặc định 20% cho loại nào chưa có margin
    CATEGORIES.forEach(c => {
      if (CAT_MARGIN[c.id] == null) CAT_MARGIN[c.id] = 20;
    });
  })
  .finally(() => {
    renderFilters();
    // gọi cả 2 để khi user đang ở tab nào thì cũng sẵn dữ liệu
    renderCatTable();   // Tab "Theo loại"
    renderProducts();   // Tab "Theo sản phẩm"
  });

  // ===== (Tùy chọn) legacy form theo loại — bọc null để không lỗi nếu không có =====
  const _catMarginCat = $("#catMarginCat");
  if (_catMarginCat) {
    _catMarginCat.addEventListener("change", ()=>{
      const cat = _catMarginCat.value;
      const val = CAT_MARGIN[cat] ?? 20;
      const inp = $("#catMarginVal");
      if (inp) inp.value = val;
    });
  }
  const _applyCatMargin = $("#applyCatMargin");
  if (_applyCatMargin && _catMarginCat) {
    _applyCatMargin.addEventListener("click", ()=>{
      const cat = _catMarginCat.value;
      const val = Number(($("#catMarginVal")?.value) || 0);
      CAT_MARGIN[cat] = val;
      renderCatTable();
      render();
    });
  }
})();

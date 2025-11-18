(function(){
  const $  = (s,sc)=> (sc||document).querySelector(s);
  const $$ = (s,sc)=> Array.from((sc||document).querySelectorAll(s));
  const fmtVND = n => (n||0).toLocaleString('vi-VN') + 'đ';
  const todayISO = ()=> new Date().toISOString().slice(0,10);
  const parseISO = s => { const d = new Date(s); return isNaN(d) ? null : d; };
  const inRange = (d, a, b) => (!a || d>=a) && (!b || d<=b);
  const LOW_STOCK = 5;

  // Elements
  const toastEl = $('#toast');

  // Tabs
  const tabBtns = $$('.tab-btn');
  const tabByCat = $('#tab-byCategory');
  const tabByProd = $('#tab-byProduct');
  const productToolbar = $('#productToolbar');

  // By category
  const catGrid = $('#catGrid');
  const catDetail = $('#catDetail');
  const catTitle = $('#catTitle');
  const catProducts = $('#catProducts');
  const btnBackCats = $('#btnBackCats');

  // By product
  const invTbody = $('#invTbody');
  const qSearch = $('#qSearch');
  const btnClear = $('#btnClear');
  const fromDate = $('#fromDate');
  const toDate = $('#toDate');
  const statusFilter = $('#statusFilter');
  const btnApply = $('#btnApply');

  // Data
  let products = [];           // from products.json
  let receipts = [];           // from receipts.json
  let invSeed = {};            // from inventory.json (opening & synthetic OUTs)
  let byId = new Map();
  let byCat = new Map();
  let cats = [];

  function toast(msg, ms=1400){
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(()=> toastEl.classList.remove('show'), ms);
  }

  function indexProducts(list){
    byId.clear(); byCat.clear();
    products = list || [];
    products.forEach(p=>{
      byId.set(String(p.id), p);
      const c = p.category || 'Khác';
      if(!byCat.has(c)) byCat.set(c, []);
      byCat.get(c).push(p);
    });
    cats = Array.from(byCat.keys());
  }

  // ===== Build movement from receipts + seed (opening & OUT)
  // invSeed format (inventory.json):
  // { "openingStock": { "1": 10, "4": 5, ... },
  //   "outMovements": [ { "productId": 1, "date":"2025-11-09", "qty": 3 }, ... ] }
  // Bạn có thể để trống -> mặc định opening=0, không có OUT synthetic.
  function buildMovements(){
    // Start with opening
    // For fast query, keep arrays per productId
    const mov = new Map(); // id -> [{date,type,qty}]
    const put = (pid, item)=> {
      const k = String(pid);
      if(!mov.has(k)) mov.set(k, []);
      mov.get(k).push(item);
    };

    // RECEIPTS: IN by date
    receipts.forEach(r=>{
      const d = r.date;
      (r.items||[]).forEach(it=>{
        put(it.productId, { date: d, type:'in', qty: Number(it.qty)||0 });
      });
    });

    // Synthetic OUT from invSeed
    (invSeed.outMovements||[]).forEach(it=>{
      put(it.productId, { date: it.date, type:'out', qty: Number(it.qty)||0 });
    });

    return mov;
  }

  // Calculate in/out/stock in a date range for one product
  function calcForProduct(pid, range){
    const open = Number((invSeed.openingStock||{})[String(pid)] || 0);
    const arr = movements.get(String(pid)) || [];
    let inQty=0, outQty=0;
    const a = range?.from ? parseISO(range.from) : null;
    const b = range?.to ? parseISO(range.to) : null;

    arr.forEach(m=>{
      const dm = parseISO(m.date);
      if(!dm) return;
      if(range && (a || b)){
        if(!inRange(dm, a, b)) return;
      }
      if(m.type==='in') inQty += m.qty;
      else outQty += m.qty;
    });

    // stock at end of range:
    // Nếu có range -> tồn = opening + tổng IN(up to 'to') - tổng OUT(up to 'to')
    // (ở đây tính đúng trong khoảng; nếu muốn "đến ngày bất kỳ" chỉ cần set from rỗng, to=ngày đó)
    let stock;
    if(range && (a||b)){
      // tính đến 'to' nếu có, còn không thì đến 'from'
      stock = open;
      // cộng dần toàn bộ movement <= to
      const endPoint = b || a; // nếu không có to, dùng from
      arr.forEach(m=>{
        const dm = parseISO(m.date);
        if(!dm) return;
        if(!endPoint || dm <= endPoint){
          stock += (m.type==='in' ? m.qty : -m.qty);
        }
      });
    }else{
      // hiện tại (đến hôm nay)
      stock = open;
      arr.forEach(m=>{
        stock += (m.type==='in' ? m.qty : -m.qty);
      });
    }

    return { inQty, outQty, stock };
  }

  function renderCategories(){
    catDetail.hidden = true;
    catGrid.innerHTML = cats.map(c=>{
      const n = byCat.get(c)?.length || 0;
      return `
        <div class="cat-card" data-cat="${c}">
          <h4>${c}</h4>
          <div class="meta">${n} sản phẩm</div>
        </div>
      `;
    }).join('');
    $$('.cat-card').forEach(el=>{
      el.addEventListener('click', ()=>{
        openCategory(el.dataset.cat);
      });
    });
  }

  function openCategory(catName){
    const list = byCat.get(catName) || [];
    catTitle.textContent = catName;

    // render cards
    catProducts.innerHTML = list.map(p => {
      const { stock } = calcForProduct(p.id, null);
      const oos = (stock === 0);
      const low = (stock > 0 && stock <= LOW_STOCK);

      return `
        <div class="prod-card">
          <div class="thumb">
            ${p.img ? `<img src="${p.img}" alt="">` : `<span class="muted" style="font-size:12px">No image</span>`}
          </div>

          <div class="body">
            <h4 class="title">${p.name}</h4>
            <div class="meta">Tồn: <b>${stock}</b></div>
          </div>

          <div class="badge-wrap">
            ${
              oos
              ? `<span class="badge-oos">Hết hàng</span>`
              : (low ? `<span class="badge-low">Sắp hết</span>` : ``)
            }
          </div>
        </div>
      `;
    }).join('');

    // show detail view
    catGrid.innerHTML = '';
    catDetail.hidden = false;
  }

  function renderProducts(range, query, state){
    // range {from,to}, query string, state: 'all'|'low'|'oos'
    // Build rows
    const q = (query||'').trim().toLowerCase();
    const rows = products.map(p=>{
      const met = calcForProduct(p.id, range);
      if(q && !p.name.toLowerCase().includes(q)) return null;
      if(state==='low' && !(met.stock>0 && met.stock<=LOW_STOCK)) return null;
      if(state==='oos' && met.stock!==0) return null;
      return `
        <tr>
          <td><img class="inv-img" src="${p.img||''}" alt=""></td>
          <td title="${p.name}">${p.name}</td>
          <td style="text-align:right">${met.inQty}</td>
          <td style="text-align:right">${met.outQty}</td>
          <td style="text-align:right">${met.stock}</td>
        </tr>
      `;
    }).filter(Boolean);

    invTbody.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="5" class="muted">Không có sản phẩm phù hợp.</td></tr>`;
  }

  // ===== Events
  tabBtns.forEach(b=>{
    b.addEventListener('click', ()=>{
      tabBtns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      const tab = b.dataset.tab;
      const isProd = (tab === 'byProduct');
      tabByProd.hidden = !isProd;
      productToolbar.hidden = !isProd;
      tabByCat.hidden = isProd;

      if(isProd){
        // default range hôm nay
        if(!fromDate.value) fromDate.value = todayISO();
        if(!toDate.value) toDate.value = todayISO();
        applyProdFilter();
      }else{
        renderCategories();
      }
    });
  });

  btnBackCats?.addEventListener('click', ()=>{
    renderCategories();
    catDetail.hidden = true;
  });

  qSearch?.addEventListener('input', ()=>{
    clearTimeout(qSearch._t);
    qSearch._t = setTimeout(applyProdFilter, 120);
  });
  btnClear?.addEventListener('click', ()=>{
    qSearch.value=''; applyProdFilter(); qSearch.focus();
  });
  btnApply?.addEventListener('click', applyProdFilter);
  statusFilter?.addEventListener('change', applyProdFilter);

  function applyProdFilter(){
    const range = { from: fromDate.value||'', to: toDate.value||'' };
    renderProducts(range, qSearch.value||'', statusFilter.value||'all');
  }

    // ===== Init
  let movements = new Map();

  // Đọc JSON từ <script type="application/json">
  function loadEmbeddedJSON(id, fallback){
    const el = document.getElementById(id);
    if(!el || !el.textContent || !el.textContent.trim) return fallback;
    const txt = el.textContent.trim();
    if(!txt) return fallback;
    try{
      const json = JSON.parse(txt);
      return json;
    }catch(err){
      console.error('Không parse được', id, err);
      return fallback;
    }
  }

  function init(){
    try{
      const pList = loadEmbeddedJSON('products-data', []);
      const rList = loadEmbeddedJSON('receipts-data', []);
      const seed  = loadEmbeddedJSON('inventory-data', {});

      products = Array.isArray(pList) ? pList : [];
      receipts = Array.isArray(rList) ? rList : [];
      invSeed  = seed || {};

      indexProducts(products);
      movements = buildMovements();

      // tab mặc định: Theo loại
      renderCategories();
    }catch(err){
      console.error(err);
      if(invTbody){
        invTbody.innerHTML =
          '<tr><td colspan="5" class="muted">Không thể tải dữ liệu</td></tr>';
      }
      toast('Không thể tải dữ liệu');
    }
  }

  // Gọi init khi DOM sẵn sàng (mở file trực tiếp vẫn OK)
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }
})();


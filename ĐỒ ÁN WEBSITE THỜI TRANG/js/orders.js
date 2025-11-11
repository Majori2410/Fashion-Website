(() => {
  const $ = (s, sc=document)=>sc.querySelector(s);
  const $$= (s, sc=document)=>Array.from(sc.querySelectorAll(s));
  const fmtVND  = n => (n||0).toLocaleString("vi-VN")+"đ";
  const fmtDate = iso => new Date(iso).toLocaleString("vi-VN");
  const toISODate = s => s ? new Date(s+"T00:00:00").toISOString() : "";

  const STATUS = ["NEW","PROCESSED","DELIVERED","CANCELLED"];
  const LABEL = { NEW:"Mới đặt", PROCESSED:"Đã xử lý", DELIVERED:"Đã giao", CANCELLED:"Hủy" };

  let ALL = [];
  let state = { from:"", to:"", status:"", q:"", page:1, perPage:8 };
  let editing = null; // order đang mở modal

  const tbody = $("#ordersTable tbody");
  const pager = $("#pager");

  // --- Custom Select (nhẹ) ---
  function enhanceSelect(nativeSel){
    if (!nativeSel || nativeSel.classList.contains("selectified")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "cs";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "cs-toggle";
    const menu = document.createElement("div");
    menu.className = "cs-menu";

    function labelOf(val){
      const opt = Array.from(nativeSel.options).find(o => o.value === val);
      return opt ? opt.textContent : "";
    }

    Array.from(nativeSel.options).forEach(o=>{
      const item = document.createElement("div");
      item.className = "cs-option";
      item.setAttribute("role","option");
      item.dataset.value = o.value;
      item.setAttribute("aria-selected", o.selected ? "true" : "false");
      item.innerHTML = `<span>${o.textContent}</span><span class="check">✓</span>`;
      item.addEventListener("click", ()=>{
        nativeSel.value = o.value;
        nativeSel.dispatchEvent(new Event("change", { bubbles:true }));
        btn.textContent = labelOf(nativeSel.value);
        menu.querySelectorAll(".cs-option").forEach(el=>el.setAttribute("aria-selected","false"));
        item.setAttribute("aria-selected","true");
        wrapper.classList.remove("open");
      });
      menu.appendChild(item);
    });

    btn.textContent = labelOf(nativeSel.value || nativeSel.options[0].value);

    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      document.querySelectorAll(".cs.open").forEach(x=>x.classList.remove("open"));
      wrapper.classList.toggle("open");
    });
    document.addEventListener("click", ()=> wrapper.classList.remove("open"));

    nativeSel.classList.add("select-hidden", "selectified");
    nativeSel.after(wrapper);
    wrapper.appendChild(btn);
    wrapper.appendChild(menu);
  }

  function enhanceAllSelects(){
    // dropdown trạng thái ở filter
    enhanceSelect(document.getElementById("status"));
    // dropdown trạng thái ở từng dòng
    document.querySelectorAll("select.status-inline").forEach(enhanceSelect);
  }

  document.addEventListener("DOMContentLoaded", ()=> {
    enhanceAllSelects();
  });

  const sum = (o)=> (o.items||[]).reduce((s,it)=>s+it.price*it.qty,0);

  function inRange(iso){
    if(!state.from && !state.to) return true;
    const t = new Date(iso).getTime();
    if(state.from && t < new Date(state.from).getTime()) return false;
    if(state.to   && t > new Date(state.to).getTime()+86400000-1) return false; // inclusive toDate
    return true;
  }

  function filter(){
    let arr = [...ALL];
    if(state.q){
      const q = state.q.toLowerCase().trim();
      arr = arr.filter(o => (o.code||"").toLowerCase().includes(q));
    }
    if(state.status) arr = arr.filter(o => o.status === state.status);
    if(state.from || state.to) arr = arr.filter(o => inRange(o.createdAt));
    // mới nhất trên cùng
    arr.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
    return arr;
  }

  function paginate(arr){
    const total = arr.length;
    const pages = Math.max(1, Math.ceil(total/state.perPage));
    state.page = Math.min(state.page, pages);
    const start = (state.page-1)*state.perPage;
    return { slice: arr.slice(start, start+state.perPage), pages, total };
  }

function render(){
  const { slice, pages } = paginate(filter());

  // Đổ body bảng
  tbody.innerHTML = slice.map(o=>{
    const itemsCount = (o.items||[]).reduce((s,it)=>s+it.qty,0);
    const total = fmtVND((o.items||[]).reduce((s,it)=>s+it.price*it.qty,0));
    return `
      <tr data-code="${o.code}">
        <td><a href="#" class="link detail">${o.code}</a></td>
        <td>${fmtDate(o.createdAt)}</td>
        <td>${o.customer?.name || "-"}</td>
        <td class="num">${itemsCount}</td>
        <td class="num">${total}</td>
        <td><span class="tag ${o.status}">${LABEL[o.status]||o.status}</span></td>
        <td>
          <div class="actions-row">
            <select class="status-inline">
              ${STATUS.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${LABEL[s]}</option>`).join("")}
            </select>
            <button class="icon-btn view">Xem</button>
          </div>
        </td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="7" class="muted">Không có đơn phù hợp</td></tr>`;

  // Pager
  pager.innerHTML = "";
  if(pages>1){
    for(let i=1;i<=pages;i++){
      const b = document.createElement("button");
      b.className = "page"+(i===state.page?" active":"");
      b.textContent = i;
      b.addEventListener("click", ()=>{ state.page=i; render(); });
      pager.appendChild(b);
    }
  }

  // Beautify dropdown sau khi render xong
  enhanceAllSelects();
}


  // Modal chi tiết
  const modal = $("#orderModal");
  const detailEl = $("#orderDetail");
  $("#orderModal").addEventListener("click", e=>{
    if(e.target.hasAttribute("data-close")) modal.classList.remove("open");
  });
  $("#saveStatus").addEventListener("click", ()=>{
    if(!editing) return;
    const sel = detailEl.querySelector("#detailStatus");
    const val = sel.value;
    editing.status = val;
    render();
    modal.classList.remove("open");
    alert("Đã cập nhật trạng thái (demo local).");
  });

function openDetail(order){
  editing = order;

  const itemsHtml = (order.items || []).map(it => `
    <div class="line-item">
      <img src="${it.img || '../assets/orders/placeholder.png'}" alt="">
      <div>
        <div class="name">${it.name}</div>
        <div class="meta">Size ${it.size}${it.color ? ` • ${it.color}` : ""} • SL: ${it.qty}</div>
      </div>
      <div class="price">${fmtVND(it.price * it.qty)}</div>
    </div>
  `).join("");

  detailEl.innerHTML = `
    <!-- PHẦN 1: TÓM TẮT ĐƠN -->
    <section class="detail-head">
      <div class="kv">
        <div class="label">Mã đơn</div>      <div><b>${order.code}</b></div>
        <div class="label">Ngày đặt</div>    <div>${fmtDate(order.createdAt)}</div>
        <div class="label">Khách hàng</div>  <div>${order.customer?.name || "-"}</div>
        <div class="label">Liên hệ</div>     <div>${order.customer?.phone || "-"} • ${order.customer?.email || "-"}</div>
        <div class="label">Địa chỉ</div>     <div>${order.customer?.address || "-"}</div>
      </div>
      <div class="status-row">
        <div class="label">Trạng thái</div>
        <div>
          <select id="detailStatus" class="status-inline">
            ${STATUS.map(s => `<option value="${s}" ${s===order.status?'selected':''}>${LABEL[s]}</option>`).join("")}
          </select>
        </div>
      </div>
    </section>

    <!-- PHẦN 2: DANH SÁCH SẢN PHẨM -->
    <section class="items">
      ${itemsHtml}
      <div style="text-align:right;margin-top:6px"><b>Tổng: ${fmtVND(sum(order))}</b></div>
    </section>
  `;

  modal.classList.add("open");
}

  // Events trên bảng
  document.addEventListener("click", (e)=>{
    const row = e.target.closest("tr[data-code]");
    if(!row) return;
    const code = row.dataset.code;
    const order = ALL.find(x=>x.code===code);
    if(!order) return;

    if(e.target.closest(".view") || e.target.closest(".detail")){
      e.preventDefault();
      openDetail(order);
    }
    if(e.target.closest(".save")){
      const sel = row.querySelector(".status-inline");
      order.status = sel.value;
      render();
    }
  });

  // Đổi dropdown là cập nhật ngay
  document.addEventListener("change", (e)=>{
    const sel = e.target.closest("select.status-inline");
    if(!sel) return;

    const row = sel.closest("tr[data-code]");
    if(!row) return;

    const code = row.dataset.code;
    const order = ALL.find(x=>x.code===code);
    if(!order) return;

    // Cập nhật dữ liệu
    order.status = sel.value;

    // Cập nhật UI tại chỗ (không re-render cả bảng)
    const tag = row.querySelector(".tag");
    if(tag){
        // reset class rồi gán lại
        tag.className = "tag " + order.status;
        tag.textContent = LABEL[order.status] || order.status;
    }
 });


  // Filter events
  $("#apply").addEventListener("click", ()=>{
    state.from = $("#fromDate").value || "";
    state.to   = $("#toDate").value   || "";
    state.status = $("#status").value || "";
    state.q = $("#q").value || "";
    state.page = 1;
    render();
  });
  $("#reset").addEventListener("click", ()=>{
    ["fromDate","toDate","status","q"].forEach(id=>{ const el=$("#"+id); if(el) el.value=""; });
    state = { from:"", to:"", status:"", q:"", page:1, perPage:8 };
    render();
  });

  // Load data (Admin)
  fetch("../mock-data/orders.json")
    .then(r=>r.json())
    .then(data=>{
      ALL = Array.isArray(data) ? data : (data.orders||[]);
      render();
    })
    .catch(err=>{
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="7" class="muted">Không tải được dữ liệu.</td></tr>`;
    });
})();

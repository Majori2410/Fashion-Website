(() => {
  const $  = (s, sc=document) => sc.querySelector(s);
  const $$ = (s, sc=document) => Array.from(sc.querySelectorAll(s));
  const fmtVND  = (n) => (n || 0).toLocaleString("vi-VN") + "đ";
  const fmtDate = (iso) => new Date(iso).toLocaleString("vi-VN");

  // chuẩn hoá đường dẫn ảnh về /assets/orders/
  const IMG_BASE = "../assets/orders/";
  function imgPath(p) {
    if (!p) return "";
    if (/^(https?:)?\/\//.test(p) || p.startsWith("/")) return p; // URL tuyệt đối
    const file = p.split("/").pop(); // lấy tên file (vd: 1.jpg)
    return IMG_BASE + file;
  }

  // 4 trạng thái
  const STATUS_LABELS = {
    NEW: "Mới đặt",
    PROCESSED: "Đã xử lý",
    DELIVERED: "Đã giao",
    CANCELLED: "Hủy"
  };
  const canCancel = (st) => st === "NEW";

  let ALL = [];
  let state = { q: "", status: "", page: 1, perPage: 5 };

  const ordersListEl = $("#ordersList");
  const pagEl        = $("#ordersPagination");

  function computeTotal(order){
    return (order.items || []).reduce((s, it) => s + (it.price * it.qty), 0);
  }

  function filterOrders(){
    let arr = [...ALL];
    if (state.q){
      const q = state.q.trim().toLowerCase();
      arr = arr.filter(o => (o.code || "").toLowerCase().includes(q));
    }
    if (state.status){
      arr = arr.filter(o => o.status === state.status);
    }
    arr.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    return arr;
  }

  function paginate(arr){
    const total = arr.length;
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.perPage;
    return { slice: arr.slice(start, start + state.perPage), pages, total };
  }

  function render(){
    const filtered = filterOrders();
    const { slice } = paginate(filtered);

    ordersListEl.innerHTML = slice.map(order => {
      // --- customer box ---
      const c = order.customer || {};
      const telHref  = c.phone ? `tel:${c.phone.replace(/\s+/g,'')}` : null;
      const mailHref = c.email ? `mailto:${c.email}` : null;
      const customerHtml = `
        <div class="customer-box">
          <div class="customer-title">Thông tin khách hàng</div>
          <div class="customer-grid">
            <div class="label">Khách hàng</div>
            <div>${c.name || "-"}</div>

            <div class="label">Điện thoại</div>
            <div>${c.phone ? `<a href="${telHref}">${c.phone}</a>` : "-"}</div>

            <div class="label">Email</div>
            <div>${c.email ? `<a href="${mailHref}">${c.email}</a>` : "-"}</div>

            <div class="label">Địa chỉ</div>
            <div>${c.address || "-"}</div>
          </div>
        </div>
      `;

      const totalAmount = computeTotal(order);
      const itemsHtml = (order.items || []).map(it => `
        <div class="item">
          <img src="${imgPath(it.img)}" alt=""
          onerror="this.onerror=null;this.src='${IMG_BASE}placeholder.png'">
          <div>
            <div class="item-name">${it.name}</div>
            <div class="item-meta">Phân loại: Size ${it.size}${it.color ? ` • ${it.color}` : ""} • SL: ${it.qty}</div>
          </div>
          <div class="item-price">${fmtVND(it.price * it.qty)}</div>
        </div>
      `).join("");

      return `
        <article class="order-card" data-code="${order.code}">
          <header class="order-head">
            <div class="order-meta">
              <div>Mã đơn: <b>${order.code}</b></div>
              <div>Thời gian đặt: <b>${fmtDate(order.createdAt)}</b></div>
              <div>Khách hàng: <b>${c.name || "-"}</b></div>
            </div>
            <div class="status-badge status--${order.status}">${STATUS_LABELS[order.status] || order.status}</div>
          </header>

          <div class="order-body">
            ${customerHtml}
            ${itemsHtml}
            <div class="order-foot">
              <div class="order-total">Tổng tiền: ${fmtVND(totalAmount)}</div>
              <div class="order-actions">
                ${canCancel(order.status) ? `<button class="btn btn-ghost js-cancel">Hủy đơn</button>` : ``}
                <button class="btn btn-primary js-toggle">Thu gọn</button>
              </div>
            </div>
          </div>

          <div style="padding:8px 16px 14px;">
            <button class="btn-link js-toggle">Xem chi tiết</button>
          </div>
        </article>
      `;
    }).join("") || `<div class="empty">Không có đơn hàng phù hợp.</div>`;

    // pagination
    const filteredAll = filterOrders();
    const pagesAll = Math.max(1, Math.ceil(filteredAll.length / state.perPage));
    pagEl.innerHTML = "";
    if (pagesAll > 1){
      for (let i = 1; i <= pagesAll; i++){
        const btn = document.createElement("button");
        btn.className = "page-btn" + (i === state.page ? " is-active" : "");
        btn.textContent = i;
        btn.addEventListener("click", () => {
          state.page = i; render(); window.scrollTo({ top: 0, behavior: "smooth" });
        });
        pagEl.appendChild(btn);
      }
    }

    bindRowEvents();
  }

  function bindRowEvents(){
    $$(".order-card").forEach(card => {
      const body = card.querySelector(".order-body");
      $$(".js-toggle", card).forEach(btn => {
        btn.addEventListener("click", () => {
          body.classList.toggle("is-open");
          const footBtn = card.querySelector(".order-foot .js-toggle");
          if (footBtn) footBtn.textContent = body.classList.contains("is-open") ? "Thu gọn" : "Xem chi tiết";
        });
      });

      const cancelBtn = $(".js-cancel", card);
      if (cancelBtn){
        cancelBtn.addEventListener("click", () => {
          const code = card.dataset.code;
          const ord = ALL.find(o => o.code === code);
          if (!ord || !canCancel(ord.status)) return;
          if (!confirm(`Xác nhận hủy đơn ${code}?`)) return;
          ord.status = "CANCELLED";
          render();
          alert("Đã hủy đơn hàng.");
        });
      }
    });
  }

  // filter events
  $("#orderFilterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.q = $("#searchCode").value || "";
    state.status = $("#statusSelect").value || "";
    state.page = 1;
    render();
  });

  $("#btnReset").addEventListener("click", () => {
    $("#searchCode").value = "";
    $("#statusSelect").value = "";
    state.q = ""; state.status = ""; state.page = 1;
    render();
  });

  // 🔁 Load dữ liệu từ JSON nhúng trong HTML (thay cho fetch)
  function loadEmbeddedOrders() {
    const el = document.getElementById("user-orders-data");
    if (!el || !el.textContent || !el.textContent.trim) {
      ALL = [];
      ordersListEl.innerHTML = `<div class="empty">Không tải được dữ liệu đơn hàng.</div>`;
      return;
    }
    const txt = el.textContent.trim();
    try {
      const data = JSON.parse(txt);
      ALL = Array.isArray(data) ? data : (data.orders || []);
      render();
      const firstBody = document.querySelector(".order-card .order-body");
      if (firstBody) firstBody.classList.add("is-open");
    } catch (err) {
      console.error("Parse user-orders-data lỗi:", err);
      ordersListEl.innerHTML = `<div class="empty">Không tải được dữ liệu đơn hàng.</div>`;
    }
  }

  loadEmbeddedOrders();
})();

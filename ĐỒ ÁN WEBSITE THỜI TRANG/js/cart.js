(function () {
  const $  = (s, sc = document) => sc.querySelector(s);
  const $$ = (s, sc = document) => Array.from(sc.querySelectorAll(s));
  const fmtVND = (n) => (n || 0).toLocaleString("vi-VN") + "₫";

  const cartItemsEl   = $("#cartItems");
  const subtotalEl    = $("#subtotal");
  const totalEl       = $("#total");
  const totalBottomEl = $("#totalBottom");
  const chkAllEl      = $("#chkAll");
  const selCountEl    = $("#selCount");
  const stickyBarEl   = $("#cartStickyTotal");
  const chkAllText    = $("#chkAllText");
  const checkoutBtn   = $("#checkoutBtn");
  const checkoutBtnBottom = $("#checkoutBtnBottom");

  if (!cartItemsEl) return;

  // ---- Đọc JSON từ <script> nhúng ----
  function loadEmbeddedJSON(id) {
    const el = document.getElementById(id);
    if (!el || !el.textContent || !el.textContent.trim) return null;
    try {
      const data = JSON.parse(el.textContent.trim());
      return data;
    } catch (err) {
      console.error("Không parse được JSON từ", id, err);
      return null;
    }
  }

  const PRODUCTS_RAW = loadEmbeddedJSON("products-data") || [];
  const CART_RAW     = loadEmbeddedJSON("cart-data") || [];

  const PRODUCTS = Array.isArray(PRODUCTS_RAW) ? PRODUCTS_RAW : [];
  const RAW_CART = Array.isArray(CART_RAW) ? CART_RAW : [];

  // ---- Gộp cart + dữ liệu sản phẩm ----
  let cart = RAW_CART.map((item) => {
    const idNum = Number(item.id);
    const p = PRODUCTS.find((pr) => pr.id === idNum);
    if (!p) return null;
    return {
      id: p.id,
      size: item.size || "",
      qty: Number(item.qty) > 0 ? Number(item.qty) : 1,
      product: p,
      selected: true
    };
  }).filter(Boolean);

  // ---- TÍNH TỔNG ----
  function recomputeTotals() {
    let subtotal = 0;
    let selCount = 0;

    cart.forEach((line) => {
      if (line.selected) {
        selCount += 1;
        subtotal += (line.product.price || 0) * (line.qty || 0);
      }
    });

    if (subtotalEl)    subtotalEl.textContent    = fmtVND(subtotal);
    if (totalEl)       totalEl.textContent       = fmtVND(subtotal);
    if (totalBottomEl) totalBottomEl.textContent = fmtVND(subtotal);
    if (selCountEl)    selCountEl.textContent    = selCount;

    // trạng thái checkbox "chọn tất cả"
    if (chkAllEl) {
      if (!cart.length) {
        chkAllEl.checked = false;
        chkAllEl.indeterminate = false;
      } else {
        if (selCount === 0) {
          chkAllEl.checked = false;
          chkAllEl.indeterminate = false;
        } else if (selCount === cart.length) {
          chkAllEl.checked = true;
          chkAllEl.indeterminate = false;
        } else {
          chkAllEl.checked = false;
          chkAllEl.indeterminate = true;
        }
      }
      if (chkAllText) {
        chkAllText.textContent =
          selCount === cart.length && cart.length > 0
            ? "Bỏ chọn tất cả"
            : "Chọn tất cả";
      }
    }

    // sticky total bar
    if (stickyBarEl) {
      stickyBarEl.hidden = subtotal <= 0;
    }
  }

  // ---- RENDER MỘT HÀNG SẢN PHẨM ----
  function renderItem(line) {
    const p = line.product;
    const lineTotal = (p.price || 0) * (line.qty || 0);

    return `
      <article class="cart-item" data-id="${line.id}" data-size="${line.size}">
        <div class="sel">
          <input 
            type="checkbox" 
            class="row-check" 
            ${line.selected ? "checked" : ""} 
          />
        </div>
        <div class="thumb">
          <a href="./product-detail.html?id=${encodeURIComponent(line.id)}">
            <img src="${p.img || ""}" alt="${p.name || ""}">
          </a>
        </div>
        <div class="cart-item-info">
          <h3>
            <a href="./product-detail.html?id=${encodeURIComponent(line.id)}">
              ${p.name || ""}
            </a>
          </h3>
          <div class="meta">
            ${line.size ? `<span>Size: ${line.size}</span>` : ""}
            <span>Đơn giá: ${fmtVND(p.price || 0)}</span>
          </div>
          <div class="price">
            Thành tiền: <b class="line-total">${fmtVND(lineTotal)}</b>
          </div>
        </div>
        <div class="cart-actions">
          <button type="button" class="qty-btn btn-dec" aria-label="Giảm số lượng">-</button>
          <input 
            type="number" 
            min="1" 
            class="qty-input" 
            value="${line.qty}"
          />
          <button type="button" class="qty-btn btn-inc" aria-label="Tăng số lượng">+</button>
          <button type="button" class="remove-btn">Xóa</button>
        </div>
      </article>
    `;
  }

  // ---- RENDER TOÀN BỘ GIỎ ----
  function renderCart() {
    if (!cart.length) {
      cartItemsEl.innerHTML = `
        <p class="empty">Giỏ hàng của bạn đang trống.</p>
      `;
      recomputeTotals();
      return;
    }

    cartItemsEl.innerHTML = cart.map(renderItem).join("");
    recomputeTotals();
  }

  // ---- TÌM LINE THEO PHẦN TỬ DOM ----
  function getLineFromEventTarget(target) {
    const itemEl = target.closest(".cart-item");
    if (!itemEl) return null;
    const id = Number(itemEl.getAttribute("data-id"));
    const size = itemEl.getAttribute("data-size") || "";
    const idx = cart.findIndex((l) => l.id === id && String(l.size) === String(size));
    if (idx === -1) return null;
    return { line: cart[idx], index: idx, itemEl };
  }

  // ---- EVENT: CHECKBOX TỪNG DÒNG ----
  cartItemsEl.addEventListener("change", (e) => {
    const target = e.target;
    if (target.matches(".row-check")) {
      const found = getLineFromEventTarget(target);
      if (!found) return;
      found.line.selected = !!target.checked;
      recomputeTotals();
    } else if (target.matches(".qty-input")) {
      const found = getLineFromEventTarget(target);
      if (!found) return;
      let v = parseInt(target.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      found.line.qty = v;
      // update line total text
      const p = found.line.product;
      const lineTotal = (p.price || 0) * found.line.qty;
      const totalEl = found.itemEl.querySelector(".line-total");
      if (totalEl) totalEl.textContent = fmtVND(lineTotal);
      recomputeTotals();
    }
  });

  // ---- EVENT: CLICK NÚT + / - / XÓA ----
  cartItemsEl.addEventListener("click", (e) => {
    const target = e.target;

    // tăng giảm số lượng
    if (target.matches(".btn-inc") || target.matches(".btn-dec")) {
      const found = getLineFromEventTarget(target);
      if (!found) return;
      const input = found.itemEl.querySelector(".qty-input");
      if (!input) return;

      let v = parseInt(input.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      if (target.matches(".btn-inc")) v++;
      if (target.matches(".btn-dec")) v = Math.max(1, v - 1);

      input.value = String(v);
      found.line.qty = v;

      const p = found.line.product;
      const lineTotal = (p.price || 0) * found.line.qty;
      const totalEl = found.itemEl.querySelector(".line-total");
      if (totalEl) totalEl.textContent = fmtVND(lineTotal);

      recomputeTotals();
      return;
    }

    // xoá sản phẩm
    if (target.matches(".remove-btn")) {
      const found = getLineFromEventTarget(target);
      if (!found) return;
      const { line } = found;

      const ok = confirm(`Xóa sản phẩm "${line.product.name}" khỏi giỏ hàng?`);
      if (!ok) return;

      cart = cart.filter(
        (l) => !(l.id === line.id && String(l.size) === String(line.size))
      );
      renderCart();
      return;
    }
  });

  // ---- CHECK / UNCHECK TẤT CẢ ----
  if (chkAllEl) {
    chkAllEl.addEventListener("change", () => {
      const want = !!chkAllEl.checked;
      cart.forEach((line) => {
        line.selected = want;
      });
      // update tất cả checkbox dòng
      $$(".cart-item .row-check", cartItemsEl).forEach((cb) => {
        cb.checked = want;
      });
      recomputeTotals();
    });
  }

  // ---- THANH TOÁN ----
  function handleCheckout() {
    const selected = cart.filter((l) => l.selected);
    if (!selected.length) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm để thanh toán.");
      return;
    }
    // Chuyển sang trang checkout (giữ flow như đồ án)
    window.location.href = "./checkout.html";
  }

  checkoutBtn?.addEventListener("click", handleCheckout);
  checkoutBtnBottom?.addEventListener("click", handleCheckout);

  // ---- KHỞI TẠO ----
  renderCart();
})();

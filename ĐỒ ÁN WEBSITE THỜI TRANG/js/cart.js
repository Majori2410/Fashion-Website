// ========== CART PAGE (clean version) ==========

// DOM refs
const cartEl = document.getElementById("cartItems");
const subtotalEl = document.getElementById("subtotal");
const totalEl = document.getElementById("total");
const checkoutBtn = document.getElementById("checkoutBtn");
const chkAll = document.getElementById("chkAll");
const chkAllText = document.getElementById("chkAllText");
const selCountEl = document.getElementById("selCount");
const stickyBar = document.getElementById("cartStickyTotal");
const totalBottomEl = document.getElementById("totalBottom");
const checkoutBtnBottom = document.getElementById("checkoutBtnBottom");
if (checkoutBtnBottom) {
  checkoutBtnBottom.addEventListener("click", () => document.getElementById("checkoutBtn")?.click());
}

// State
let PRODUCTS = [];
let cart = [];

// Utils
function vnd(n) { return (Number(n) || 0).toLocaleString("vi-VN") + "₫"; }

// Lấy ảnh an toàn từ products.json, tự chuẩn hóa path theo vị trí cart.html (/pages/)
function resolveImg(p) {
  let src = p?.img || p?.image || (Array.isArray(p?.images) ? p.images[0] : "");
  if (!src) return "../images/placeholder.png";
  if (/^https?:\/\//i.test(src)) return src; // absolute
  if (src.startsWith("/")) return src;       // root-relative
  if (src.startsWith("../")) return src;     // already relative to /pages/
  if (src.startsWith("./")) return src.replace("./", "../");
  return "../" + src;                         // bare path: "images/..."
}

// Data loaders
async function loadProducts() {
  const res = await fetch("../mock-data/products.json");
  if (!res.ok) throw new Error("Không thể tải products.json");
  PRODUCTS = await res.json();
}
async function loadCartData() {
  const res = await fetch("../mock-data/cart.json");
  if (!res.ok) throw new Error("Không thể tải cart.json");
  return await res.json();
}

// Safe find by id (string compare để số/chuỗi vẫn khớp)
function findProductById(id) {
  const sid = String(id);
  return PRODUCTS.find(p => String(p.id) === sid) || null;
}

// Render
function renderCart() {
   if (!cart.length) {
    cartEl.innerHTML = `
      <div class="empty-cart" style="text-align:center; padding:40px 20px;">
        <img src="../images/empty-bag.svg" alt="" style="width:120px;height:120px;opacity:.75;">
        <h3 style="margin:14px 0 6px;">Giỏ hàng của bạn đang trống</h3>
        <p class="muted" style="margin:0 0 14px;">Hãy khám phá thêm sản phẩm mà bạn thích.</p>
        <a href="./user-category.html" class="btn btn-primary">Tiếp tục mua sắm</a>
      </div>
    `;
    subtotalEl.textContent = totalEl.textContent = "0₫";
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (chkAll) { chkAll.checked = false; chkAll.indeterminate = false; }
    return;
  }

  // Giỏ KHÔNG trống → render từng dòng
  cartEl.innerHTML = cart.map((item, i) => {
    const p = findProductById(item.id);
    const missing = !p;

    const name  = missing ? "(Sản phẩm không còn tồn tại)" : (p.name || "(Sản phẩm)");
    const price = missing ? 0 : Number(p.price || 0);
    const img   = missing ? "../images/placeholder.png" : resolveImg(p);
    const size  = item.size || "–";
    const qty   = item.qty  || 1;

    const badge = missing
      ? `<div class="meta" style="color:#d32f2f;">Không tìm thấy ID: <code>${item.id}</code></div>`
      : "";

    const selAttr = item.selected ? "checked" : "";

    return `
      <div class="cart-item" data-index="${i}">
        <div class="sel">
          <input type="checkbox" class="sel-chk" ${selAttr} ${missing ? "disabled" : ""} aria-label="Chọn mua">
        </div>
        <div class="thumb">
          <img src="${img}" alt="${name}" onerror="this.onerror=null;this.src='../images/placeholder.png'">
        </div>
        <div class="cart-item-info">
          <h3>${name}</h3>
          ${badge}
          <div class="meta">Size: ${size}</div>
          <div class="price">${vnd(price)}</div>
        </div>
        <div class="cart-actions">
          <button class="qty-btn qty-dec" aria-label="Giảm" ${missing ? "disabled" : ""}>-</button>
          <input type="number" value="${qty}" min="1" aria-label="Số lượng" ${missing ? "disabled" : ""}>
          <button class="qty-btn qty-inc" aria-label="Tăng" ${missing ? "disabled" : ""}>+</button>
          <button class="remove-btn" aria-label="Xóa">Xóa</button>
        </div>
      </div>
    `;
  }).join("");

  updateSummary();
}

function updateSummary() {
  let subtotal = 0;
  const selectable = cart.filter(it => !!findProductById(it.id)); // bỏ mục missing
  const selected = selectable.filter(it => it.selected);
  selected.forEach((item) => {
    const p = findProductById(item.id);
    subtotal += Number(p?.price || 0) * (item.qty || 1);
  });
  subtotalEl.textContent = vnd(subtotal);
  totalEl.textContent = vnd(subtotal);
  // Đồng bộ sticky bottom bar (nếu có)
  if (totalBottomEl) totalBottomEl.textContent = vnd(subtotal);
  if (stickyBar) {
    // Chỉ hiện khi có ít nhất 1 mục được chọn
    stickyBar.hidden = (selected.length === 0);
  }

  // Trạng thái nút thanh toán: chỉ bật khi có ít nhất 1 mục được chọn
  checkoutBtn.disabled = selected.length === 0;
  // Hiển thị số mục đã chọn + đổi nhãn chọn tất cả
  if (selCountEl) selCountEl.textContent = String(selected.length);

  if (chkAllText) {
    const selectable = cart.filter(it => !!findProductById(it.id));
    const all = selected.length > 0 && selected.length === selectable.length;
    chkAllText.textContent = all ? "Bỏ chọn tất cả" : "Chọn tất cả";
  }


  // Cập nhật ô "Chọn tất cả"
  if (selectable.length === 0) {
    chkAll.checked = false;
    chkAll.indeterminate = false;
  } else {
    const all = selected.length === selectable.length;
    const some = selected.length > 0 && !all;
    chkAll.checked = all;
    chkAll.indeterminate = some;
  }
}

// =================== Events ===================

// Chỉ xử lý TĂNG / GIẢM / XÓA bằng click
cartEl.addEventListener("click", (e) => {
  const itemEl = e.target.closest(".cart-item");
  if (!itemEl) return;
  const i = +itemEl.dataset.index;

  // ➕ Tăng
  if (e.target.classList.contains("qty-inc")) {
    cart[i].qty++;
    renderCart();
    return;
  }

  // ➖ Giảm
  if (e.target.classList.contains("qty-dec")) {
    if (cart[i].qty > 1) {
      cart[i].qty--;
      renderCart();
    }
    return;
  }

  // 🗑️ Xóa
  if (e.target.classList.contains("remove-btn")) {
    cart.splice(i, 1);
    renderCart();
    return;
  }

  // ⛔️ KHÔNG xử lý checkbox/ô nhập số ở đây
});

// Thay đổi số lượng (nhập tay) & tick từng dòng (checkbox) bằng change
cartEl.addEventListener("change", (e) => {
  const itemEl = e.target.closest(".cart-item");
  if (!itemEl) return;
  const i = +itemEl.dataset.index;

  // số lượng nhập tay
  if (e.target.type === "number") {
    cart[i].qty = Math.max(1, +e.target.value);
    updateSummary(); // chỉ cần cập nhật tổng
    return;
  }

  // tick chọn mua
  if (e.target.classList.contains("sel-chk")) {
    cart[i].selected = !!e.target.checked;
    updateSummary(); // cập nhật tổng + trạng thái "Chọn tất cả"
    return;
  }
});

// Chọn tất cả
if (chkAll) {
  chkAll.addEventListener("change", () => {
    const want = !!chkAll.checked;
    cart.forEach((it) => {
      if (findProductById(it.id)) it.selected = want;
    });
    renderCart(); // render để đồng bộ trạng thái checkbox từng dòng
  });
}

checkoutBtn.addEventListener("click", () => {
  console.log("Checkout data:", cart);
  window.location.href = "./checkout.html";
});

// ===== Single init (duy nhất) =====
(async function init() {
  try {
    await loadProducts();                     // 1) tải products
    const cartData = await loadCartData();    // 2) tải cart
    cart = cartData.map(it => ({ ...it, selected: it.selected !== false }));
    renderCart();

    const bad = cart.filter(it => !findProductById(it.id)).map(it => it.id);
    if (bad.length) console.warn("[CART] ID không khớp products.json:", bad);
  } catch (err) {
    console.error(err);
    cartEl.innerHTML = `<p style="color:red;">Lỗi tải dữ liệu.</p>`;
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (chkAll) { chkAll.checked = false; chkAll.indeterminate = false; }
  }
})();
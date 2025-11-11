// /js/checkout.js
(function () {
  const placeBtn = document.getElementById("placeOrder");
  const modal    = document.getElementById("ckDone");

  // ========== Prefill địa chỉ từ currentUser ==========
  const nameEl   = document.getElementById("addrName");
  const phoneEl  = document.getElementById("addrPhone");
  const emailEl  = document.getElementById("addrEmail");
  const streetEl = document.getElementById("addrStreet");

  let user = null;
  try { user = JSON.parse(localStorage.getItem("currentUser") || "null"); } catch (_) {}

  // ====== Biến & element cho modal chỉnh sửa ======
    const addrEditModal = document.getElementById("addrEditModal");
    const editAddrBtn   = document.getElementById("editAddrBtn");

    // Segmented switch chọn chế độ địa chỉ (thay radio)
    const addrSeg = document.getElementById("addrSeg");

    const accForm = document.getElementById("accAddrForm");
    const newForm = document.getElementById("newAddrForm");

    const accFullNameInp = document.getElementById("acc_fullName_inp");
    const accPhoneInp    = document.getElementById("acc_phone_inp");
    const accEmailInp    = document.getElementById("acc_email_inp");
    const accAddressInp  = document.getElementById("acc_address_inp");

    const newFullNameInp = document.getElementById("new_fullName_inp");
    const newPhoneInp    = document.getElementById("new_phone_inp");
    const newEmailInp    = document.getElementById("new_email_inp");
    const newProvinceInp = document.getElementById("new_province_inp");
    const newDistrictInp = document.getElementById("new_district_inp");
    const newWardInp     = document.getElementById("new_ward_inp");
    const newAddressInp  = document.getElementById("new_address_inp");

    const addrCancelBtn  = document.getElementById("addrCancelBtn");
    const addrSaveBtn    = document.getElementById("addrSaveBtn");

    // Khóa lưu lại lựa chọn địa chỉ cho lần sau (không ghi đè user)
    const CK_ADDR_MODE_KEY = "checkout_addr_mode"; // 'account' | 'new'
const CK_ADDR_DATA_KEY = "checkout_addr";      // {fullName, phone, email, address}

  const fullName = user?.name || "Khách hàng";
  const phone    = user?.phone || "Chưa có số điện thoại";
  const email    = user?.email || "Chưa có email";
  const address  = user?.address || "Chưa có địa chỉ (nhấn Chỉnh sửa để cập nhật)";

  if (nameEl)   nameEl.textContent   = fullName;
  if (phoneEl)  phoneEl.textContent  = "SĐT: " + phone;
  if (emailEl)  emailEl.textContent  = "Email: " + email;
  if (streetEl) streetEl.textContent = address;

  // ====== Ghi đè hiển thị từ lựa chọn đã lưu (nếu có) ======
try {
  const savedMode = localStorage.getItem(CK_ADDR_MODE_KEY);
  const savedAddr = JSON.parse(localStorage.getItem(CK_ADDR_DATA_KEY) || "null");
  if (savedMode === "new" && savedAddr) {
    applyAddressToCard(savedAddr.fullName, savedAddr.phone, savedAddr.email, savedAddr.address);
  }
} catch(_) {}
applyPlaceBtnState(); // cập nhật trạng thái nút Đặt hàng sau khi load

// Mở modal khi bấm "Chỉnh sửa"
    editAddrBtn?.addEventListener("click", () => {
    // Prefill hai form
    // 1) Từ tài khoản (có thể đã sửa nhẹ lần trước)
   // Prefill form "Địa chỉ hiện tại"
    const fillOrPlaceholder = (input, text, placeholderText) => {
    const val = (text || "").trim();
    if (!val || val.toLowerCase().includes("chưa có")) {
        input.value = "";
        input.placeholder = placeholderText;
    } else {
        input.value = val;
        input.placeholder = "";
    }
    };
    
    // Lấy text hiện đang hiển thị ở card bên phải
    const nameTxt   = nameEl?.textContent || user?.name || "";
    const phoneTxt  = (phoneEl?.textContent || "").replace(/^SĐT:\s*/i,"") || user?.phone || "";
    const emailTxt  = (emailEl?.textContent || "").replace(/^Email:\s*/i,"") || user?.email || "";
    const streetTxt = streetEl?.textContent || user?.address || "";

    // Gán theo “placeholder thật” nếu thiếu dữ liệu
    setInputWithPlaceholder(accFullNameInp, nameTxt,   "Họ và tên");
    setInputWithPlaceholder(accPhoneInp,    phoneTxt,  "Số điện thoại");
    setInputWithPlaceholder(accEmailInp,    emailTxt,  "Email");
    setInputWithPlaceholder(accAddressInp,  streetTxt, "Địa chỉ");


      // Tô màu xám cho các ô "chưa có..." giống placeholder
    function markPlaceholderInputs() {
        const inputs = [accFullNameInp, accPhoneInp, accEmailInp, accAddressInp];
        inputs.forEach(inp => {
        if (!inp) return;
        const val = (inp.value || "").trim().toLowerCase();
        if (
            !val ||
            val.includes("chưa có") ||
            val.includes("nhấn chỉnh sửa") ||
            val === "-"
        ) {
            inp.classList.add("placeholder");
        } else {
            inp.classList.remove("placeholder");
        }
        });
    }
    markPlaceholderInputs();


    // 2) Nếu đã lưu địa chỉ mới lần trước thì prefill luôn
    try {
        const savedMode = localStorage.getItem(CK_ADDR_MODE_KEY);
        const savedAddr = JSON.parse(localStorage.getItem(CK_ADDR_DATA_KEY) || "null");
        if (savedMode === "new" && savedAddr) {
        newFullNameInp.value = savedAddr.fullName || "";
        newPhoneInp.value    = savedAddr.phone || "";
        newEmailInp.value    = savedAddr.email || "";
        // tách address cũ nếu có dạng "detail, ward, district, province"
        newAddressInp.value  = savedAddr._detail || "";
        newWardInp.value     = savedAddr._ward || "";
        newDistrictInp.value = savedAddr._district || "";
        newProvinceInp.value = savedAddr._province || "";
        }
        // bật mode theo lần trước
        setAddrMode(savedMode === "new" ? "new" : "account");
    } catch(_) {
        setAddrMode("account");
    }

    openAddrModal(true);
    });

    // Đổi chế độ khi click segmented button
    addrSeg?.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg");
    if (!btn) return;
    addrSeg.querySelectorAll(".seg").forEach(b => {
        const isActive = b === btn;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
    });
    const mode = btn.dataset.mode;
    setAddrMode(mode === "new" ? "new" : "account");
    });
    

    // Hủy modal
    addrCancelBtn?.addEventListener("click", () => openAddrModal(false));

    // Lưu địa chỉ
    addrSaveBtn?.addEventListener("click", () => {
    const mode = getAddrModeEdit();
    if (mode === "account") {
        // validate tối thiểu
        if (!accFullNameInp.value.trim() || !accPhoneInp.value.trim() || !accAddressInp.value.trim()) {
        alert("Vui lòng nhập đủ Họ tên, SĐT và Địa chỉ (ở tab Tài khoản).");
        return;
        }
        const addr = {
        fullName: accFullNameInp.value.trim(),
        phone:    accPhoneInp.value.trim(),
        email:    accEmailInp.value.trim(),
        address:  accAddressInp.value.trim()
        };
        // Cập nhật thẻ hiển thị
        applyAddressToCard(addr.fullName, addr.phone, addr.email, addr.address);
        // Lưu lựa chọn
        try {
        localStorage.setItem(CK_ADDR_MODE_KEY, "account");
        localStorage.removeItem(CK_ADDR_DATA_KEY);
        } catch(_) {}
        openAddrModal(false);
        applyPlaceBtnState();
        return;
    }

    // mode = new
    if (!newFullNameInp.value.trim() || !newPhoneInp.value.trim() || !newAddressInp.value.trim()) {
        alert("Vui lòng nhập đủ Họ tên, SĐT và Địa chỉ chi tiết (ở tab Địa chỉ mới).");
        return;
    }
    const addrStr = [
        newAddressInp.value.trim(),
        newWardInp.value.trim(),
        newDistrictInp.value.trim(),
        newProvinceInp.value.trim()
    ].filter(Boolean).join(", ");

    const addrNew = {
        fullName: newFullNameInp.value.trim(),
        phone:    newPhoneInp.value.trim(),
        email:    newEmailInp.value.trim(),
        address:  addrStr,
        // lưu các phần để lần sau prefill đẹp hơn
        _detail:  newAddressInp.value.trim(),
        _ward:    newWardInp.value.trim(),
        _district:newDistrictInp.value.trim(),
        _province:newProvinceInp.value.trim()
    };

    applyAddressToCard(addrNew.fullName, addrNew.phone, addrNew.email, addrNew.address);
    try {
        localStorage.setItem(CK_ADDR_MODE_KEY, "new");
        localStorage.setItem(CK_ADDR_DATA_KEY, JSON.stringify(addrNew));
    } catch(_) {}
    openAddrModal(false);
    applyPlaceBtnState();
    });


  // Hàm kiểm tra đủ điều kiện đặt hàng: cần SĐT + địa chỉ
  function canPlaceOrder() {
  // Nếu sau này bạn có form chỉnh sửa thì đọc từ input; hiện tại đọc từ text hiển thị
    const phoneTxt  = (phoneEl?.textContent || "").toLowerCase();
    const streetTxt = (streetEl?.textContent || "").toLowerCase();

    const hasPhone  = phoneTxt && !phoneTxt.includes("chưa có");
    const hasAddr   = streetTxt && !streetTxt.includes("chưa có");

    return hasPhone && hasAddr;
    }

    // Áp trạng thái cho nút
    function applyPlaceBtnState() {
        const ok = canPlaceOrder();
        if (!placeBtn) return;
        placeBtn.disabled = !ok;
        placeBtn.classList.toggle("is-disabled", !ok);
    }

// Gọi lần đầu sau khi prefill xong:
applyPlaceBtnState();

  // ========== Segmented Payment ==========
  const segWrap   = document.getElementById("paySeg");
  const payHidden = document.getElementById("payMethod");

  segWrap?.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg");
    if (!btn) return;

    // bật/tắt active + aria-pressed
    segWrap.querySelectorAll(".seg").forEach(b => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-pressed", String(b === btn));
    });

    // cập nhật value ẩn
    if (payHidden) payHidden.value = btn.dataset.value || "cod";
  });

  // ========== Mô phỏng sản phẩm bên trái ==========
  const listEl = document.getElementById("ckProdList");

  // Dữ liệu mô phỏng: lấy từ checkout_items nếu có; nếu không, mock 2 món
  (async function renderProducts(){
    const items = readSelected() || [];
    const products = await loadProducts();
    const rows = (items.length ? items : mockFallback(products)).map(it => {
      const p = products.find(x => String(x.id) === String(it.id)) || {};
      const img = resolveImg(p);
      const name = p.name || "(Sản phẩm)";
      const qty  = it.qty || 1;
      const size = it.size || "–";
      const price = Number(p.price || 0) * qty;
      return `
        <div class="ck-item">
          <div class="thumb"><img src="${img}" alt=""></div>
          <div>
            <div class="name">${name}</div>
            <div class="meta">Size: ${size} · SL: ${qty}</div>
          </div>
          <div><strong>${vnd(price)}</strong></div>
        </div>
      `;
    }).join("");
    listEl.innerHTML = rows || `<p class="muted">Chưa có sản phẩm.</p>`;
  })();

  // Nút Đặt hàng: kiểm tra, rồi mở modal
    placeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!canPlaceOrder()) {
        alert("Vui lòng bổ sung SĐT và Địa chỉ nhận hàng trước khi đặt.");
        return;
    }
    // TODO: sau này thêm logic tạo đơn (localStorage.orders) nếu bạn muốn
    modal?.classList.add("open");
    });

    // Đóng modal khi click ra nền hoặc nhấn Esc (tuỳ chọn)
    modal?.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("open");
    });
    document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modal?.classList.remove("open");
    });

  // ===== Utils =====
  function readSelected(){
    try {
      const arr = JSON.parse(localStorage.getItem("checkout_items") || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }
  async function loadProducts(){
    try{
      const res = await fetch("../mock-data/products.json");
      return await res.json();
    }catch(_){ return []; }
  }
  function resolveImg(p){
    let src = p?.img || p?.image || (Array.isArray(p?.images) ? p.images[0] : "");
    if (!src) return "../images/placeholder.png";
    if (/^https?:\/\//i.test(src)) return src;
    if (src.startsWith("/")) return src;
    if (src.startsWith("../")) return src;
    if (src.startsWith("./")) return src.replace("./", "../");
    return "../" + src;
  }
  function mockFallback(products){
    // lấy 2 món đầu để mô phỏng nếu không có dữ liệu từ cart
    return (products || []).slice(0,2).map(p => ({ id: p.id, qty: 1, size: "M" }));
  }
  function vnd(n){ return (Number(n)||0).toLocaleString("vi-VN") + "₫"; }

  function openAddrModal(show){
  if (!addrEditModal) return;
  if (show) {
    addrEditModal.classList.add("open");
    addrEditModal.removeAttribute("aria-hidden");
  } else {
    addrEditModal.classList.remove("open");
    addrEditModal.setAttribute("aria-hidden", "true");
  }
}
// Đổi UI 2 khối form theo mode
function setAddrMode(mode){
  const isNew = mode === "new";
  accForm.style.display = isNew ? "none" : "block";
  newForm.style.display = isNew ? "block" : "none";
  const radios = document.querySelectorAll('input[name="addrModeEdit"]');
  radios.forEach(r => r.checked = (r.value === (isNew ? "new" : "account")));
}
function getAddrModeEdit(){
  return document.querySelector('input[name="addrModeEdit"]:checked')?.value || "account";
}
// Cập nhật thẻ địa chỉ bên phải
function applyAddressToCard(fullName, phone, email, street){
  if (nameEl)   nameEl.textContent   = fullName || "Khách hàng";
  if (phoneEl)  phoneEl.textContent  = "SĐT: "   + (phone   || "Chưa có số điện thoại");
  if (emailEl)  emailEl.textContent  = "Email: " + (email   || "Chưa có email");
  if (streetEl) streetEl.textContent = street    || "Chưa có địa chỉ (nhấn Chỉnh sửa để cập nhật)";
}

// Set input theo kiểu: nếu text trống/“chưa có…” => dùng placeholder xám
function setInputWithPlaceholder(input, text, placeholderText) {
  const val = (text || "").trim();
  const isMissing = !val || /chưa có/i.test(val);
  input.value = isMissing ? "" : val;
  input.placeholder = isMissing ? placeholderText : "";
}

})();

(function () {
  const $ = (s) => document.querySelector(s);
  const fmtVND = (n) => (n || 0).toLocaleString("vi-VN") + "đ";

  // Đọc products từ <script id="products-data">
  function loadProductsFromEmbedded() {
    const el = document.getElementById("products-data");
    if (!el || !el.textContent || !el.textContent.trim) return [];
    const txt = el.textContent.trim();
    try {
      const json = JSON.parse(txt);
      return Array.isArray(json) ? json : [];
    } catch (err) {
      console.error("Không parse được products-data:", err);
      return [];
    }
  }

  function loadProduct() {
    try {
      // 1) Lấy id
      const id = Number(new URLSearchParams(location.search).get("id"));
      if (!id) throw new Error("Thiếu tham số ?id trên URL");

      // 2) Đọc JSON từ embedded script
      const products = loadProductsFromEmbedded();
      if (!products.length) throw new Error("Chưa có dữ liệu sản phẩm nhúng");

      // 3) Tìm sản phẩm
      const p = products.find((x) => x.id === id);
      if (!p) {
        $("#notFound").hidden = false;
        return;
      }

      // 4) Title + breadcrumb
      document.title = `${p.name} — Fashion Shop`;
      const crumb = $("#crumbCat");
      if (crumb) {
        if (p.category) {
          const url = `./user-category.html?category=${encodeURIComponent(p.category)}`;
          crumb.innerHTML = `<a href="${url}">${p.category}</a>`;
        } else {
          crumb.textContent = "Chi tiết";
        }
      }

      // 5) Gallery
      const hero = $("#pdHero");
      if (hero) {
        hero.src = p.img || "";
        hero.alt = p.name || "";
      }

      const thumbsWrap = document.querySelector(".pd-thumbs");
      if (thumbsWrap) {
        const imgs =
          Array.isArray(p.images) && p.images.length
            ? p.images
            : p.img
            ? [p.img]
            : [];
        thumbsWrap.innerHTML = imgs
          .map(
            (src, i) => `
          <button class="thumb ${i === 0 ? "is-active" : ""}" data-src="${src}">
            <img src="${src}" alt="">
          </button>
        `
          )
          .join("");

        thumbsWrap.querySelectorAll(".thumb").forEach((btn) => {
          btn.addEventListener("click", () => {
            thumbsWrap
              .querySelectorAll(".thumb")
              .forEach((b) => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            if (hero) hero.src = btn.dataset.src;
          });
        });
      }

      // 6) Thông tin
      const titleEl = $(".pd-title");
      if (titleEl) titleEl.textContent = p.name || "";

      const priceEl = $(".pd-price b");
      if (priceEl) priceEl.textContent = fmtVND(p.price);

      const descEl = $(".pd-desc");
      if (descEl) {
        if (Array.isArray(p.description)) {
          descEl.innerHTML = p.description.join("<br>");
        } else if (typeof p.description === "string") {
          descEl.innerHTML = p.description.replace(/\n/g, "<br>");
        } else {
          descEl.textContent = "";
        }
      }

      // 7) Size
      const sizeBlock = $("#pdSizes");
      const sizePills = $("#sizePills");
      let selectedSize = null;

      if (sizeBlock && sizePills && Array.isArray(p.sizes) && p.sizes.length) {
        sizeBlock.hidden = false;

        sizePills.innerHTML = p.sizes
          .map(
            (s) => `
          <label class="sp-pill">
            <input type="radio" name="size" value="${s}">
            <span>${s}</span>
          </label>
        `
          )
          .join("");

        sizePills.addEventListener("change", (e) => {
          if (e.target && e.target.name === "size") {
            sizePills
              .querySelectorAll(".sp-pill")
              .forEach((lab) => lab.classList.remove("is-selected"));

            const lab = e.target.closest(".sp-pill");
            if (lab) lab.classList.add("is-selected");

            selectedSize = e.target.value;

            const addBtn = $("#btnAddCart");
            if (addBtn) addBtn.disabled = false;
          }
        });
      } else {
        const addBtn = $("#btnAddCart");
        if (addBtn) addBtn.disabled = false;
      }

      // 8) Meta (hiện đang để trống, tùy bạn dùng sau)
      const meta = $("#pdMeta");
      if (meta) meta.innerHTML = "";

      // 9) Số lượng + nút tăng/giảm (chống bind trùng)
      const qty = $("#qtyInput");
      if (qty) {
        const incOld = document.querySelector(".btn-inc");
        const decOld = document.querySelector(".btn-dec");
        if (incOld && decOld) {
          const incBtn = incOld.cloneNode(true);
          const decBtn = decOld.cloneNode(true);
          incOld.replaceWith(incBtn);
          decOld.replaceWith(decBtn);

          incBtn.addEventListener("click", () => {
            qty.value = String((+qty.value || 1) + 1);
          });
          decBtn.addEventListener("click", () => {
            qty.value = String(Math.max(1, (+qty.value || 1) - 1));
          });
        }
      }

      // 10) Toast
      function showToast(msg) {
        const t = document.getElementById("toast");
        if (!t) return;
        t.textContent = msg;
        t.hidden = false;
        requestAnimationFrame(() => t.classList.add("show"));
        setTimeout(() => {
          t.classList.remove("show");
          setTimeout(() => (t.hidden = true), 250);
        }, 1500);
      }

      // 11) Badge giỏ (tuỳ chọn)
      const cartBadge = document.querySelector(".cart-badge");
      let cartCount = Number(cartBadge?.textContent || 0);

      // 12) Thêm giỏ (có chặn đăng nhập)
      const addBtn = $("#btnAddCart");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          // bắt buộc đăng nhập trước khi dùng giỏ
          let u = null;
          try {
            u = JSON.parse(localStorage.getItem("currentUser") || "null");
          } catch (e) {
            u = null;
          }
          if (!u) {
            location.href = `./login.html?next=${encodeURIComponent("cart.html")}`;
            return;
          }

          const qtyN = +(qty?.value || 1) || 1;

          // Chưa chọn size → nhắc và rung vùng size
          if (Array.isArray(p.sizes) && p.sizes.length && !selectedSize) {
            showToast("Vui lòng chọn size trước");
            const group = document.querySelector(".size-group");
            if (group) {
              group.classList.remove("shake");
              void group.offsetWidth;
              group.classList.add("shake");
            }
            return;
          }

          // Hiệu ứng nút + thông báo
          addBtn.classList.add("is-pressed");
          showToast(`Đã thêm ${qtyN} sản phẩm vào giỏ`);

          // TODO: logic add-to-cart thật (localStorage/API) bạn có thể bổ sung sau

          // Reset size + nút sau 600ms
          setTimeout(() => {
            addBtn.classList.remove("is-pressed");
            if (Array.isArray(p.sizes) && p.sizes.length) {
              const checked = document.querySelector('input[name="size"]:checked');
              if (checked) checked.checked = false;
              sizePills
                .querySelectorAll(".sp-pill")
                .forEach((lab) => lab.classList.remove("is-selected"));
              addBtn.disabled = true;
              selectedSize = null;
            }
          }, 600);
        });
      }

      // 13) Show content
      const root = $("#pdRoot");
      if (root) root.hidden = false;
    } catch (err) {
      console.error("Lỗi loadProduct:", err);
      const nf = $("#notFound");
      if (nf) nf.hidden = false;
    }
  }

  loadProduct();
})();

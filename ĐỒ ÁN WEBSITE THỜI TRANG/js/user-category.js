// --- Load dữ liệu sản phẩm từ JSON nhúng ---
let PRODUCTS = [];

// đọc từ <script id="products-data" type="application/json">
function loadProducts() {
  const el = document.getElementById("products-data");
  if (!el || !el.textContent || !el.textContent.trim) {
    PRODUCTS = [];
    return;
  }
  const txt = el.textContent.trim();
  try {
    const json = JSON.parse(txt);
    PRODUCTS = Array.isArray(json) ? json : [];
  } catch (err) {
    console.error("Không parse được products-data:", err);
    PRODUCTS = [];
  }
}

// --- DOM refs ---
const $ = s => document.querySelector(s);
const grid = $("#grid");
const pagesWrap = $("#pages");
const prevBtn = $("#prev");
const nextBtn = $("#next");
const resultCount = $("#resultCount");
const catTitle = $("#catTitle");
const crumbCat = $("#crumbCat");

// --- Read category from URL ---
const params = new URLSearchParams(location.search);
const currentCat = params.get("category") || "";

document.querySelectorAll(".cat-tabs a").forEach(a => {
  const tab = a.dataset.tab;
  const isAll = !currentCat && tab === "all";
  const isMatch = currentCat && tab === currentCat;
  if (isAll || isMatch) a.classList.add("active");
});

catTitle.textContent = currentCat || "Tất cả sản phẩm";
crumbCat.textContent = currentCat || "Tất cả";

// --- State ---
const state = {
  perPage: 6,
  page: 1,
  items: [],
};

// --- Helpers ---
function formatVND(n) {
  return (n || 0).toLocaleString("vi-VN") + "đ";
}

function filterByCategory(list) {
  return currentCat ? list.filter(p => p.category === currentCat) : list;
}

function paginate(list) {
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / state.perPage));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.perPage;
  const slice = list.slice(start, start + state.perPage);
  return { total, totalPages, slice };
}

function renderCards(list) {
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = `<p>Không tìm thấy sản phẩm nào.</p>`;
    return;
  }
  grid.innerHTML = list
    .map(
      (p) => `
    <article class="card">
      <div class="thumb">
        <img src="${p.img}" alt="${p.name}">
      </div>
      <div class="info">
        <div class="name">
          <a href="./product-detail.html?id=${encodeURIComponent(p.id)}">
            ${p.name}
          </a>
        </div>
        <div class="price"><b>${formatVND(p.price)}</b></div>
        <div class="actions">
          <a href="./product-detail.html?id=${encodeURIComponent(
            p.id
          )}" class="btn view-detail">Xem chi tiết</a>
        </div>
      </div>
    </article>
  `
    )
    .join("");
}

function renderPagination(totalPages) {
  if (!pagesWrap) return;
  pagesWrap.innerHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    const a = document.createElement("a");
    a.href = "#";
    a.className = "page" + (i === state.page ? " active" : "");
    a.textContent = i;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      state.page = i;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    pagesWrap.appendChild(a);
  }
  if (prevBtn) prevBtn.classList.toggle("disabled", state.page <= 1);
  if (nextBtn) nextBtn.classList.toggle("disabled", state.page >= totalPages);
}

// --- Main render ---
function render() {
  const src = filterByCategory(PRODUCTS);
  state.items = src;
  if (resultCount) resultCount.textContent = src.length;
  const { totalPages, slice } = paginate(src);
  renderCards(slice);
  renderPagination(totalPages);
}

// --- Init ---
function init() {
  loadProducts();
  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// --- Events ---
prevBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  if (state.page > 1) {
    state.page--;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

nextBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  state.page++;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn) return;
  btn.textContent = "Đã thêm ✓";
  btn.disabled = true;
});

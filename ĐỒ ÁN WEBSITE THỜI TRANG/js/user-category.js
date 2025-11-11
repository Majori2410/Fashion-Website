// --- Load dữ liệu sản phẩm từ JSON ---
let PRODUCTS = [];

async function loadProducts() {
  // user-category.html nằm trong /pages, nên dùng đường dẫn tương đối:
  const res = await fetch("../mock-data/products.json");
  PRODUCTS = await res.json();
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

document.querySelectorAll(".cat-tabs a").forEach(a=>{
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
function formatVND(n){ return n.toLocaleString("vi-VN")+"đ"; }

function filterByCategory(list){
  return currentCat ? list.filter(p=>p.category===currentCat) : list;
}

function paginate(list){
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / state.perPage));
  if(state.page > totalPages) state.page = totalPages;
  const start = (state.page-1) * state.perPage;
  const slice = list.slice(start, start + state.perPage);
  return { total, totalPages, slice };
}

function renderCards(list){
  grid.innerHTML = list.map(p=>`
    <article class="card">
      <div class="thumb">
        <img src="${p.img}" alt="${p.name}">
      </div>
      <div class="info">
        <div class="name"><a href="./product-detail.html?id=${p.id}">${p.name}</a></div>
        <div class="price"><b>${formatVND(p.price)}</b></div>
        <div class="actions">
          <a href="./product-detail.html?id=${p.id}" class="btn view-detail">Xem chi tiết</a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderPagination(totalPages){
  pagesWrap.innerHTML = "";
  for(let i=1;i<=totalPages;i++){
    const a = document.createElement("a");
    a.href="#";
    a.className = "page"+(i===state.page?" active":"");
    a.textContent = i;
    a.addEventListener("click",(e)=>{e.preventDefault(); state.page=i; render(); window.scrollTo({top:0,behavior:"smooth"});});
    pagesWrap.appendChild(a);
  }
  prevBtn.classList.toggle("disabled", state.page<=1);
  nextBtn.classList.toggle("disabled", state.page>=totalPages);
}

// --- Main render ---
function render(){
  const src = filterByCategory(PRODUCTS);
  state.items = src;
  resultCount.textContent = src.length;
  const { totalPages, slice } = paginate(src);
  renderCards(slice);
  renderPagination(totalPages);
}

(async function init(){
  await loadProducts();
  render();
})();

// --- Events ---
prevBtn?.addEventListener("click",(e)=>{
  e.preventDefault(); if(state.page>1){ state.page--; render(); window.scrollTo({top:0,behavior:"smooth"}); }
});
nextBtn?.addEventListener("click",(e)=>{
  e.preventDefault(); state.page++; render(); window.scrollTo({top:0,behavior:"smooth"});
});
document.addEventListener("click",(e)=>{
  const btn = e.target.closest("[data-add]");
  if(!btn) return;
  btn.textContent = "Đã thêm ✓"; btn.disabled = true;
});

(function(){
  const $  = (s, sc=document) => sc.querySelector(s);
  const $$ = (s, sc=document) => Array.from(sc.querySelectorAll(s));

  const gridEl  = $("#productGrid");
  const infoEl  = $("#searchInfo");
  const pagEl   = $("#pagination");

  const fmtVND = (n) => (n || 0).toLocaleString("vi-VN") + "đ";

  function loadProductsFromEmbedded(){
    const el = document.getElementById("products-data");
    if (!el || !el.textContent || !el.textContent.trim) return [];
    try {
      const data = JSON.parse(el.textContent.trim());
      return Array.isArray(data) ? data : [];
    } catch (err){
      console.error("Không parse được products-data:", err);
      return [];
    }
  }

  function parseFilters(){
    const params   = new URLSearchParams(location.search);
    const q        = (params.get("q") || "").trim();
    const category = (params.get("category") || "").trim();
    const minRaw   = (params.get("min") || "").trim();
    const maxRaw   = (params.get("max") || "").trim();
    let   page     = parseInt(params.get("page") || "1", 10);
    if (isNaN(page) || page < 1) page = 1;

    const min = minRaw ? Number(minRaw) : null;
    const max = maxRaw ? Number(maxRaw) : null;

    return { q, category, min, max, page };
  }

  function applyFilters(products, filters){
    let list = [...products];
    const { q, category, min, max } = filters;

    if (q){
      const qLower = q.toLowerCase();
      list = list.filter(p => (p.name || "").toLowerCase().includes(qLower));
    }
    if (category){
      list = list.filter(p => p.category === category);
    }
    if (min != null && !Number.isNaN(min)){
      list = list.filter(p => (p.price || 0) >= min);
    }
    if (max != null && !Number.isNaN(max)){
      list = list.filter(p => (p.price || 0) <= max);
    }
    return list;
  }

  function describeFilters(filters, total){
    const parts = [];
    if (filters.q) parts.push(`Tên chứa “${filters.q}”`);
    if (filters.category) parts.push(`Loại: ${filters.category}`);
    if (filters.min != null) parts.push(`Giá từ ${fmtVND(filters.min)}`);
    if (filters.max != null) parts.push(`Giá đến ${fmtVND(filters.max)}`);

    if (!parts.length){
      return total
        ? `Tìm thấy ${total} sản phẩm.`
        : `Không tìm thấy sản phẩm nào.`;
    }
    return total
      ? `Tìm thấy ${total} sản phẩm với điều kiện: ${parts.join(" • ")}.`
      : `Không tìm thấy sản phẩm nào với điều kiện: ${parts.join(" • ")}.`;
  }

  function renderGrid(items){
    if (!items.length){
      gridEl.innerHTML = `<p class="empty">Không có sản phẩm phù hợp.</p>`;
      return;
    }
    gridEl.innerHTML = items.map(p => `
      <article class="card">
        <div class="thumb">
          <a href="./product-detail.html?id=${encodeURIComponent(p.id)}" aria-label="${p.name}">
            <img src="${p.img || "https://picsum.photos/seed/fallback/600/450"}" alt="${p.name}">
          </a>
        </div>
        <div class="info">
          <div class="name">
            <a href="./product-detail.html?id=${encodeURIComponent(p.id)}">${p.name}</a>
          </div>
          <div class="price"><b>${fmtVND(p.price)}</b></div>
        </div>
      </article>
    `).join("");
  }

  function renderPagination(total, filters, perPage){
    pagEl.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    let page = filters.page;
    if (page > totalPages) page = totalPages;

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "page-btn" + (i === page ? " is-active" : "");
      btn.textContent = i;
      btn.addEventListener("click", () => {
        // chỉ đổi trang phía client, không reload lại
        doRender({ ...filters, page: i });
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      pagEl.appendChild(btn);
    }
  }

  const ALL = loadProductsFromEmbedded();
  const PER_PAGE = 6;

  function doRender(filters){
    const filtered = applyFilters(ALL, filters);
    const total    = filtered.length;

    if (infoEl){
      infoEl.textContent = describeFilters(filters, total);
    }

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    let page = filters.page;
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * PER_PAGE;
    const slice = filtered.slice(start, start + PER_PAGE);

    renderGrid(slice);
    renderPagination(total, { ...filters, page }, PER_PAGE);
  }

  function init(){
    if (!gridEl || !infoEl || !pagEl){
      console.warn("Thiếu phần tử DOM cần thiết cho search page");
      return;
    }
    const filters = parseFilters();
    if (!ALL.length){
      infoEl.textContent = "Không tải được dữ liệu sản phẩm.";
      gridEl.innerHTML   = `<p class="empty">Không có dữ liệu để hiển thị.</p>`;
      return;
    }
    doRender(filters);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

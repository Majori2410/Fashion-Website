// /js/auth-ui.js
(function () {
  const accLink = document.querySelector(".account-login"); // <a class="actions account-login">
  if (!accLink) return;

  let user = null;
  try { user = JSON.parse(localStorage.getItem("currentUser") || "null"); } catch (_) {}

  const text = accLink.querySelector(".account-text");
  const avatar = accLink.querySelector(".avatar");

  if (user) {
    // Hiển thị tên
    if (text) text.textContent = user.name || user.email || "Tài khoản";
    accLink.href = "./orders.html";

    // Avatar với ký tự đầu
    if (avatar) {
      avatar.classList.remove("anon");
      avatar.classList.add("with-initial");
      avatar.textContent = ((user.name || user.email || "U")[0] || "U").toUpperCase();
    }

    // === Dropdown menu ===
    if (!document.getElementById("accMenu")) {
      const wrap = document.createElement("div");
      wrap.className = "acc-wrap";
      accLink.replaceWith(wrap);
      wrap.appendChild(accLink);

      const menu = document.createElement("div");
      menu.id = "accMenu";
      menu.className = "acc-menu";
      menu.innerHTML = `
        <a href="./profile.html" class="mi">Hồ sơ</a>
        <button type="button" class="mi danger" id="btnLogout">Đăng xuất</button>
      `;
      wrap.appendChild(menu);

      // toggle
      wrap.addEventListener("click", (e) => {
        if (e.target.closest(".account-login")) {
          e.preventDefault();
          menu.classList.toggle("open");
        }
      });
      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) menu.classList.remove("open");
      });

      // logout
      menu.querySelector("#btnLogout")?.addEventListener("click", function (e) {
        e.preventDefault();
        localStorage.removeItem("currentUser");
        location.reload();
      });
    }
  } else {
    // Chưa đăng nhập
    if (text) text.textContent = "Đăng nhập";
    const page = (location.pathname.split("/").pop() || "index.html") + location.search;
    accLink.href = `./login.html?next=${encodeURIComponent(page)}`;
    if (avatar) {
      avatar.classList.add("anon");
      avatar.classList.remove("with-initial");
      avatar.textContent = "";
    }
  }
})();

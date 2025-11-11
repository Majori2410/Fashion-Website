// js/login.js
(function () {
  const form = document.getElementById("loginForm");
  const err  = document.getElementById("err");
  const emailEl = document.getElementById("email");
  const passEl  = document.getElementById("password");

  // Nếu đã đăng nhập và có ?next → chuyển luôn
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (u) {
      const next = safeNext(getNext() || "index.html");
      // tránh vòng lặp tự quay lại login
      if (!/login\.html$/i.test(next)) location.href = `./${next}`;
    }
  } catch (_) {}

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    err.textContent = "";

    const email = (emailEl?.value || "").trim();
    const pass  = (passEl?.value || "").trim();

    if (!email || !pass) {
      err.textContent = "Vui lòng nhập đầy đủ email và mật khẩu.";
      return;
    }

    // Demo: nhận mọi email/mật khẩu, “đăng nhập” bằng localStorage
    const name = email.split("@")[0];
    const currentUser = { id: email, name, email };

    try {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } catch (_) {
      err.textContent = "Trình duyệt đang chặn lưu trữ. Hãy bật Storage/LocalStorage.";
      return;
    }

    const next = safeNext(getNext() || "index.html");
    location.href = `./${next}`;
  });

  function getNext() {
    const p = new URLSearchParams(location.search);
    return p.get("next"); // ví dụ: cart.html hoặc user-category.html?category=A
  }

  // Chỉ cho phép điều hướng tới file trong cùng thư mục (tránh URL lạ)
  function safeNext(n) {
    if (!n) return "index.html";
    // Cho phép dạng "xxx.html" hoặc "xxx.html?query..."
    if (/^[a-z0-9\-_]+\.html(\?.*)?$/i.test(n)) return n;
    return "index.html";
  }
})();

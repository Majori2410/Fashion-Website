(function () {
  const $ = (s, sc) => (sc || document).querySelector(s);
  const $$ = (s, sc) => Array.from((sc || document).querySelectorAll(s));

  const tbody = $('#userTbody');
  const search = $('#userSearch');
  const clearBtn = $('#btnClearSearch');
  const countEl = $('#userCount');
  const toastEl = $('#toast');

  // ===== DỮ LIỆU FALLBACK (dùng khi không fetch được JSON, ví dụ thầy mở file://) =====
  const FALLBACK_USERS = [
    {
      id: 1,
      fullName: "Nguyễn Minh An",
      email: "an.nguyen@example.com",
      role: "admin",
      status: "active",
      createdAt: "2024-11-12T08:30:00Z",
      lastLogin: "2025-10-30T13:05:00Z"
    },
    {
      id: 2,
      fullName: "Trần Hải Yến",
      email: "yen.tran@example.com",
      role: "staff",
      status: "active",
      createdAt: "2024-12-01T02:15:00Z",
      lastLogin: "2025-11-07T09:42:00Z"
    },
    {
      id: 3,
      fullName: "Phạm Quốc Bảo",
      email: "bao.pham@example.com",
      role: "staff",
      status: "locked",
      createdAt: "2025-01-22T10:00:00Z",
      lastLogin: "2025-07-01T15:20:00Z"
    },
    {
      id: 4,
      fullName: "Lê Thu Hà",
      email: "ha.le@example.com",
      role: "customer",
      status: "active",
      createdAt: "2025-02-05T06:40:00Z",
      lastLogin: "2025-11-08T21:10:00Z"
    },
    {
      id: 5,
      fullName: "Đỗ Thanh Tùng",
      email: "tung.do@example.com",
      role: "customer",
      status: "active",
      createdAt: "2025-03-18T03:25:00Z",
      lastLogin: "2025-11-09T08:55:00Z"
    }
  ];

  let users = [];
  let filtered = [];

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('vi-VN');
  };

  function toast(msg, ms = 1600) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  function render(list) {
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="muted">Không có người dùng nào.</td></tr>';
    } else {
      tbody.innerHTML = list.map(u => {
        const badge = u.status === 'active'
          ? '<span class="badge ok">Đang hoạt động</span>'
          : '<span class="badge locked">Đã khóa</span>';
        const lockLabel = u.status === 'active' ? 'Khóa' : 'Mở khóa';
        const lockClass = u.status === 'active' ? 'warn' : 'primary';
        return `
          <tr data-id="${u.id}">
            <td>${u.id}</td>
            <td>${u.fullName}</td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td>${badge}</td>
            <td>${fmtDate(u.createdAt)}</td>
            <td>
              <div class="actions">
                <button class="icon-btn xs" data-action="reset">Đổi mật khẩu</button>
                <button class="icon-btn xs ${lockClass}" data-action="lock">${lockLabel}</button>
              </div>
            </td>
          </tr>`;
      }).join('');
    }

    // Bind hành động
    $$('#userTbody [data-action]').forEach(btn => {
      btn.addEventListener('click', onRowAction);
    });

    if (countEl) countEl.textContent = `Tổng: ${list.length} user(s)`;
  }

  function applySearch() {
    const q = (search?.value || '').trim().toLowerCase();
    if (!q) filtered = users.slice();
    else {
      filtered = users.filter(u =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
      );
    }
    render(filtered);
  }

  function onRowAction(e) {
    const btn = e.currentTarget;
    const tr = btn.closest('tr');
    const id = tr?.getAttribute('data-id');
    const action = btn.getAttribute('data-action');
    if (!id) return;

    const idx = filtered.findIndex(u => String(u.id) === String(id));
    if (idx < 0) return;

    if (action === 'reset') {
      toast(`Đã gửi liên kết đổi mật khẩu tới ${filtered[idx].email}`);
      btn.animate([{ opacity: .6 }, { opacity: 1 }], { duration: 220 });
    }

    if (action === 'lock') {
      const u = filtered[idx];
      u.status = (u.status === 'active') ? 'locked' : 'active';
      const gIdx = users.findIndex(x => String(x.id) === String(id));
      if (gIdx >= 0) users[gIdx].status = u.status;
      applySearch();
      toast(u.status === 'active'
        ? `Đã mở khóa tài khoản #${u.id}`
        : `Đã khóa tài khoản #${u.id}`);
    }
  }

  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(applySearch, 120);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!search) return;
      search.value = '';
      applySearch();
      search.focus();
    });
  }

    async function init() {
      try {
        const res = await fetch('../mock-data/users.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        // Nếu data không phải mảng hoặc mảng rỗng => fallback
        if (!Array.isArray(data) || !data.length) {
          console.warn('users.json rỗng hoặc sai định dạng, dùng FALLBACK_USERS');
          users = FALLBACK_USERS.slice();
        } else {
          users = data;
        }
      } catch (err) {
        console.error('Lỗi khi tải users.json, dùng FALLBACK_USERS:', err);
        users = FALLBACK_USERS.slice();

        // 👉 Nếu đang chạy qua http/https (localhost, server) thì mới báo toast.
        // 👉 Nếu là file:// (thầy mở trực tiếp từ thư mục) thì im lặng, tránh popup khó hiểu.
        if (location.protocol === 'http:' || location.protocol === 'https:') {
          toast('Không thể tải users.json, đang dùng dữ liệu mẫu.');
        }
      }

      filtered = users.slice();
      render(filtered);
    }

  document.addEventListener('DOMContentLoaded', init);
})();

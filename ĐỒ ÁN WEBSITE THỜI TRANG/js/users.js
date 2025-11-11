(function () {
  const $ = (s, sc) => (sc || document).querySelector(s);
  const $$ = (s, sc) => Array.from((sc || document).querySelectorAll(s));

  const tbody = $('#userTbody');
  const search = $('#userSearch');
  const clearBtn = $('#btnClearSearch');
  const countEl = $('#userCount');
  const toastEl = $('#toast');

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
      const res = await fetch('../mock-data/users.json');
      users = await res.json();
      filtered = users.slice();
      render(filtered);
    } catch (err) {
      console.error(err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="muted">Không thể tải users.json</td></tr>';
      toast('Không thể tải users.json');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

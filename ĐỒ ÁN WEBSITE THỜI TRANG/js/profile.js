(function(){
  // 1) Bắt buộc đăng nhập
  let user = null;
  try { user = JSON.parse(localStorage.getItem("currentUser")||"null"); } catch(_){}
  if(!user){
    const next = "./profile.html";
    location.href = `./login.html?next=${encodeURIComponent(next)}`;
    return;
  }

  // 2) Refs
  const $ = (id)=>document.getElementById(id);
  const fName = $('fName'), fEmail = $('fEmail'), fPhone = $('fPhone'),
        fDob = $('fDob'), fAddress = $('fAddress'), fAvatar = $('fAvatar');
  const avatarImg = $('avatarImg'), avatarInitial = $('avatarInitial');

  // 3) Prefill
  function applyAvatarView(url, nameLike){
    if(url){
      avatarImg.src = url; avatarImg.hidden = false;
      avatarInitial.hidden = true;
    }else{
      avatarImg.hidden = true;
      avatarInitial.hidden = false;
      const ch = (nameLike||'U').trim()[0] || 'U';
      avatarInitial.textContent = ch.toUpperCase();
    }
  }
  function prefill(){
    fName.value    = user.name    || '';
    fEmail.value   = user.email   || '';
    fPhone.value   = user.phone   || '';
    fDob.value     = user.dob     || '';
    fAddress.value = user.address || '';
    fAvatar.value  = user.avatar  || '';
    applyAvatarView(user.avatar, user.name||user.email);
  }
  prefill();

  // 4) Live preview avatar
  fAvatar.addEventListener('input', ()=> applyAvatarView(fAvatar.value.trim(), fName.value||fEmail.value));

  // 5) Hủy
  $('btnCancel').addEventListener('click', ()=> history.back());

  // 6) Lưu
  document.getElementById('profileForm').addEventListener('submit', (e)=>{
    e.preventDefault();

    const updated = {
      ...user,
      name: fName.value.trim(),
      email: fEmail.value.trim(),               // giữ làm id đăng nhập (đang disabled)
      phone: fPhone.value.trim(),
      dob: fDob.value,
      address: fAddress.value.trim(),
      avatar: fAvatar.value.trim()
    };

    localStorage.setItem('currentUser', JSON.stringify(updated));

    // Nếu bạn có danh sách users khác trong localStorage thì có thể đồng bộ tại đây (tuỳ dự án)
    // try {
    //   const users = JSON.parse(localStorage.getItem('users')||'[]');
    //   const i = users.findIndex(u => String(u.email) === String(user.email));
    //   if(i>-1){ users[i] = {...users[i], ...updated}; localStorage.setItem('users', JSON.stringify(users)); }
    // } catch(_) {}

    alert('Đã lưu hồ sơ!');
window.location.href = './index.html';   // hoặc './index.html' nếu profile.html cùng cấp
  });
})();

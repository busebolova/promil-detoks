/* ===========================
   PROMIL DETOKS – profil.js
   Profil Sayfası Mantığı
   =========================== */
'use strict';

/* ── Hızlı Giriş Formu (authRequired içinde) ── */
function initQuickLoginForm() {
  const form = document.getElementById('quickLoginForm');
  if (!form) return;

  // Input focus efekti
  ['quickEmail', 'quickPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', () => { el.style.borderColor = 'var(--accent)'; el.style.boxShadow = '0 0 0 3px rgba(34,197,94,.1)'; });
    el.addEventListener('blur',  () => { el.style.borderColor = 'var(--gray-200)'; el.style.boxShadow = ''; });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('quickLoginBtn');
    const errorEl = document.getElementById('quickLoginError');

    if (errorEl) errorEl.style.display = 'none';

    const email    = document.getElementById('quickEmail')?.value.trim();
    const password = document.getElementById('quickPassword')?.value;

    if (!email || !password) {
      if (errorEl) { errorEl.textContent = 'E-posta ve şifre zorunludur.'; errorEl.style.display = 'flex'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Giriş yapılıyor...'; }

    const result = await Auth.login(email, password);

    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Giriş Yap'; }

    if (result.success) {
      Auth.setUser(result.user, result.token);
      showProfilContent(result.user);
      showToast('Hoş geldiniz, ' + (result.user.firstName || '') + '!');
    } else {
      if (errorEl) { errorEl.textContent = result.error || 'Giriş başarısız.'; errorEl.style.display = 'flex'; }
    }
  });
}

/* ── Sipariş Durumu Etiketleri ── */
const ORDER_STATUS = {
  pending:    { label: 'Bekliyor',       icon: 'clock' },
  processing: { label: 'Hazırlanıyor',   icon: 'package' },
  shipped:    { label: 'Kargoda',        icon: 'truck' },
  delivered:  { label: 'Teslim Edildi',  icon: 'check-circle' },
  cancelled:  { label: 'İptal Edildi',   icon: 'x-circle' },
};

/* ── Ürün Görseli Haritası ── */
const PRODUCT_IMAGES = {
  'toz-tekli': 'images/tekli.jpeg',
  'toz-uclu':  'images/3lu.jpeg',
  'toz-stand': 'images/20stand.jpeg',
};

function getProductImage(name) {
  if (!name) return 'images/tekli.jpeg';
  const n = name.toLowerCase();
  if (n.includes('stand') || n.includes('20')) return PRODUCT_IMAGES['toz-stand'];
  if (n.includes('üçlü') || n.includes('uclu') || n.includes('3')) return PRODUCT_IMAGES['toz-uclu'];
  return PRODUCT_IMAGES['toz-tekli'];
}

/* ── Tarih Formatla ── */
function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  } catch { return iso; }
}

/* ── HTML Escape ── */
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Toast Bildirimi ── */
function showToast(msg, type) {
  type = type || 'success';
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${type === 'success' ? 'var(--accent-dark)' : '#dc2626'};
    color:#fff;padding:12px 20px;border-radius:12px;
    font-size:.85rem;font-weight:600;
    box-shadow:0 8px 32px rgba(0,0,0,.2);
    animation:slideInToast .3s ease;
    display:flex;align-items:center;gap:8px;
    max-width:320px;
  `;
  t.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}</svg>${esc(msg)}`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = 'all .3s ease'; }, 3000);
  setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 3400);
}

/* ── Profil UI Doldur ── */
function populateProfileUI(user) {
  if (!user) return;

  // Avatar & başlık
  const avatar = document.getElementById('profilAvatar');
  if (avatar) avatar.textContent = Auth.getInitials(user);

  const fullName = document.getElementById('profilFullName');
  if (fullName) fullName.textContent = Auth.getFullName(user);

  const emailEl = document.getElementById('profilEmail');
  if (emailEl) emailEl.textContent = user.email || '';

  // Profil formu
  const fields = {
    pfFirstName: user.firstName || '',
    pfLastName:  user.lastName  || '',
    pfEmail:     user.email     || '',
    pfPhone:     user.phone     || '',
    pfAddress:   user.address?.line     || '',
    pfCity:      user.address?.city     || '',
    pfDistrict:  user.address?.district || '',
    pfZip:       user.address?.zip      || '',
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
}

/* ── Siparişleri Render Et ── */
function renderOrders(orders) {
  const container = document.getElementById('ordersContainer');
  if (!container) return;

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="orders-empty">
        <div class="orders-empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--gray-400);">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        </div>
        <h4>Henüz siparişiniz yok</h4>
        <p>İlk siparişinizi vermek için ürünlerimize göz atın.</p>
        <a href="index.html#urunler" class="btn btn-primary" style="margin-top:8px;font-size:.85rem;padding:11px 24px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Ürünlere Git
        </a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
    const items = order.items || [{ name: order.product || 'Promil Detoks', price: order.total, qty: 1 }];

    const itemsHtml = items.map(item => `
      <div class="order-item-row">
        <img class="order-item-img" src="${esc(getProductImage(item.name))}" alt="${esc(item.name)}" loading="lazy" />
        <span class="order-item-name">${esc(item.name)}</span>
        <span class="order-item-qty">x${item.qty || 1}</span>
        <span class="order-item-price">₺${parseFloat(item.price || 0).toLocaleString('tr-TR')}</span>
      </div>
    `).join('');

    const trackingHtml = (order.status === 'shipped' && order.trackingNo) ? `
      <div class="order-tracking">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        Kargo Takip No: <strong>${esc(order.trackingNo)}</strong>
      </div>
    ` : '';

    return `
      <div class="order-card">
        <div class="order-card-top">
          <div class="order-id-date">
            <span class="order-id">#${esc(String(order.id || ''))}</span>
            <span class="order-date">${formatDate(order.createdAt)}</span>
          </div>
          <span class="order-status-badge ${esc(order.status || 'pending')}">
            ${esc(status.label)}
          </span>
        </div>
        <div class="order-items">${itemsHtml}</div>
        ${trackingHtml}
        <div class="order-card-bottom">
          <span class="order-total-label">Toplam Tutar</span>
          <span class="order-total-amount">₺${parseFloat(order.total || 0).toLocaleString('tr-TR')}</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ── Siparişleri Yükle ── */
async function loadOrders() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="orders-loading">
      <div class="loading-spinner"></div>
      <p>Siparişler yükleniyor...</p>
    </div>
  `;

  const orders = await Auth.getOrders();
  renderOrders(orders);
}

/* ── Tab Yönetimi ── */
function initTabs() {
  const tabs = document.querySelectorAll('.profil-tab');
  const contents = document.querySelectorAll('.profil-tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const content = document.getElementById('tab-' + target);
      if (content) content.classList.add('active');

      // URL hash güncelle
      history.replaceState(null, '', '#' + target);

      // Siparişler sekmesi açıldığında yükle
      if (target === 'orders') loadOrders();
    });
  });

  // URL hash'e göre sekme aç
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById('tab-' + hash)) {
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    const targetTab = document.querySelector(`.profil-tab[data-tab="${hash}"]`);
    if (targetTab) targetTab.classList.add('active');
    document.getElementById('tab-' + hash).classList.add('active');
    if (hash === 'orders') loadOrders();
  }
}

/* ── Profil Formu ── */
function initProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const successEl = document.getElementById('profileSuccess');
    const errorEl   = document.getElementById('profileError');

    if (successEl) successEl.style.display = 'none';
    if (errorEl)   errorEl.style.display   = 'none';

    const firstName = document.getElementById('pfFirstName')?.value.trim();
    const lastName  = document.getElementById('pfLastName')?.value.trim();
    const phone     = document.getElementById('pfPhone')?.value.trim();

    if (!firstName || !lastName) {
      if (errorEl) { errorEl.textContent = 'Ad ve soyad zorunludur.'; errorEl.style.display = 'flex'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

    const result = await Auth.updateProfile({ firstName, lastName, phone });

    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Kaydet'; }

    if (result.success) {
      Auth.setUser(result.user, Auth.getToken());
      populateProfileUI(result.user);
      updateNavbarUserUI();
      if (successEl) successEl.style.display = 'flex';
      showToast('Profil bilgileri güncellendi!');
      setTimeout(() => { if (successEl) successEl.style.display = 'none'; }, 4000);
      // Profil güncelleme bildirimi gönder
      try {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'profile_update',
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            email: result.user.email,
            phone: result.user.phone || '',
            changedFields: ['ad', 'soyad', 'telefon'],
          }),
        }).catch(() => {});
      } catch (e) {}
    } else {
      if (errorEl) { errorEl.textContent = result.error || 'Bir hata oluştu.'; errorEl.style.display = 'flex'; }
    }
  });
}

/* ── Adres Formu ── */
function initAddressForm() {
  const form = document.getElementById('addressForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const successEl = document.getElementById('addressSuccess');
    const errorEl   = document.getElementById('addressError');

    if (successEl) successEl.style.display = 'none';
    if (errorEl)   errorEl.style.display   = 'none';

    const address  = document.getElementById('pfAddress')?.value.trim();
    const city     = document.getElementById('pfCity')?.value.trim();
    const district = document.getElementById('pfDistrict')?.value.trim();
    const zip      = document.getElementById('pfZip')?.value.trim();

    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

    const result = await Auth.updateProfile({ address, city, district, zip });

    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Adresi Kaydet'; }

    if (result.success) {
      Auth.setUser(result.user, Auth.getToken());
      if (successEl) successEl.style.display = 'flex';
      showToast('Adres bilgileri güncellendi!');
      setTimeout(() => { if (successEl) successEl.style.display = 'none'; }, 4000);
      // Adres güncelleme bildirimi gönder
      try {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'address_update',
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            email: result.user.email,
            phone: result.user.phone || '',
            address: result.user.address?.line || '',
            city: result.user.address?.city || '',
            district: result.user.address?.district || '',
            zip: result.user.address?.zip || '',
          }),
        }).catch(() => {});
      } catch (e) {}
    } else {
      if (errorEl) { errorEl.textContent = result.error || 'Bir hata oluştu.'; errorEl.style.display = 'flex'; }
    }
  });
}

/* ── Güvenlik Formu ── */
function initSecurityForm() {
  const form = document.getElementById('securityForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const successEl = document.getElementById('securitySuccess');
    const errorEl   = document.getElementById('securityError');

    if (successEl) successEl.style.display = 'none';
    if (errorEl)   errorEl.style.display   = 'none';

    const currentPassword = document.getElementById('pfCurrentPwd')?.value;
    const newPassword     = document.getElementById('pfNewPwd')?.value;
    const newPassword2    = document.getElementById('pfNewPwd2')?.value;

    if (!currentPassword || !newPassword || !newPassword2) {
      if (errorEl) { errorEl.textContent = 'Tüm alanları doldurun.'; errorEl.style.display = 'flex'; }
      return;
    }

    if (newPassword !== newPassword2) {
      if (errorEl) { errorEl.textContent = 'Yeni şifreler eşleşmiyor.'; errorEl.style.display = 'flex'; }
      return;
    }

    if (newPassword.length < 6) {
      if (errorEl) { errorEl.textContent = 'Yeni şifre en az 6 karakter olmalıdır.'; errorEl.style.display = 'flex'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Güncelleniyor...'; }

    const result = await Auth.updateProfile({ currentPassword, newPassword });

    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Şifreyi Güncelle'; }

    if (result.success) {
      form.reset();
      if (successEl) successEl.style.display = 'flex';
      showToast('Şifreniz başarıyla güncellendi!');
      setTimeout(() => { if (successEl) successEl.style.display = 'none'; }, 4000);
      // Şifre değişikliği bildirimi gönder
      const currentUser = Auth.getUser();
      if (currentUser) {
        try {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'password_change',
              firstName: currentUser.firstName,
              lastName: currentUser.lastName,
              email: currentUser.email,
              phone: currentUser.phone || '',
            }),
          }).catch(() => {});
        } catch (e) {}
      }
    } else {
      if (errorEl) { errorEl.textContent = result.error || 'Bir hata oluştu.'; errorEl.style.display = 'flex'; }
    }
  });
}

/* ── Giriş Formu ── */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginSubmitBtn');
    const errorEl = document.getElementById('loginError');

    if (errorEl) errorEl.style.display = 'none';

    const email    = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) {
      if (errorEl) { errorEl.textContent = 'E-posta ve şifre zorunludur.'; errorEl.style.display = 'flex'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Giriş yapılıyor...'; }

    const result = await Auth.login(email, password);

    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Giriş Yap'; }

    if (result.success) {
      Auth.setUser(result.user, result.token);
      closeModal('loginModal');
      showProfilContent(result.user);
      showToast('Hoş geldiniz, ' + (result.user.firstName || '') + '!');
    } else {
      if (errorEl) { errorEl.textContent = result.error || 'Giriş başarısız.'; errorEl.style.display = 'flex'; }
    }
  });
}

/* ── Kayıt Formu ── */
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('registerSubmitBtn');
    const errorEl = document.getElementById('registerError');

    if (errorEl) errorEl.style.display = 'none';

    const firstName = document.getElementById('regFirstName')?.value.trim();
    const lastName  = document.getElementById('regLastName')?.value.trim();
    const email     = document.getElementById('regEmail')?.value.trim();
    const phone     = document.getElementById('regPhone')?.value.trim();
    const password  = document.getElementById('regPassword')?.value;
    const password2 = document.getElementById('regPassword2')?.value;

    if (!firstName || !lastName || !email || !password) {
      if (errorEl) { errorEl.textContent = 'Ad, soyad, e-posta ve şifre zorunludur.'; errorEl.style.display = 'flex'; }
      return;
    }

    if (password !== password2) {
      if (errorEl) { errorEl.textContent = 'Şifreler eşleşmiyor.'; errorEl.style.display = 'flex'; }
      return;
    }

    if (password.length < 6) {
      if (errorEl) { errorEl.textContent = 'Şifre en az 6 karakter olmalıdır.'; errorEl.style.display = 'flex'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Kayıt yapılıyor...'; }

    const result = await Auth.register({ firstName, lastName, email, phone, password });

    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Kayıt Ol'; }

    if (result.success) {
      Auth.setUser(result.user, result.token);
      closeModal('registerModal');
      showProfilContent(result.user);
      showToast('Hesabınız oluşturuldu! Hoş geldiniz, ' + (result.user.firstName || '') + '!');

      // Hoş geldin maili gönder (arka planda)
      try {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            email: result.user.email,
            phone: result.user.phone || '',
            createdAt: result.user.createdAt,
          }),
        }).catch(() => {});
      } catch (e) {}
    } else {
      if (errorEl) { errorEl.textContent = result.error || 'Kayıt başarısız.'; errorEl.style.display = 'flex'; }
    }
  });
}

/* ── Modal Yönetimi ── */
window.showLoginModal = function() {
  openModal('loginModal');
};

window.showRegisterModal = function() {
  openModal('registerModal');
};

window.switchToRegister = function() {
  closeModal('loginModal');
  setTimeout(() => openModal('registerModal'), 200);
};

window.switchToLogin = function() {
  closeModal('registerModal');
  setTimeout(() => openModal('loginModal'), 200);
};

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* ── Profil İçeriğini Göster ── */
function showProfilContent(user) {
  const authRequired = document.getElementById('authRequired');
  const profilContent = document.getElementById('profilContent');

  if (authRequired) authRequired.style.display = 'none';
  if (profilContent) profilContent.style.display = 'block';

  populateProfileUI(user);
  updateNavbarUserUI();
  loadOrders();
}

/* ── Çıkış ── */
function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    Auth.logout();
    updateNavbarUserUI();
    window.location.href = 'profil.html?modal=login';
  });
}

/* ── Siparişleri Yenile ── */
function initRefreshOrders() {
  const btn = document.getElementById('refreshOrdersBtn');
  if (!btn) return;
  btn.addEventListener('click', loadOrders);
}

/* ── Modal Kapat Butonları ── */
function initModalClose() {
  ['loginModal', 'registerModal'].forEach(id => {
    const modal = document.getElementById(id);
    const closeBtn = document.getElementById(id + 'Close');

    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(id));
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(id);
      });
    }
  });
}

/* ── CSS Animasyon Ekle ── */
function addAnimationStyles() {
  if (document.getElementById('profilAnimStyles')) return;
  const style = document.createElement('style');
  style.id = 'profilAnimStyles';
  style.textContent = `
    @keyframes slideInToast {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  addAnimationStyles();

  // Lucide ikonları
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Modal kapat butonları
  initModalClose();

  // Form başlatıcılar
  initQuickLoginForm();
  initLoginForm();
  initRegisterForm();
  initProfileForm();
  initAddressForm();
  initSecurityForm();
  initLogout();
  initRefreshOrders();
  initTabs();

  // Kullanıcı durumunu kontrol et
  const user = Auth.getUser();
  const token = Auth.getToken();

  if (user && token) {
    // Önce mevcut veriyle hemen göster (hızlı UX)
    showProfilContent(user);
    // Arka planda token doğrula
    Auth.verifyToken().then(verified => {
      if (verified) {
        populateProfileUI(verified);
      } else {
        // Token geçersiz — giriş ekranına dön
        Auth.logout();
        const authRequired = document.getElementById('authRequired');
        const profilContent = document.getElementById('profilContent');
        if (profilContent) profilContent.style.display = 'none';
        if (authRequired) authRequired.style.display = 'flex';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        // URL parametresine göre modal aç
        checkAndOpenModalFromUrl();
      }
    }).catch(() => {
      // API erişilemiyorsa mevcut kullanıcıyla devam et
    });
  } else {
    // Giriş yapılmamış — authRequired HTML'de zaten görünür
    const profilContent = document.getElementById('profilContent');
    if (profilContent) profilContent.style.display = 'none';
    // authRequired display:flex olarak CSS'de ayarlanmış
    if (typeof lucide !== 'undefined') lucide.createIcons();
    // URL parametresine göre modal aç
    checkAndOpenModalFromUrl();
  }
});

/* ── URL Parametresine Göre Modal Aç ── */
function checkAndOpenModalFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const modal = params.get('modal');
  if (modal === 'register') {
    setTimeout(() => openModal('registerModal'), 300);
  } else if (modal === 'login') {
    setTimeout(() => openModal('loginModal'), 300);
  }
}
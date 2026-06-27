/* ===========================
   PROMIL DETOKS – auth.js
   Client-side Auth Yönetimi
   =========================== */
'use strict';

const AUTH_KEY   = 'promil_user';
const TOKEN_KEY  = 'promil_token';
const API_BASE   = '/api/auth';

/* ── Kullanıcı Durumu ── */
const Auth = {
  // Mevcut kullanıcıyı getir
  getUser() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  // Token getir
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  },

  // Giriş yapılmış mı?
  isLoggedIn() {
    return !!(this.getToken() && this.getUser());
  },

  // Kullanıcıyı kaydet
  setUser(user, token) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  },

  // Çıkış yap
  logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  // Kullanıcı adının baş harfleri
  getInitials(user) {
    if (!user) return '?';
    const f = (user.firstName || '').charAt(0).toUpperCase();
    const l = (user.lastName  || '').charAt(0).toUpperCase();
    return f + l || '?';
  },

  // Tam ad
  getFullName(user) {
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  },

  // ── API Çağrıları ──

  async register(data) {
    const res = await fetch(`${API_BASE}?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async updateProfile(data) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}?action=update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...data }),
    });
    return res.json();
  },

  async verifyToken() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}?action=verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        this.setUser(data.user, token);
        return data.user;
      }
      this.logout();
      return null;
    } catch {
      return null;
    }
  },

  async getOrders() {
    const token = this.getToken();
    if (!token) return [];
    try {
      const res = await fetch(`${API_BASE}?action=orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      return data.success ? data.orders : [];
    } catch {
      return [];
    }
  },
};

/* ── Navbar Kullanıcı UI Güncelle ── */
function updateNavbarUserUI() {
  const user = Auth.getUser();
  const container = document.getElementById('navUserContainer');
  if (!container) return;

  if (user && Auth.isLoggedIn()) {
    const initials = Auth.getInitials(user);
    const fullName = Auth.getFullName(user);
    container.innerHTML = `
      <div class="auth-dropdown" id="authDropdown">
        <button class="navbar-user-btn" id="userMenuBtn" aria-label="Kullanıcı Menüsü">
          <div class="navbar-user-avatar">${initials}</div>
          <span class="desktop-only">${escHtml(user.firstName || 'Profilim')}</span>
          <i data-lucide="chevron-down" style="width:13px;height:13px;stroke-width:2.5;"></i>
        </button>
        <div class="auth-dropdown-menu" id="userDropdownMenu">
          <div style="padding:14px 18px 10px;border-bottom:1px solid var(--gray-100);">
            <div style="font-size:.88rem;font-weight:700;color:var(--dark);">${escHtml(fullName)}</div>
            <div style="font-size:.75rem;color:var(--gray-400);margin-top:2px;">${escHtml(user.email || '')}</div>
          </div>
          <a href="profil.html" class="auth-dropdown-item">
            <i data-lucide="user" style="width:15px;height:15px;stroke-width:2;"></i>
            Profilim
          </a>
          <a href="profil.html#orders" class="auth-dropdown-item">
            <i data-lucide="package" style="width:15px;height:15px;stroke-width:2;"></i>
            Siparişlerim
          </a>
          <div class="auth-dropdown-divider"></div>
          <button class="auth-dropdown-item danger" onclick="handleNavLogout()">
            <i data-lucide="log-out" style="width:15px;height:15px;stroke-width:2;"></i>
            Çıkış Yap
          </button>
        </div>
      </div>
    `;

    // Dropdown toggle
    const btn = document.getElementById('userMenuBtn');
    const menu = document.getElementById('userDropdownMenu');
    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!btn.contains(e.target)) {
          menu.classList.remove('open');
        }
      });
    }

    // Lucide ikonları yenile
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

  } else {
    container.innerHTML = `
      <button class="navbar-user-btn" onclick="openAuthModal('login')" aria-label="Giriş Yap">
        <i data-lucide="user" style="width:15px;height:15px;stroke-width:2;flex-shrink:0;"></i>
        <span class="desktop-only">Giriş Yap</span>
      </button>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

/* ── Navbar Çıkış ── */
window.handleNavLogout = function() {
  Auth.logout();
  updateNavbarUserUI();
  // Sepet formunu temizle
  clearCartFormFromProfile();
  // Profil sayfasındaysak giriş ekranına yönlendir, değilsek navbar'ı güncelle
  if (window.location.pathname.includes('profil.html')) {
    window.location.href = 'profil.html?modal=login';
  }
};

/* ── Sepet Formunu Profil Bilgileriyle Doldur ── */
function fillCartFormFromProfile() {
  const user = Auth.getUser();
  if (!user) return;

  // Kişisel bilgileri her zaman doldur
  const personalFields = {
    cartFirstName: user.firstName || '',
    cartLastName:  user.lastName  || '',
    cartEmail:     user.email     || '',
    cartPhone:     user.phone     || '',
  };
  Object.entries(personalFields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });

  // Kayıtlı adres var mı kontrol et
  const savedAddr = user.address;
  const hasSavedAddr = savedAddr && (
    savedAddr.line || savedAddr.city || savedAddr.district
  );

  const toggleEl  = document.getElementById('cartAddressToggle');
  const fieldsEl  = document.getElementById('cartAddressFields');
  const previewEl = document.getElementById('cartSavedAddrPreview');

  if (hasSavedAddr) {
    // Toggle'ı göster
    if (toggleEl) toggleEl.style.display = 'flex';

    // Önizleme metnini oluştur
    const previewParts = [savedAddr.line, savedAddr.district, savedAddr.city].filter(Boolean);
    const previewText  = previewParts.join(', ') || 'Kayıtlı adres';
    if (previewEl) previewEl.textContent = previewText;

    // Varsayılan: kayıtlı adres seçili → alanları doldur ve kilitle
    _applyAddressChoice('saved', user);
  } else {
    // Kayıtlı adres yok → toggle'ı gizle, alanlar boş ve düzenlenebilir
    if (toggleEl) toggleEl.style.display = 'none';
    if (fieldsEl) fieldsEl.classList.remove('addr-locked');
  }
}

/* Adres seçimini uygula: 'saved' veya 'new' */
function _applyAddressChoice(choice, user) {
  const fieldsEl = document.getElementById('cartAddressFields');
  const savedOpt = document.getElementById('cartAddrOptSaved');
  const newOpt   = document.getElementById('cartAddrOptNew');

  if (choice === 'saved' && user) {
    const addr = user.address || {};
    // Alanları doldur
    const addrFields = {
      cartAddress:  addr.line     || '',
      cartCity:     addr.city     || '',
      cartDistrict: addr.district || '',
      cartZip:      addr.zip      || '',
    };
    Object.entries(addrFields).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    // Kilitle
    if (fieldsEl) fieldsEl.classList.add('addr-locked');
    // Toggle aktif durumu
    if (savedOpt) { savedOpt.classList.add('active'); savedOpt.querySelector('input').checked = true; }
    if (newOpt)   { newOpt.classList.remove('active'); }
  } else {
    // Alanları temizle ve kilidi aç
    ['cartAddress','cartCity','cartDistrict','cartZip'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    if (fieldsEl) fieldsEl.classList.remove('addr-locked');
    // Toggle aktif durumu
    if (newOpt)   { newOpt.classList.add('active'); newOpt.querySelector('input').checked = true; }
    if (savedOpt) { savedOpt.classList.remove('active'); }
  }
}

/* Adres toggle event listener'larını bağla */
function initCartAddressToggle() {
  const savedOpt = document.getElementById('cartAddrOptSaved');
  const newOpt   = document.getElementById('cartAddrOptNew');

  if (savedOpt) {
    savedOpt.addEventListener('click', () => {
      const user = Auth.getUser();
      if (user) _applyAddressChoice('saved', user);
    });
  }
  if (newOpt) {
    newOpt.addEventListener('click', () => {
      _applyAddressChoice('new', null);
    });
  }
}

function clearCartFormFromProfile() {
  const ids = ['cartFirstName','cartLastName','cartEmail','cartPhone','cartAddress','cartCity','cartDistrict','cartZip'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Toggle'ı gizle ve kilidi kaldır
  const toggleEl = document.getElementById('cartAddressToggle');
  const fieldsEl = document.getElementById('cartAddressFields');
  if (toggleEl) toggleEl.style.display = 'none';
  if (fieldsEl) fieldsEl.classList.remove('addr-locked');
}

/* ── Auth Modal (index.html için) ── */
let authModalType = 'login';

window.openAuthModal = function(type) {
  authModalType = type || 'login';
  // profil.html'e yönlendir, modal tipini URL parametresiyle ilet
  window.location.href = 'profil.html?modal=' + (type || 'login');
};

/* ── Yardımcı ── */
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Şifre Göster/Gizle ── */
window.togglePwd = function(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) {
    icon.setAttribute('data-lucide', isHidden ? 'eye-off' : 'eye');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
};

/* ── Mobil Nav Profil Label Güncelle ── */
function updateMobProfilLabel() {
  const user = Auth.getUser();
  const label = document.getElementById('mobProfilLabel');
  const btn   = document.getElementById('mobProfilBtn');
  if (!label) return;
  if (user && Auth.isLoggedIn()) {
    label.textContent = user.firstName || 'Profil';
    if (btn) btn.href = 'profil.html';
  } else {
    label.textContent = 'Giriş';
    if (btn) btn.href = 'profil.html?modal=login';
  }
}

/* ── DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {
  updateNavbarUserUI();
  updateMobProfilLabel();

  // Adres toggle event listener'larını bağla
  initCartAddressToggle();

  // Sepet açıldığında profil bilgilerini doldur
  const cartNavBtn = document.getElementById('cartNavBtn');
  const cartMobBtn = document.getElementById('cartMobBtn');

  function onCartOpen() {
    setTimeout(fillCartFormFromProfile, 100);
  }

  if (cartNavBtn) cartNavBtn.addEventListener('click', onCartOpen);
  if (cartMobBtn) cartMobBtn.addEventListener('click', onCartOpen);
});
/* ===========================
   PROMIL DETOKS – main.js
   =========================== */

'use strict';

/* ── Content Loader (content.json) ── */
async function loadContent() {
  try {
    const res = await fetch('data/content.json?v=' + Date.now());
    if (!res.ok) throw new Error('content.json yüklenemedi');
    const c = await res.json();
    applyContent(c);
  } catch (e) {
    // Dosya bulunamazsa (local file:// protokolü) sessizce geç
    console.warn('content.json yüklenemedi, statik içerik kullanılıyor:', e.message);
  }
}

function applyContent(c) {
  // Hero
  setText('[data-content="hero_title_white1"]', c.hero?.title_white1);
  setText('[data-content="hero_title_green"]',  c.hero?.title_green);
  setText('[data-content="hero_title_white2"]', c.hero?.title_white2);
  setText('[data-content="hero_description"]',  c.hero?.description);
  setText('[data-content="hero_cta_primary"]',  c.hero?.cta_primary);
  setText('[data-content="hero_cta_secondary"]',c.hero?.cta_secondary);
  setText('[data-content="hero_badge"]',         c.site?.badge || c.hero?.badge);
  setText('[data-content="stat1_num"]',          c.hero?.stat1_num);
  setText('[data-content="stat1_label"]',        c.hero?.stat1_label);
  setText('[data-content="stat2_num"]',          c.hero?.stat2_num);
  setText('[data-content="stat2_label"]',        c.hero?.stat2_label);
  setText('[data-content="stat3_num"]',          c.hero?.stat3_num);
  setText('[data-content="stat3_label"]',        c.hero?.stat3_label);
  setText('[data-content="hero_badge_float_1"]', c.hero?.badge_float_1);
  setText('[data-content="hero_badge_float_2"]', c.hero?.badge_float_2);

  // Nasıl Çalışır
  if (c.how_it_works) {
    const hiw = c.how_it_works;
    setText('[data-content="hiw_tag"]',         hiw.tag);
    setText('[data-content="hiw_title"]',        hiw.title);
    setText('[data-content="hiw_description"]',  hiw.description);
    (hiw.steps || []).forEach((step, i) => {
      setText(`[data-content="hiw_step${i+1}_num"]`,   step.num);
      setText(`[data-content="hiw_step${i+1}_title"]`, step.title);
      setText(`[data-content="hiw_step${i+1}_text"]`,  step.text);
    });
  }

  // Avantajlar
  if (c.benefits) {
    const ben = c.benefits;
    setText('[data-content="ben_tag"]',          ben.tag);
    setText('[data-content="ben_title"]',         ben.title);
    setText('[data-content="ben_description"]',   ben.description);
    setText('[data-content="ben_rating_value"]',  ben.rating_value);
    setText('[data-content="ben_rating_label"]',  ben.rating_label);
    (ben.items || []).forEach((item, i) => {
      setText(`[data-content="ben_item${i+1}_title"]`, item.title);
      setText(`[data-content="ben_item${i+1}_text"]`,  item.text);
    });
  }

  // Güven Bantları
  if (c.trust_bar) {
    c.trust_bar.forEach((item, i) => {
      setText(`[data-content="trust${i+1}"]`, item.text);
    });
  }

  // Paket Fiyatları
  if (c.products?.[0]?.packages) {
    c.products[0].packages.forEach((pkg, i) => {
      setText(`[data-content="pkg${i+1}_name"]`,  pkg.name);
      setText(`[data-content="pkg${i+1}_qty"]`,   pkg.qty);
      setText(`[data-content="pkg${i+1}_price"]`, '₺' + (pkg.price || ''));
      setText(`[data-content="pkg${i+1}_save"]`,  pkg.save || '');
      // Paket seçim butonlarını güncelle
      const pkgOpt = document.querySelector(`[data-product="${pkg.id}"]`);
      if (pkgOpt) pkgOpt.dataset.price = pkg.price;
    });
  }

  // Products
  if (c.products) {
    c.products.forEach((p, i) => {
      setText(`[data-content="prod_${i}_name"]`,      p.name);
      setText(`[data-content="prod_${i}_desc"]`,      p.description);
      setText(`[data-content="prod_${i}_tag"]`,       p.tag);
      setText(`[data-content="prod_${i}_badge"]`,     p.badge);
      setText(`[data-content="prod_${i}_price_old"]`, p.price_old ? '₺' + p.price_old : '');
      setText(`[data-content="prod_${i}_price_new"]`, p.price_new ? '₺' + p.price_new : '');
      const btn = document.querySelector(`[data-product="${p.id}"]`);
      if (btn) btn.dataset.price = p.price_new;

      // coming_soon ürünü için "Çok Yakında" kartını güncelle
      if (p.coming_soon) {
        const comingTag = document.querySelector('.coming-soon-tag');
        const comingTitle = document.querySelector('.coming-soon-content h3');
        const comingDesc = document.querySelector('.coming-soon-content p');
        const comingBadge = document.querySelector('.coming-soon-badge');
        if (comingTag) comingTag.textContent = p.coming_soon_tag || 'Çok Yakında';
        if (comingTitle) comingTitle.textContent = p.name || 'Promil Detoks Shot';
        if (comingDesc) comingDesc.textContent = p.description || 'Aynı güçlü bitkisel formülün pratik shot versiyonu. Hazır içim, her an yanında. Yakında sizlerle!';
        if (comingBadge) {
          const badgeText = comingBadge.querySelector('i') ? comingBadge.innerHTML.replace(/[^<>]*$/, '') + (p.coming_soon_tag || 'Çok Yakında') : (p.coming_soon_tag || 'Çok Yakında');
          // Sadece metin kısmını güncelle, ikonu koru
          const badgeIcon = comingBadge.querySelector('i');
          if (badgeIcon) {
            comingBadge.innerHTML = '';
            comingBadge.appendChild(badgeIcon);
            comingBadge.appendChild(document.createTextNode(' ' + (p.coming_soon_tag || 'Çok Yakında')));
          }
        }
        // coming_soon ürünü için satın alma butonlarını gizle
        const buyBtns = document.querySelectorAll(`[data-product="${p.id}"]`);
        buyBtns.forEach(b => { b.style.display = 'none'; });
      }
    });
  }

  // CTA
  setText('[data-content="cta_title"]',       c.cta?.title);
  setText('[data-content="cta_description"]', c.cta?.description);
  setText('[data-content="cta_button"]',      c.cta?.button);

  // Contact
  setText('[data-content="contact_email"]',   c.contact?.email);
  setText('[data-content="contact_phone"]',   c.contact?.phone);
  setText('[data-content="contact_address"]', c.contact?.address);

  // Footer
  setText('[data-content="footer_brand_desc"]', c.footer?.brand_desc);
  setText('[data-content="footer_copyright"]',  c.footer?.copyright);

  // Announcement banner
  if (c.announcement?.enabled && c.announcement?.text) {
    const banner = document.getElementById('announcementBanner');
    if (banner) {
      banner.textContent = c.announcement.text;
      banner.style.display = 'block';
    }
  }

  // Social links — dinamik render
  if (c.social) {
    const container = document.getElementById('socialLinksContainer');
    if (container) {
      const socialIcons = {
        instagram: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
        facebook:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
        twitter:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l16 16M4 20L20 4"/></svg>`,
        youtube:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>`,
        tiktok:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`
      };
      const labels = { instagram: 'Instagram', facebook: 'Facebook', twitter: 'Twitter/X', youtube: 'YouTube', tiktok: 'TikTok' };
      container.innerHTML = '';
      Object.entries(c.social).forEach(([platform, url]) => {
        if (url && url.trim()) {
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.setAttribute('aria-label', labels[platform] || platform);
          a.setAttribute('data-social', platform);
          a.innerHTML = socialIcons[platform] || '';
          container.appendChild(a);
        }
      });
    }
  }

  // Page title & meta (SEO)
  const seo = c.seo || {};
  const title = seo.title || c.site?.title;
  if (title) document.title = title;

  setMeta('name', 'description', seo.description || c.site?.description);
  setMeta('name', 'keywords',    seo.keywords);
  setMeta('name', 'robots',      seo.robots || 'index, follow');

  // Open Graph
  setMeta('property', 'og:title',       seo.og_title || title);
  setMeta('property', 'og:description', seo.og_description || seo.description);
  setMeta('property', 'og:image',       seo.og_image || c.images?.og_image);
  setMeta('property', 'og:type',        'website');
  setMeta('property', 'og:url',         seo.canonical);

  // Twitter Card
  setMeta('name', 'twitter:card',        seo.twitter_card || 'summary_large_image');
  setMeta('name', 'twitter:title',       seo.og_title || title);
  setMeta('name', 'twitter:description', seo.og_description || seo.description);
  setMeta('name', 'twitter:image',       seo.og_image || c.images?.og_image);

  // Canonical
  if (seo.canonical) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = seo.canonical;
  }

  // HTML lang
  if (seo.lang) document.documentElement.lang = seo.lang;

  // Google Analytics
  if (seo.ga_id && !document.getElementById('ga-script')) {
    const s1 = document.createElement('script');
    s1.id  = 'ga-script';
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${seo.ga_id}`;
    s1.async = true;
    document.head.appendChild(s1);
    const s2 = document.createElement('script');
    s2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.ga_id}');`;
    document.head.appendChild(s2);
  }

  // Logo güncelle
  if (c.images?.logo) {
    document.querySelectorAll('img[data-content="logo"]').forEach(img => { img.src = c.images.logo; });
  }
  // Favicon güncelle
  if (c.images?.favicon) {
    const fav = document.querySelector('link[rel="icon"]');
    if (fav) fav.href = c.images.favicon;
  }
}

function setMeta(attr, name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setText(selector, value) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

/* ── Lucide Icons Init ── */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  // content.json yükle (GitHub Pages'te çalışır, local file:// protokolünde sessizce geçer)
  loadContent();
});

/* ── Navbar Scroll ── */
const navbar = document.getElementById('navbar');

function handleNavbarScroll() {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}
window.addEventListener('scroll', handleNavbarScroll, { passive: true });
// Sayfa yüklendiğinde de kontrol et (yenileme sonrası scroll pozisyonu için)
handleNavbarScroll();

/* ── Mobil Bottom Nav Aktif Item ── */
const mobNavItems = document.querySelectorAll('.mob-nav-item[data-section]');

function updateMobNav() {
  const scrollY = window.scrollY + window.innerHeight / 2;
  let current = '';
  document.querySelectorAll('section[id]').forEach(section => {
    if (section.offsetTop <= scrollY) {
      current = section.getAttribute('id');
    }
  });
  mobNavItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === current) {
      item.classList.add('active');
    }
  });
}
window.addEventListener('scroll', updateMobNav, { passive: true });
updateMobNav();

/* ── Smooth Scroll ── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ── Scroll Animations ── */
const fadeEls = document.querySelectorAll(
  '.step-card, .product-card, .testimonial-card, .benefits-list li, .trust-item'
);
fadeEls.forEach(el => el.classList.add('fade-in'));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
fadeEls.forEach(el => observer.observe(el));

/* ── Payment Modal ── */
const paymentModal  = document.getElementById('paymentModal');
const successModal  = document.getElementById('successModal');
const modalClose    = document.getElementById('modalClose');
const successClose  = document.getElementById('successClose');
const paymentForm   = document.getElementById('paymentForm');
const modalProductName = document.getElementById('modalProductName');
const summaryProduct   = document.getElementById('summaryProduct');
const summaryTotal     = document.getElementById('summaryTotal');
const payBtnTotal      = document.getElementById('payBtnTotal');

const instPrice1  = document.getElementById('instPrice1');
const instPrice3  = document.getElementById('instPrice3');
const instPrice6  = document.getElementById('instPrice6');
const instPrice12 = document.getElementById('instPrice12');

const productNames = {
  'toz':        'Promil Detoks Toz – Tekli',
  'toz-tekli':  'Promil Detoks Toz – Tekli (1 Adet)',
  'toz-uclu':   'Promil Detoks Toz – Üçlü (3 Adet)',
  'toz-stand':  'Promil Detoks Toz – 16\'lı Stand',
  'shot':       'Promil Detoks Shot',
};

let currentPrice = 0;
let currentProductKey = '';
let currentProductName = '';

function formatPrice(n) {
  return '₺' + n.toLocaleString('tr-TR');
}

function updateInstallments(price) {
  if (instPrice1)  instPrice1.textContent  = formatPrice(price);
  if (instPrice3)  instPrice3.textContent  = formatPrice(Math.ceil(price / 3)) + '/ay';
  if (instPrice6)  instPrice6.textContent  = formatPrice(Math.ceil(price / 6)) + '/ay';
  if (instPrice12) instPrice12.textContent = formatPrice(Math.ceil(price / 12)) + '/ay';
}

function openPaymentModal(productKey, price, overrideName) {
  currentPrice      = price;
  currentProductKey = productKey;
  currentProductName = overrideName || productNames[productKey] || productKey;

  if (modalProductName) modalProductName.textContent = currentProductName;
  if (summaryProduct)   summaryProduct.textContent   = currentProductName;
  if (summaryTotal)     summaryTotal.textContent     = formatPrice(price);
  if (payBtnTotal)      payBtnTotal.textContent      = formatPrice(price);
  updateInstallments(price);

  // Reset installment selection
  document.querySelectorAll('.installment-opt').forEach(opt => opt.classList.remove('active'));
  const firstOpt = document.querySelector('.installment-opt');
  if (firstOpt) {
    firstOpt.classList.add('active');
    const firstInput = firstOpt.querySelector('input');
    if (firstInput) firstInput.checked = true;
  }

  if (paymentModal) {
    paymentModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closePaymentModal() {
  if (paymentModal) paymentModal.classList.remove('active');
  document.body.style.overflow = '';
}

/* ── İyzico Checkout Form ── */
let iyzicoIframeContainer = null;

function showIyzicoLoading() {
  const btn = document.getElementById('payBtnSubmit') || document.querySelector('.btn-pay');
  if (btn) {
    btn.disabled = true;
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Yükleniyor...';
  }
}

function hideIyzicoLoading() {
  const btn = document.getElementById('payBtnSubmit') || document.querySelector('.btn-pay');
  if (btn && btn.dataset.origText) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.origText;
  }
}

function openIyzicoCheckout(checkoutFormContent) {
  // Mevcut iyzico container varsa kaldır
  if (iyzicoIframeContainer) {
    iyzicoIframeContainer.remove();
    iyzicoIframeContainer = null;
  }

  // Overlay container oluştur
  iyzicoIframeContainer = document.createElement('div');
  iyzicoIframeContainer.id = 'iyzicoCheckoutContainer';
  iyzicoIframeContainer.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.7);z-index:99999;
    display:flex;align-items:center;justify-content:center;
  `;

  const inner = document.createElement('div');
  inner.style.cssText = `
    background:#fff;border-radius:16px;
    width:min(520px,96vw);max-height:90vh;
    overflow-y:auto;position:relative;
    box-shadow:0 24px 80px rgba(0,0,0,0.35);
  `;

  // Kapat butonu
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    position:absolute;top:12px;right:16px;
    background:none;border:none;font-size:28px;
    cursor:pointer;color:#666;z-index:1;line-height:1;
  `;
  closeBtn.addEventListener('click', () => {
    iyzicoIframeContainer.remove();
    iyzicoIframeContainer = null;
    document.body.style.overflow = '';
  });

  // İyzico form içeriği
  const formDiv = document.createElement('div');
  formDiv.style.cssText = 'padding:24px;';
  formDiv.innerHTML = checkoutFormContent;

  inner.appendChild(closeBtn);
  inner.appendChild(formDiv);
  iyzicoIframeContainer.appendChild(inner);
  document.body.appendChild(iyzicoIframeContainer);
  document.body.style.overflow = 'hidden';

  // İyzico'nun script'lerini çalıştır
  formDiv.querySelectorAll('script').forEach(oldScript => {
    const newScript = document.createElement('script');
    if (oldScript.src) {
      newScript.src = oldScript.src;
    } else {
      newScript.textContent = oldScript.textContent;
    }
    document.body.appendChild(newScript);
  });
}

async function initiateIyzicoPayment(formData) {
  showIyzicoLoading();

  // Sepet ürünlerini iyzico formatına çevir
  const basketItems = cart.items.map(item => ({
    id: item.product,
    name: item.name,
    category: 'Takviye Ürünleri',
    price: (item.price * item.qty).toFixed(2),
  }));

  const totalPrice = cart.total();
  const selectedInstallment = parseInt(
    document.querySelector('.installment-opt input:checked')?.value || '1', 10
  );

  const payload = {
    firstName:     formData.firstName,
    lastName:      formData.lastName,
    email:         formData.email,
    phone:         formData.phone,
    address:       formData.address || 'Türkiye',
    city:          formData.city || 'Istanbul',
    country:       'Turkey',
    basketItems,
    price:         totalPrice.toFixed(2),
    installment:   selectedInstallment,
    callbackUrl:   window.location.origin + '/api/payment-callback',
    conversationId: 'pd-' + Date.now(),
  };

  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    hideIyzicoLoading();

    if (result.status === 'success' && result.checkoutFormContent) {
      closePaymentModal();
      openIyzicoCheckout(result.checkoutFormContent);
    } else {
      const msg = result.errorMessage || result.error || 'Ödeme başlatılamadı.';
      showPaymentError(msg);
    }
  } catch (err) {
    hideIyzicoLoading();
    showPaymentError('Sunucu bağlantı hatası. Lütfen tekrar deneyin.');
    console.error('İyzico checkout hatası:', err);
  }
}

function showPaymentError(message) {
  let errEl = document.getElementById('paymentErrorMsg');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.id = 'paymentErrorMsg';
    errEl.style.cssText = `
      background:#fef2f2;border:1px solid #fecaca;color:#dc2626;
      padding:12px 16px;border-radius:10px;font-size:.85rem;
      margin-top:12px;display:flex;align-items:center;gap:8px;
    `;
    const form = document.getElementById('paymentForm');
    if (form) form.appendChild(errEl);
  }
  errEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${message}`;
  errEl.style.display = 'flex';
  setTimeout(() => { if (errEl) errEl.style.display = 'none'; }, 6000);
}

/* ── URL parametrelerinden ödeme sonucunu kontrol et ── */
(function checkPaymentResult() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  if (!payment) return;

  // URL'yi temizle
  window.history.replaceState({}, document.title, window.location.pathname);

  if (payment === 'success') {
    // Başarı modalını göster ve sepeti temizle
    setTimeout(() => {
      cart.clear();
      if (successModal) {
        successModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }, 500);
  } else if (payment === 'error' || payment === 'cancelled') {
    const reason = params.get('reason') || '';
    const messages = {
      'no-token':  'Ödeme token\'ı alınamadı.',
      'server':    'Sunucu hatası oluştu.',
      'cancelled': 'Ödeme iptal edildi.',
    };
    const msg = messages[reason] || 'Ödeme tamamlanamadı. Lütfen tekrar deneyin.';
    setTimeout(() => showPaymentError(msg), 800);
  }
})();

/* ── Paket Görselleri ── */
const packageImages = {
  'toz-tekli': ['images/tekli.jpeg',   'images/tekli2.jpeg',  'images/tekli3.jpeg'],
  'toz-uclu':  ['images/3lu.jpeg',     'images/tekli.jpeg',   'images/tekli2.jpeg'],
  'toz-stand': ['images/20stand.jpeg', 'images/20stand2.jpeg','images/20stand3.jpeg'],
  'shot':      ['images/shot.jpeg',    'images/shot2.jpeg',   'images/shot3.jpeg'],
};

function updateSliderImages(packageId) {
  const imgs = packageImages[packageId];
  if (!imgs) return;
  const track = document.getElementById('sliderTrack');
  if (!track) return;
  const slides = track.querySelectorAll('.product-slide');
  slides.forEach((slide, i) => {
    let img = slide.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.loading = 'lazy';
      slide.innerHTML = '';
      slide.appendChild(img);
    }
    img.src = imgs[i] || imgs[0];
    img.alt = 'Promil Detoks ' + packageId;
  });
  // Slider'ı başa al
  if (track) track.style.transform = 'translateX(0)';
  document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === 0));
}

/* ── Paket Seçimi ── */
const packageOpts = document.querySelectorAll('.package-opt');
const selectedPriceEl = document.getElementById('selectedPrice');
const addToCartBtn = document.getElementById('addToCartBtn');

packageOpts.forEach(opt => {
  opt.addEventListener('click', () => {
    packageOpts.forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    const price   = opt.dataset.price;
    const product = opt.dataset.product;
    if (selectedPriceEl) selectedPriceEl.textContent = '₺' + parseInt(price).toLocaleString('tr-TR');
    if (addToCartBtn) {
      addToCartBtn.dataset.price   = price;
      addToCartBtn.dataset.product = product;
    }
    // Slider görsellerini güncelle
    updateSliderImages(product);
  });
});

/* ── Ürün Slider ── */
(function initProductSlider() {
  const track  = document.getElementById('sliderTrack');
  const slides = document.querySelectorAll('.product-slide');
  const dots   = document.querySelectorAll('.slider-dot');
  const prevBtn = document.getElementById('sliderPrev');
  const nextBtn = document.getElementById('sliderNext');

  if (!track || slides.length === 0) return;

  let current = 0;
  const total = slides.length;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));
  dots.forEach(dot => {
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index)));
  });

  // Otomatik geçiş (4 saniyede bir)
  let autoPlay = setInterval(() => goTo(current + 1), 4000);
  const sliderEl = document.getElementById('productSlider');
  if (sliderEl) {
    sliderEl.addEventListener('mouseenter', () => clearInterval(autoPlay));
    sliderEl.addEventListener('mouseleave', () => {
      autoPlay = setInterval(() => goTo(current + 1), 4000);
    });
  }

  // Touch/swipe desteği
  let touchStartX = 0;
  if (track) {
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
    }, { passive: true });
  }
})();

/* ── Shot Ürün Slider ── */
(function initShotSlider() {
  const track  = document.getElementById('sliderTrackShot');
  const slides = document.querySelectorAll('#productSliderShot .product-slide');
  const dots   = document.querySelectorAll('#sliderDotsShot .slider-dot');

  if (!track || slides.length === 0) return;

  let current = 0;
  const total = slides.length;
  let autoPlay;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  window.prevSlideShot = () => goTo(current - 1);
  window.nextSlideShot = () => goTo(current + 1);

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goTo(parseInt(dot.dataset.index));
      clearInterval(autoPlay);
    });
  });

  // Otomatik geçiş
  autoPlay = setInterval(() => goTo(current + 1), 4000);
  const sliderEl = document.getElementById('productSliderShot');
  if (sliderEl) {
    sliderEl.addEventListener('mouseenter', () => clearInterval(autoPlay));
    sliderEl.addEventListener('mouseleave', () => {
      autoPlay = setInterval(() => goTo(current + 1), 4000);
    });
  }

  // Touch/swipe
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
  }, { passive: true });
})();

/* ── Sepet (Cart) Sistemi ── */
const cart = {
  items: JSON.parse(localStorage.getItem('promil_cart') || '[]'),

  save() {
    localStorage.setItem('promil_cart', JSON.stringify(this.items));
  },

  add(product, price, name, image) {
    const existing = this.items.find(i => i.product === product);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({ product, price, name, image, qty: 1 });
    }
    this.save();
    renderCart();
    updateCartBadge();
  },

  remove(product) {
    this.items = this.items.filter(i => i.product !== product);
    this.save();
    renderCart();
    updateCartBadge();
  },

  updateQty(product, delta) {
    const item = this.items.find(i => i.product === product);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      this.remove(product);
      return;
    }
    this.save();
    renderCart();
    updateCartBadge();
  },

  total() {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  clear() {
    this.items = [];
    this.save();
    renderCart();
    updateCartBadge();
  }
};

/* Ürün görseli haritası */
const productImageMap = {
  'toz-tekli': 'images/tekli.jpeg',
  'toz-uclu':  'images/3lu.jpeg',
  'toz-stand': 'images/20stand.jpeg',
  'shot':      'images/shot.jpeg',
};

/* Ürün adı haritası (tam) */
const productNameMap = {
  'toz-tekli': 'Promil Detoks Toz – Tekli (1 Adet)',
  'toz-uclu':  'Promil Detoks Toz – Üçlü (3 Adet)',
  'toz-stand': 'Promil Detoks Toz – 16\'lı Stand',
  'shot':      'Promil Detoks Shot',
};

function updateCartBadge() {
  const count = cart.count();
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(b => {
    b.textContent = count;
    b.classList.toggle('visible', count > 0);
  });
  const countEl = document.getElementById('cartItemCount');
  if (countEl) countEl.textContent = count + ' ürün';
}

function renderCart() {
  const listEl   = document.getElementById('cartItemsList');
  const emptyEl  = document.getElementById('cartEmpty');
  const footerEl = document.getElementById('cartFooter');
  if (!listEl) return;

  if (cart.items.length === 0) {
    listEl.style.display   = 'none';
    footerEl.style.display = 'none';
    emptyEl.style.display  = 'flex';
    return;
  }

  emptyEl.style.display  = 'none';
  listEl.style.display   = 'flex';
  footerEl.style.display = 'block';

  listEl.innerHTML = cart.items.map(item => `
    <div class="cart-item" data-product="${item.product}">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" loading="lazy" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-variant">Bitkisel Formül</div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn minus" data-product="${item.product}" data-delta="-1" aria-label="Azalt">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn plus" data-product="${item.product}" data-delta="1" aria-label="Artır">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
        <button class="cart-item-remove" data-product="${item.product}" aria-label="Kaldır">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
        <span class="cart-item-price">₺${(item.price * item.qty).toLocaleString('tr-TR')}</span>
      </div>
    </div>
  `).join('');

  // Miktar butonları
  listEl.querySelectorAll('.cart-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.updateQty(btn.dataset.product, parseInt(btn.dataset.delta, 10));
    });
  });

  // Kaldır butonları
  listEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.remove(btn.dataset.product);
    });
  });

  // Toplam güncelle
  const total = cart.total();
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl    = document.getElementById('cartTotal');
  if (subtotalEl) subtotalEl.textContent = '₺' + total.toLocaleString('tr-TR');
  if (totalEl)    totalEl.textContent    = '₺' + total.toLocaleString('tr-TR');
}

/* Sepet drawer aç/kapat */
const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
const cartDrawerClose   = document.getElementById('cartDrawerClose');
const cartNavBtn        = document.getElementById('cartNavBtn');
const cartMobBtn        = document.getElementById('cartMobBtn');
const cartContinueBtn   = document.getElementById('cartContinueBtn');
const cartGoShop        = document.getElementById('cartGoShop');
const cartCheckoutBtn   = document.getElementById('cartCheckoutBtn');

function openCartDrawer() {
  cartDrawerOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  cartDrawerOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

if (cartNavBtn)      cartNavBtn.addEventListener('click', openCartDrawer);
if (cartMobBtn)      cartMobBtn.addEventListener('click', openCartDrawer);
if (cartDrawerClose) cartDrawerClose.addEventListener('click', closeCartDrawer);
if (cartContinueBtn) cartContinueBtn.addEventListener('click', closeCartDrawer);
if (cartGoShop)      cartGoShop.addEventListener('click', closeCartDrawer);

// Overlay dışına tıklayınca kapat
if (cartDrawerOverlay) {
  cartDrawerOverlay.addEventListener('click', (e) => {
    if (e.target === cartDrawerOverlay) closeCartDrawer();
  });
}

// Sepetten ödemeye geç — direkt iyzico entegrasyonu
if (cartCheckoutBtn) {
  cartCheckoutBtn.addEventListener('click', async () => {
    if (cart.items.length === 0) return;

    // Sepet içi formdan bilgileri al
    const firstName  = document.getElementById('cartFirstName')?.value.trim() || '';
    const lastName   = document.getElementById('cartLastName')?.value.trim() || '';
    const email      = document.getElementById('cartEmail')?.value.trim() || '';
    const phone      = document.getElementById('cartPhone')?.value.trim() || '';
    const address    = document.getElementById('cartAddress')?.value.trim() || '';
    const city       = document.getElementById('cartCity')?.value.trim() || '';
    const district   = document.getElementById('cartDistrict')?.value.trim() || '';
    const zip        = document.getElementById('cartZip')?.value.trim() || '';
    const installment = parseInt(document.getElementById('cartInstallment')?.value || '1', 10);

    // Zorunlu alan kontrolü
    const requiredFields = ['cartFirstName','cartLastName','cartEmail','cartPhone','cartAddress','cartCity'];
    let hasEmpty = false;
    requiredFields.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.value.trim()) {
        hasEmpty = true;
        el.style.borderColor = '#ef4444';
        el.style.boxShadow = '0 0 0 3px rgba(239,68,68,.12)';
        el.addEventListener('input', () => {
          el.style.borderColor = '';
          el.style.boxShadow = '';
        }, { once: true });
      }
    });
    if (hasEmpty) {
      showCartError('Lütfen tüm zorunlu alanları doldurun (ad, soyad, e-posta, telefon, adres, şehir).');
      return;
    }

    // E-posta format kontrolü
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const emailEl = document.getElementById('cartEmail');
      if (emailEl) {
        emailEl.style.borderColor = '#ef4444';
        emailEl.style.boxShadow = '0 0 0 3px rgba(239,68,68,.12)';
      }
      showCartError('Geçerli bir e-posta adresi girin.');
      return;
    }

    // Butonu yükleniyor durumuna al
    const origHtml = cartCheckoutBtn.innerHTML;
    cartCheckoutBtn.disabled = true;
    cartCheckoutBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Yükleniyor...';

    // Sepet ürünlerini iyzico formatına çevir
    const basketItems = cart.items.map(item => ({
      id: item.product,
      name: item.name,
      category: 'Takviye Ürünleri',
      price: (item.price * item.qty).toFixed(2),
    }));

    const totalPrice = cart.total();
    // Tam adres oluştur
    const fullAddress = [address, district, zip].filter(Boolean).join(', ') || 'Türkiye';

    const payload = {
      firstName,
      lastName,
      email,
      phone,
      address:        fullAddress,
      addressLine:    address,
      district:       district,
      city:           city || 'Istanbul',
      zip:            zip,
      country:        'Turkey',
      basketItems,
      price:          totalPrice.toFixed(2),
      installment,
      callbackUrl:    window.location.origin + '/api/payment-callback',
      conversationId: 'pd-' + Date.now(),
    };

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      // Butonu eski haline getir
      cartCheckoutBtn.disabled = false;
      cartCheckoutBtn.innerHTML = origHtml;
      if (typeof lucide !== 'undefined') lucide.createIcons();

      if (result.status === 'success' && result.checkoutFormContent) {
        closeCartDrawer();
        openIyzicoCheckout(result.checkoutFormContent);
      } else {
        const msg = result.errorMessage || result.error || 'Ödeme başlatılamadı.';
        showCartError(msg);
      }
    } catch (err) {
      cartCheckoutBtn.disabled = false;
      cartCheckoutBtn.innerHTML = origHtml;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      showCartError('Sunucu bağlantı hatası. Lütfen tekrar deneyin.');
      console.error('Sepet checkout hatası:', err);
    }
  });
}

function showCartError(message) {
  let errEl = document.getElementById('cartErrorMsg');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.id = 'cartErrorMsg';
    errEl.style.cssText = `
      background:#fef2f2;border:1px solid #fecaca;color:#dc2626;
      padding:10px 14px;border-radius:10px;font-size:.82rem;
      margin-bottom:10px;display:flex;align-items:center;gap:8px;
    `;
    const footer = document.getElementById('cartFooter');
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    if (footer && checkoutBtn) footer.insertBefore(errEl, checkoutBtn);
  }
  errEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${message}`;
  errEl.style.display = 'flex';
  setTimeout(() => { if (errEl) errEl.style.display = 'none'; }, 5000);
}

// Sepete Ekle butonları
document.querySelectorAll('.btn-buy').forEach(btn => {
  btn.addEventListener('click', () => {
    const product = btn.dataset.product;
    const price   = parseInt(btn.dataset.price, 10);
    const name    = productNameMap[product] || product;
    const image   = productImageMap[product] || 'images/tekli.jpeg';

    // Sepete ekle
    cart.add(product, price, name, image);

    // Buton animasyonu
    btn.classList.add('adding');
    const origText = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Eklendi!';
    btn.classList.add('added');
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.classList.remove('adding', 'added');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 1500);

    // Sepet drawer'ı kısa süre sonra aç
    setTimeout(openCartDrawer, 400);
  });
});

// Modal kapat
if (modalClose) modalClose.addEventListener('click', closePaymentModal);
if (paymentModal) {
  paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) closePaymentModal();
  });
}

// Taksit seçimi
document.querySelectorAll('.installment-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.installment-opt').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    const val = parseInt(opt.querySelector('input').value, 10);
    const total = val === 1
      ? formatPrice(currentPrice)
      : formatPrice(Math.ceil(currentPrice / val) * val);
    if (summaryTotal) summaryTotal.textContent = total;
    if (payBtnTotal)  payBtnTotal.textContent  = total;
  });
});

// Ödeme formu gönder — iyzico entegrasyonu
if (paymentForm) {
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Form alanlarından ID ile güvenli şekilde al
    const firstName = document.getElementById('payFirstName')?.value?.trim() || '';
    const lastName  = document.getElementById('payLastName')?.value?.trim()  || '';
    const email     = document.getElementById('payEmail')?.value?.trim()     || '';
    const phone     = document.getElementById('payPhone')?.value?.trim()     || '';

    if (!firstName || !lastName || !email || !phone) {
      showPaymentError('Lütfen tüm kişisel bilgileri doldurun (ad, soyad, e-posta, telefon).');
      return;
    }

    // E-posta format kontrolü
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const emailEl = document.getElementById('payEmail');
      if (emailEl) {
        emailEl.style.borderColor = '#ef4444';
        emailEl.style.boxShadow = '0 0 0 3px rgba(239,68,68,.12)';
        emailEl.addEventListener('input', () => {
          emailEl.style.borderColor = '';
          emailEl.style.boxShadow = '';
        }, { once: true });
      }
      showPaymentError('Geçerli bir e-posta adresi girin.');
      return;
    }

    await initiateIyzicoPayment({ firstName, lastName, email, phone });
  });
}

// Başarılı ödemede sepeti temizle
document.getElementById('successClose')?.addEventListener('click', () => {
  cart.clear();
}, { once: false });

// Başarı modalı kapat
if (successClose) {
  successClose.addEventListener('click', () => {
    successModal.classList.remove('active');
    document.body.style.overflow = '';
    if (paymentForm) paymentForm.reset();
  });
}
if (successModal) {
  successModal.addEventListener('click', (e) => {
    if (e.target === successModal) {
      successModal.classList.remove('active');
      document.body.style.overflow = '';
      if (paymentForm) paymentForm.reset();
    }
  });
}

/* ── Kart Numarası Formatlama ── */
const cardNumberInput = document.getElementById('cardNumber');
if (cardNumberInput) {
  cardNumberInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    val = val.replace(/(.{4})/g, '$1 ').trim();
    e.target.value = val;
  });
}

/* ── Son Kullanma Tarihi Formatlama ── */
const cardExpiryInput = document.getElementById('cardExpiry');
if (cardExpiryInput) {
  cardExpiryInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 2) val = val.substring(0, 2) + '/' + val.substring(2);
    e.target.value = val;
  });
}

/* ── Active Nav Link ── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 120;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });
  navLinks.forEach(link => {
    link.style.color = '';
    if (link.getAttribute('href') === '#' + current) {
      link.style.color = '#a8e063';
    }
  });
});

/* ── Countdown Timer (Kampanya) ── */
function startCountdown() {
  const end = new Date();
  end.setHours(23, 59, 59, 0);

  function tick() {
    const now  = new Date();
    const diff = end - now;
    if (diff <= 0) return;

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const el = document.getElementById('countdown');
    if (el) {
      el.textContent =
        String(h).padStart(2, '0') + ':' +
        String(m).padStart(2, '0') + ':' +
        String(s).padStart(2, '0');
    }
  }
  tick();
  setInterval(tick, 1000);
}
startCountdown();

/* ── Footer İletişim Formu ── */
const footerContactForm = document.getElementById('footerContactForm');
const footerFormSuccess = document.getElementById('footerFormSuccess');

if (footerContactForm) {
  footerContactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name    = document.getElementById('fcName')?.value || '';
    const email   = document.getElementById('fcEmail')?.value || '';
    const message = document.getElementById('fcMessage')?.value || '';

    // mailto ile e-posta aç (backend olmadan çalışır)
    const subject = encodeURIComponent('Promil Detoks İletişim: ' + name);
    const body    = encodeURIComponent('Ad: ' + name + '\nE-posta: ' + email + '\n\nMesaj:\n' + message);
    window.location.href = 'mailto:info@lifemixturkey.com?subject=' + subject + '&body=' + body;

    // Başarı mesajı göster
    footerContactForm.reset();
    if (footerFormSuccess) {
      footerFormSuccess.style.display = 'flex';
      setTimeout(() => { footerFormSuccess.style.display = 'none'; }, 5000);
    }
  });
}

/* ── Bayilik Başvuru Formu ── */
const dealerForm = document.getElementById('dealerForm');
if (dealerForm) {
  const whatsappBtn = document.getElementById('dealerWhatsappBtn');
  const successEl = document.getElementById('dealerFormSuccess');
  const errorEl   = document.getElementById('dealerFormError');

  const buildWhatsappMessage = () => {
    const dealer = {
      name:       document.getElementById('dealerName')?.value.trim() || '',
      company:    document.getElementById('dealerCompany')?.value.trim() || '',
      email:      document.getElementById('dealerEmail')?.value.trim() || '',
      phone:      document.getElementById('dealerPhone')?.value.trim() || '',
      city:       document.getElementById('dealerCity')?.value.trim() || '',
      region:     document.getElementById('dealerRegion')?.value.trim() || '',
      experience: document.getElementById('dealerExperience')?.value || '',
      message:    document.getElementById('dealerMessage')?.value.trim() || ''
    };

    return `Yeni Bayilik Başvurusu:\n` +
      `Ad Soyad: ${dealer.name}\n` +
      `Şirket: ${dealer.company}\n` +
      `E-posta: ${dealer.email}\n` +
      `Telefon: ${dealer.phone}\n` +
      `Şehir: ${dealer.city}${dealer.region ? ' / ' + dealer.region : ''}\n` +
      `Deneyim: ${dealer.experience}\n\n` +
      `Mesaj: ${dealer.message}`;
  };

  const openWhatsapp = (e) => {
    e.preventDefault();
    if (!dealerForm.checkValidity()) {
      dealerForm.reportValidity();
      return;
    }

    if (successEl) successEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';

    const message = buildWhatsappMessage();
    const whatsappUrl = `https://api.whatsapp.com/send?phone=905316690964&autoload=1&app_absent=0&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    if (successEl) {
      successEl.style.display = 'flex';
      setTimeout(() => { successEl.style.display = 'none'; }, 5000);
    }
  };

  if (whatsappBtn) whatsappBtn.addEventListener('click', openWhatsapp);
  dealerForm.addEventListener('submit', openWhatsapp);
}

/* ── Sticky CTA Bar (mobile) – devre dışı, mobile-bottom-nav kullanılıyor ── */
// createStickyCTA() kaldırıldı: .mobile-bottom-nav ile çakışıyordu

console.log('%c🌿 Promil Detoks', 'color:#2e9e35;font-size:20px;font-weight:bold;');
console.log('%cDoğanın gücüyle arın.', 'color:#00a884;font-size:14px;');
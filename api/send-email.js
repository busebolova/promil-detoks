// api/send-email.js — Vercel Serverless Function
// Ödeme sonrası müşteriye ve işletmeye e-posta gönderir (SMTP ile)

'use strict';

const nodemailer = require('nodemailer');

const SMTP_HOST       = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT       = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER       = process.env.SMTP_USER || process.env.GMAIL_USER || '';
const SMTP_PASS       = process.env.SMTP_PASS || process.env.GMAIL_PASS || '';
const FROM_EMAIL      = process.env.FROM_EMAIL || SMTP_USER || 'siparis@promildetoks.com';
const ADMIN_EMAIL     = process.env.ADMIN_EMAIL || 'info@lifemixturkey.com';
const ADMIN_EMAIL2    = process.env.ADMIN_EMAIL2 || 'lifemixgida@gmail.com';

// ── SMTP ile e-posta gönder ──
async function sendViaSmtp(to, subject, html) {
  const transportConfig = {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS.replace(/\s/g, ''),
    },
    tls: {
      rejectUnauthorized: false,
    },
  };

  console.log('[smtp] Bağlantı:', {
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER,
    passLength: SMTP_PASS ? SMTP_PASS.replace(/\s/g, '').length : 0,
  });

  const transporter = nodemailer.createTransport(transportConfig);

  try {
    await transporter.verify();
    console.log('[smtp] Bağlantı doğrulandı.');
  } catch (verifyErr) {
    console.error('[smtp] Bağlantı doğrulama hatası:', verifyErr.message);
    throw new Error('SMTP bağlantı hatası: ' + verifyErr.message);
  }

  return transporter.sendMail({
    from: `"Promil Detoks" <${FROM_EMAIL}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
  });
}

// ── Gönderici seç: sadece SMTP ──
async function sendEmail(to, subject, html) {
  if (SMTP_USER && SMTP_PASS) {
    console.log('[email] SMTP ile gönderiliyor:', to);
    return sendViaSmtp(to, subject, html);
  } else {
    throw new Error('E-posta yapılandırması eksik. SMTP_USER ve SMTP_PASS gerekli.');
  }
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Müşteri sipariş onay e-postası ──
function customerOrderEmailHtml({ firstName, lastName, orderId, items, total, phone, email, address, addressLine, district, city, zip }) {
  const itemRows = (items || []).map(item => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #edf7ef;font-size:14px;color:#1a1a1a;">${escHtml(item.name)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #edf7ef;font-size:14px;color:#1a1a1a;text-align:center;">${item.qty || 1}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #edf7ef;font-size:14px;color:#15803d;font-weight:700;text-align:right;">₺${parseFloat(item.price || 0).toLocaleString('tr-TR')}</td>
    </tr>
  `).join('');

  const deliveryAddr = address || [addressLine, district, city, zip].filter(Boolean).join(', ') || '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Siparişiniz Alındı – Promil Detoks</title>
</head>
<body style="margin:0;padding:0;background:#f7fdf8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fdf8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e,#14b8a6);padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Promil Detoks</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Doğanın gücüyle arın.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <div style="width:72px;height:72px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:36px;line-height:1;">✓</span>
              </div>
              <h2 style="margin:0 0 8px;color:#050f07;font-size:24px;font-weight:700;">Siparişiniz Alındı!</h2>
              <p style="margin:0;color:#3d6b45;font-size:15px;">Merhaba ${escHtml(firstName)} ${escHtml(lastName)}, siparişiniz başarıyla oluşturuldu.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="background:#f7fdf8;border-radius:12px;padding:20px;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:12px;color:#7aab82;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Sipariş No</p>
                <p style="margin:0;font-size:16px;color:#050f07;font-weight:700;">#${escHtml(String(orderId || 'PD-' + Date.now()))}</p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #edf7ef;border-radius:12px;overflow:hidden;">
                <thead>
                  <tr style="background:#f7fdf8;">
                    <th style="padding:12px 16px;text-align:left;font-size:12px;color:#7aab82;font-weight:700;text-transform:uppercase;">Ürün</th>
                    <th style="padding:12px 16px;text-align:center;font-size:12px;color:#7aab82;font-weight:700;text-transform:uppercase;">Adet</th>
                    <th style="padding:12px 16px;text-align:right;font-size:12px;color:#7aab82;font-weight:700;text-transform:uppercase;">Fiyat</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding:14px 16px;font-size:14px;color:#3d6b45;font-weight:600;">Kargo</td>
                    <td style="padding:14px 16px;text-align:right;font-size:14px;color:#16a34a;font-weight:700;">Ücretsiz</td>
                  </tr>
                  <tr style="background:#f7fdf8;">
                    <td colspan="2" style="padding:14px 16px;font-size:16px;color:#050f07;font-weight:800;">Toplam</td>
                    <td style="padding:14px 16px;text-align:right;font-size:18px;color:#15803d;font-weight:800;">₺${parseFloat(total || 0).toLocaleString('tr-TR')}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;">
                <p style="margin:0 0 12px;font-size:14px;color:#15803d;font-weight:700;">📦 Siparişiniz Hakkında</p>
                ${deliveryAddr ? `<p style="margin:0 0 8px;font-size:13px;color:#3d6b45;line-height:1.6;"><strong>Teslimat Adresi:</strong> ${escHtml(deliveryAddr)}</p>` : ''}
                <p style="margin:0 0 8px;font-size:13px;color:#3d6b45;line-height:1.6;">Siparişiniz en kısa sürede hazırlanarak kargoya verilecektir. Kargo takip numaranız SMS ile iletilecektir.</p>
                <p style="margin:0;font-size:13px;color:#3d6b45;">Sorularınız için: <a href="mailto:info@lifemixturkey.com" style="color:#16a34a;font-weight:600;">info@lifemixturkey.com</a> | <a href="tel:+905316690964" style="color:#16a34a;font-weight:600;">0531 669 09 64</a></p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 40px;text-align:center;border-top:1px solid #edf7ef;margin-top:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:#7aab82;">Bu e-posta <strong>Promil Detoks</strong> tarafından gönderilmiştir.</p>
              <p style="margin:0;font-size:12px;color:#7aab82;">LİFEMİX GIDA ÜRÜNLERİ SAN. VE TİC. LTD. ŞTİ. | Gaziantep, Türkiye</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── İşletme sipariş bildirim e-postası ──
function adminOrderEmailHtml({ firstName, lastName, email, phone, orderId, items, total, address, addressLine, district, city, zip }) {
  const deliveryAddr = address || [addressLine, district, city, zip].filter(Boolean).join(', ') || '';
  const itemList = (items || []).map(i =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${escHtml(i.name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${i.qty || 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;font-weight:700;color:#15803d;">₺${parseFloat(i.price || 0).toLocaleString('tr-TR')}</td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8" /><title>Yeni Sipariş – Promil Detoks</title></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);max-width:560px;width:100%;">
          <tr>
            <td style="background:#15803d;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">🛒 Yeni Sipariş Alındı!</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Promil Detoks Admin Bildirimi</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#6b7280;width:130px;">Sipariş No</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:700;color:#111;">#${escHtml(String(orderId || ''))}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#6b7280;">Müşteri Adı</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111;">${escHtml(firstName)} ${escHtml(lastName)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#6b7280;">E-posta</td>
                  <td style="padding:8px 0;font-size:14px;color:#2563eb;"><a href="mailto:${escHtml(email)}" style="color:#2563eb;">${escHtml(email)}</a></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#6b7280;">Telefon</td>
                  <td style="padding:8px 0;font-size:14px;color:#111;"><a href="tel:${escHtml(phone)}" style="color:#111;">${escHtml(phone)}</a></td>
                </tr>
                ${deliveryAddr ? `<tr>
                  <td style="padding:8px 0;font-size:13px;color:#6b7280;vertical-align:top;">Teslimat Adresi</td>
                  <td style="padding:8px 0;font-size:14px;color:#111;line-height:1.5;">${escHtml(deliveryAddr)}</td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">Sipariş Detayı</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;">Ürün</th>
                    <th style="padding:8px 12px;text-align:center;font-size:12px;color:#6b7280;">Adet</th>
                    <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;">Fiyat</th>
                  </tr>
                </thead>
                <tbody>${itemList}</tbody>
                <tfoot>
                  <tr style="background:#f0fdf4;">
                    <td colspan="2" style="padding:10px 12px;font-size:14px;font-weight:800;color:#111;">TOPLAM</td>
                    <td style="padding:10px 12px;text-align:right;font-size:16px;font-weight:800;color:#15803d;">₺${parseFloat(total || 0).toLocaleString('tr-TR')}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px;text-align:center;">
              <a href="https://promildetoks.com/admin" style="display:inline-block;background:#15803d;color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">Admin Panele Git →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Hoş Geldin (Kayıt) e-postası ──
function welcomeEmailHtml({ firstName, lastName, email }) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hoş Geldiniz – Promil Detoks</title>
</head>
<body style="margin:0;padding:0;background:#f7fdf8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fdf8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e,#14b8a6);padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Promil Detoks</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Doğanın gücüyle arın.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <div style="width:72px;height:72px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:36px;line-height:1;">👋</span>
              </div>
              <h2 style="margin:0 0 8px;color:#050f07;font-size:24px;font-weight:700;">Hoş Geldiniz, ${escHtml(firstName)}!</h2>
              <p style="margin:0;color:#3d6b45;font-size:15px;">Promil Detoks ailesine katıldığınız için teşekkürler.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;">
                <p style="margin:0 0 16px;font-size:15px;color:#15803d;font-weight:700;">Hesabınız başarıyla oluşturuldu! 🎉</p>
                <p style="margin:0 0 12px;font-size:14px;color:#3d6b45;line-height:1.7;">Artık siparişlerinizi takip edebilir, adres bilgilerinizi kaydedebilir ve profil bilgilerinizi yönetebilirsiniz.</p>
                <p style="margin:0;font-size:14px;color:#3d6b45;line-height:1.7;"><strong>E-posta:</strong> ${escHtml(email)}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;text-align:center;">
              <a href="https://promildetoks.com/profil.html" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#14b8a6);color:#fff;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;text-decoration:none;box-shadow:0 4px 16px rgba(34,197,94,0.3);">Profilime Git →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="background:#f7fdf8;border-radius:12px;padding:20px;">
                <p style="margin:0 0 12px;font-size:14px;color:#15803d;font-weight:700;">🌿 Promil Detoks Hakkında</p>
                <p style="margin:0;font-size:13px;color:#3d6b45;line-height:1.7;">Alkol sonrası toparlanmayı destekleyen bitkisel formüllü ürünlerimizle güne hazır uyanın. Türkiye'de yasal izinli, klinik analizi tamamlanmış güvenli ürün.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 40px;text-align:center;border-top:1px solid #edf7ef;margin-top:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:#7aab82;">Sorularınız için: <a href="mailto:info@lifemixturkey.com" style="color:#16a34a;font-weight:600;">info@lifemixturkey.com</a></p>
              <p style="margin:0;font-size:12px;color:#7aab82;">LİFEMİX GIDA ÜRÜNLERİ SAN. VE TİC. LTD. ŞTİ. | Gaziantep, Türkiye</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Admin yeni üye bildirimi ──
function adminNewUserEmailHtml({ firstName, lastName, email, phone, createdAt }) {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8" /><title>Yeni Üye – Promil Detoks</title></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);max-width:520px;width:100%;">
          <tr>
            <td style="background:#0d9488;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">👤 Yeni Üye Kaydı!</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Promil Detoks Admin Bildirimi</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#6b7280;width:120px;">Ad Soyad</td>
                  <td style="padding:8px 0;font-size:14px;font-weight:700;color:#111;">${escHtml(firstName)} ${escHtml(lastName)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#6b7280;">E-posta</td>
                  <td style="padding:8px 0;font-size:14px;color:#2563eb;"><a href="mailto:${escHtml(email)}" style="color:#2563eb;">${escHtml(email)}</a></td>
                </tr>
                ${phone ? `<tr>
                  <td style="padding:8px 0;font-size:13px;color:#6b7280;">Telefon</td>
                  <td style="padding:8px 0;font-size:14px;color:#111;">${escHtml(phone)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#6b7280;">Kayıt Tarihi</td>
                  <td style="padding:8px 0;font-size:14px;color:#111;">${new Date(createdAt || Date.now()).toLocaleString('tr-TR')}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;text-align:center;">
              <a href="https://promildetoks.com/admin" style="display:inline-block;background:#0d9488;color:#fff;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">Admin Panele Git →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


// ── Şifre Değişikliği Bildirimi (kullanıcıya) ──
function passwordChangeEmailHtml({ firstName, lastName, email }) {
  const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Şifreniz Değiştirildi – Promil Detoks</title>
</head>
<body style="margin:0;padding:0;background:#f7fdf8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fdf8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e,#14b8a6);padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Promil Detoks</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Hesap Güvenlik Bildirimi</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <div style="width:72px;height:72px;background:#fef3c7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:36px;line-height:1;">🔐</span>
              </div>
              <h2 style="margin:0 0 8px;color:#050f07;font-size:22px;font-weight:700;">Şifreniz Değiştirildi</h2>
              <p style="margin:0;color:#3d6b45;font-size:15px;">Merhaba ${escHtml(firstName)} ${escHtml(lastName)},</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;">
                <p style="margin:0 0 12px;font-size:14px;color:#15803d;font-weight:700;">✅ Şifre başarıyla güncellendi</p>
                <p style="margin:0 0 12px;font-size:14px;color:#3d6b45;line-height:1.7;">Hesabınızın şifresi <strong>${now}</strong> tarihinde değiştirildi.</p>
                <p style="margin:0;font-size:14px;color:#3d6b45;line-height:1.7;">Bu işlemi siz yapmadıysanız lütfen hemen bizimle iletişime geçin: <a href="mailto:info@lifemixturkey.com" style="color:#16a34a;font-weight:600;">info@lifemixturkey.com</a></p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;text-align:center;">
              <a href="https://promildetoks.com/profil.html" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#14b8a6);color:#fff;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;text-decoration:none;">Hesabıma Git →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 40px;text-align:center;border-top:1px solid #edf7ef;margin-top:32px;">
              <p style="margin:0 0 8px;font-size:13px;color:#7aab82;">Sorularınız için: <a href="mailto:info@lifemixturkey.com" style="color:#16a34a;font-weight:600;">info@lifemixturkey.com</a></p>
              <p style="margin:0;font-size:12px;color:#7aab82;">LİFEMİX GIDA ÜRÜNLERİ SAN. VE TİC. LTD. ŞTİ. | Gaziantep, Türkiye</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Profil Güncelleme Bildirimi (kullanıcıya) ──
function profileUpdateEmailHtml({ firstName, lastName, email, phone, changedFields }) {
  const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const fieldsList = (changedFields || []).map(f => `<li style="font-size:14px;color:#3d6b45;line-height:1.8;">${escHtml(f)}</li>`).join('');
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Profil Güncellendi – Promil Detoks</title>
</head>
<body style="margin:0;padding:0;background:#f7fdf8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fdf8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e,#14b8a6);padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Promil Detoks</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Hesap Bilgileri Güncellendi</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <div style="width:72px;height:72px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:36px;line-height:1;">👤</span>
              </div>
              <h2 style="margin:0 0 8px;color:#050f07;font-size:22px;font-weight:700;">Profil Bilgileriniz Güncellendi</h2>
              <p style="margin:0;color:#3d6b45;font-size:15px;">Merhaba ${escHtml(firstName)} ${escHtml(lastName)},</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;">
                <p style="margin:0 0 12px;font-size:14px;color:#15803d;font-weight:700;">✅ Güncelleme başarılı</p>
                <p style="margin:0 0 8px;font-size:14px;color:#3d6b45;"><strong>Tarih:</strong> ${now}</p>
                ${phone ? `<p style="margin:0 0 8px;font-size:14px;color:#3d6b45;"><strong>Telefon:</strong> ${escHtml(phone)}</p>` : ''}
                <p style="margin:0;font-size:14px;color:#3d6b45;line-height:1.7;">Bu işlemi siz yapmadıysanız lütfen hemen bizimle iletişime geçin: <a href="mailto:info@lifemixturkey.com" style="color:#16a34a;font-weight:600;">info@lifemixturkey.com</a></p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;text-align:center;">
              <a href="https://promildetoks.com/profil.html" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#14b8a6);color:#fff;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;text-decoration:none;">Profilime Git →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 40px;text-align:center;border-top:1px solid #edf7ef;margin-top:32px;">
              <p style="margin:0;font-size:12px;color:#7aab82;">LİFEMİX GIDA ÜRÜNLERİ SAN. VE TİC. LTD. ŞTİ. | Gaziantep, Türkiye</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Adres Güncelleme Bildirimi (kullanıcıya) ──
function addressUpdateEmailHtml({ firstName, lastName, email, phone, address, city, district, zip }) {
  const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
  const fullAddr = [address, district, city, zip].filter(Boolean).join(', ');
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Adres Güncellendi – Promil Detoks</title>
</head>
<body style="margin:0;padding:0;background:#f7fdf8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fdf8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e,#14b8a6);padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Promil Detoks</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Teslimat Adresi Güncellendi</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <div style="width:72px;height:72px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:36px;line-height:1;">📍</span>
              </div>
              <h2 style="margin:0 0 8px;color:#050f07;font-size:22px;font-weight:700;">Adres Bilgileriniz Güncellendi</h2>
              <p style="margin:0;color:#3d6b45;font-size:15px;">Merhaba ${escHtml(firstName)} ${escHtml(lastName)},</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;">
                <p style="margin:0 0 12px;font-size:14px;color:#15803d;font-weight:700;">✅ Adres başarıyla güncellendi</p>
                <p style="margin:0 0 8px;font-size:14px;color:#3d6b45;"><strong>Tarih:</strong> ${now}</p>
                ${fullAddr ? `<p style="margin:0 0 8px;font-size:14px;color:#3d6b45;"><strong>Yeni Adres:</strong> ${escHtml(fullAddr)}</p>` : ''}
                <p style="margin:0;font-size:14px;color:#3d6b45;line-height:1.7;">Bu işlemi siz yapmadıysanız lütfen hemen bizimle iletişime geçin: <a href="mailto:info@lifemixturkey.com" style="color:#16a34a;font-weight:600;">info@lifemixturkey.com</a></p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;text-align:center;">
              <a href="https://promildetoks.com/profil.html" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#14b8a6);color:#fff;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;text-decoration:none;">Profilime Git →</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 40px;text-align:center;border-top:1px solid #edf7ef;margin-top:32px;">
              <p style="margin:0;font-size:12px;color:#7aab82;">LİFEMİX GIDA ÜRÜNLERİ SAN. VE TİC. LTD. ŞTİ. | Gaziantep, Türkiye</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Ana handler (doğrudan POST ile çağrıldığında) ──
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[email] SMTP yapılandırması eksik.');
    return res.status(200).json({ warning: 'SMTP yapılandırması eksik, mail gönderilemedi.' });
  }

  let body = req.body;
  if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString('utf8')); } catch (e) { body = {}; }
  } else if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const { type, firstName, lastName, email, phone, orderId, items, total, address, addressLine, district, city, zip, createdAt } = body;

  if (!email || !firstName) {
    return res.status(400).json({ error: 'email ve firstName zorunludur.' });
  }

  const results = { errors: [] };
  const addrData = { address, addressLine, district, city, zip };

  if (type === 'password_change') {
    // Şifre değişikliği bildirimi
    try {
      await sendEmail(email, 'Şifreniz Değiştirildi – Promil Detoks 🔐', passwordChangeEmailHtml({ firstName, lastName, email }));
      console.log('[email] Şifre değişikliği maili gönderildi:', email);
      results.passwordChange = 'sent';
    } catch (err) {
      console.error('[email] Şifre değişikliği maili hatası:', err.message);
      results.errors.push('Şifre değişikliği maili: ' + err.message);
    }
  } else if (type === 'profile_update') {
    // Profil güncelleme bildirimi
    try {
      await sendEmail(email, 'Profil Bilgileriniz Güncellendi – Promil Detoks', profileUpdateEmailHtml({ firstName, lastName, email, phone, changedFields: body.changedFields }));
      console.log('[email] Profil güncelleme maili gönderildi:', email);
      results.profileUpdate = 'sent';
    } catch (err) {
      console.error('[email] Profil güncelleme maili hatası:', err.message);
      results.errors.push('Profil güncelleme maili: ' + err.message);
    }
  } else if (type === 'address_update') {
    // Adres güncelleme bildirimi
    try {
      await sendEmail(email, 'Adres Bilgileriniz Güncellendi – Promil Detoks 📍', addressUpdateEmailHtml({ firstName, lastName, email, phone, address: body.address, city: body.city, district: body.district, zip: body.zip }));
      console.log('[email] Adres güncelleme maili gönderildi:', email);
      results.addressUpdate = 'sent';
    } catch (err) {
      console.error('[email] Adres güncelleme maili hatası:', err.message);
      results.errors.push('Adres güncelleme maili: ' + err.message);
    }
  } else if (type === 'welcome') {
    // Kayıt hoş geldin maili
    try {
      await sendEmail(email, 'Promil Detoks\'a Hoş Geldiniz! 🌿', welcomeEmailHtml({ firstName, lastName, email }));
      console.log('[email] Hoş geldin maili gönderildi:', email);
      results.welcome = 'sent';
    } catch (err) {
      console.error('[email] Hoş geldin maili hatası:', err.message);
      results.errors.push('Hoş geldin maili: ' + err.message);
    }
    // Admin'e yeni üye bildirimi
    try {
      await sendEmail(ADMIN_EMAIL, `👤 Yeni Üye: ${firstName} ${lastName}`, adminNewUserEmailHtml({ firstName, lastName, email, phone, createdAt }));
      if (ADMIN_EMAIL2 && ADMIN_EMAIL2 !== ADMIN_EMAIL) {
        await sendEmail(ADMIN_EMAIL2, `👤 Yeni Üye: ${firstName} ${lastName}`, adminNewUserEmailHtml({ firstName, lastName, email, phone, createdAt }));
      }
      results.admin = 'sent';
    } catch (err) {
      console.error('[email] Admin yeni üye maili hatası:', err.message);
      results.errors.push('Admin yeni üye maili: ' + err.message);
    }
  } else {
    // Sipariş maili (varsayılan)
    try {
      await sendEmail(email, `Siparişiniz Alındı – Promil Detoks #${orderId || ''}`, customerOrderEmailHtml({ firstName, lastName, orderId, items, total, phone, email, ...addrData }));
      console.log('[email] Müşteri sipariş maili gönderildi:', email);
      results.customer = 'sent';
    } catch (err) {
      console.error('[email] Müşteri sipariş maili hatası:', err.message);
      results.errors.push('Müşteri maili: ' + err.message);
    }
    try {
      await sendEmail(ADMIN_EMAIL, `🛒 Yeni Sipariş: ${firstName} ${lastName} – ₺${total}`, adminOrderEmailHtml({ firstName, lastName, email, phone, orderId, items, total, ...addrData }));
      if (ADMIN_EMAIL2 && ADMIN_EMAIL2 !== ADMIN_EMAIL) {
        await sendEmail(ADMIN_EMAIL2, `🛒 Yeni Sipariş: ${firstName} ${lastName} – ₺${total}`, adminOrderEmailHtml({ firstName, lastName, email, phone, orderId, items, total, ...addrData }));
      }
      console.log('[email] Admin sipariş maili gönderildi');
      results.admin = 'sent';
    } catch (err) {
      console.error('[email] Admin sipariş maili hatası:', err.message);
      results.errors.push('Admin maili: ' + err.message);
    }
  }

  return res.status(200).json({
    status: results.errors.length === 0 ? 'success' : 'partial',
    ...results,
  });
};

// ── Modül olarak da kullanılabilir ──
module.exports.sendEmail              = sendEmail;
module.exports.customerOrderEmailHtml  = customerOrderEmailHtml;
module.exports.adminOrderEmailHtml     = adminOrderEmailHtml;
module.exports.welcomeEmailHtml        = welcomeEmailHtml;
module.exports.adminNewUserEmailHtml   = adminNewUserEmailHtml;
module.exports.passwordChangeEmailHtml = passwordChangeEmailHtml;
module.exports.profileUpdateEmailHtml  = profileUpdateEmailHtml;
module.exports.addressUpdateEmailHtml  = addressUpdateEmailHtml;
module.exports.escHtml                 = escHtml;
module.exports.ADMIN_EMAIL             = ADMIN_EMAIL;
module.exports.ADMIN_EMAIL2            = ADMIN_EMAIL2;
module.exports.FROM_EMAIL              = FROM_EMAIL;
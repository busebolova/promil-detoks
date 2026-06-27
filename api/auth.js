// api/auth.js — Kullanıcı kayıt/giriş/profil API
// Vercel Serverless Function

const https = require('https');
const crypto = require('crypto');
const emailMod = require('./send-email');

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO || 'busebolova/promil-detoks';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const USERS_PATH    = 'data/users.json';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'promil_salt_2026').digest('hex');
}

function generateToken(userId) {
  return crypto.createHash('sha256').update(userId + Date.now() + 'promil_token_2026').digest('hex');
}

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'promil-detoks-app',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.message || `GitHub API hatası: ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('GitHub API JSON parse hatası: ' + data));
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function getUsersFile() {
  try {
    const data = await githubRequest(
      'GET',
      `/repos/${GITHUB_REPO}/contents/${USERS_PATH}?ref=${GITHUB_BRANCH}`
    );
    const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    return { users: JSON.parse(content), sha: data.sha };
  } catch (err) {
    if (err.message && err.message.includes('Not Found')) {
      return { users: [], sha: null };
    }
    throw err;
  }
}

async function saveUsersFile(users, sha) {
  const content = Buffer.from(JSON.stringify(users, null, 2)).toString('base64');
  const body = {
    message: `[Kullanıcı] Kullanıcı verisi güncellendi - ${new Date().toLocaleString('tr-TR')}`,
    content,
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  return githubRequest(
    'PUT',
    `/repos/${GITHUB_REPO}/contents/${USERS_PATH}`,
    body
  );
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;

  // ── KAYIT ──
  if (action === 'register' && req.method === 'POST') {
    const { firstName, lastName, email, phone, password, address, city, district, zip } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'Ad, soyad, e-posta ve şifre zorunludur.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    }

    try {
      const { users, sha } = await getUsersFile();

      const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(409).json({ error: 'Bu e-posta adresi zaten kayıtlı.' });
      }

      const userId = 'USR-' + Date.now();
      const token = generateToken(userId);

      const newUser = {
        id: userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || '',
        passwordHash: hashPassword(password),
        address: {
          line: address || '',
          city: city || '',
          district: district || '',
          zip: zip || '',
        },
        token,
        tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 gün
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      users.push(newUser);

      if (GITHUB_TOKEN) {
        await saveUsersFile(users, sha);
      }

      // Hoş geldin maili gönder (arka planda, hata olsa bile kayıt başarılı)
      try {
        const hasResend = process.env.RESEND_API_KEY &&
          process.env.RESEND_API_KEY !== 're_xxxxxxxxxxxxxxxxxxxx' &&
          process.env.RESEND_API_KEY.startsWith('re_');
        const hasSmtp = process.env.SMTP_USER && process.env.SMTP_PASS;

        if (hasResend || hasSmtp) {
          // Kullanıcıya hoş geldin maili
          await emailMod.sendEmail(
            newUser.email,
            'Promil Detoks\'a Hoş Geldiniz! 🌿',
            emailMod.welcomeEmailHtml({
              firstName: newUser.firstName,
              lastName: newUser.lastName,
              email: newUser.email,
            })
          );
          console.log('[auth] Hoş geldin maili gönderildi:', newUser.email);

          // Admin'e yeni üye bildirimi
          const ADMIN_EMAIL  = emailMod.ADMIN_EMAIL;
          const ADMIN_EMAIL2 = emailMod.ADMIN_EMAIL2;
          await emailMod.sendEmail(
            ADMIN_EMAIL,
            `👤 Yeni Üye: ${newUser.firstName} ${newUser.lastName}`,
            emailMod.adminNewUserEmailHtml({
              firstName: newUser.firstName,
              lastName: newUser.lastName,
              email: newUser.email,
              phone: newUser.phone,
              createdAt: newUser.createdAt,
            })
          );
          if (ADMIN_EMAIL2 && ADMIN_EMAIL2 !== ADMIN_EMAIL) {
            await emailMod.sendEmail(
              ADMIN_EMAIL2,
              `👤 Yeni Üye: ${newUser.firstName} ${newUser.lastName}`,
              emailMod.adminNewUserEmailHtml({
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                phone: newUser.phone,
                createdAt: newUser.createdAt,
              })
            );
          }
          console.log('[auth] Admin yeni üye bildirimi gönderildi.');
        }
      } catch (mailErr) {
        console.error('[auth] Hoş geldin maili hatası (kayıt yine de başarılı):', mailErr.message);
      }

      // Şifreyi ve hash'i döndürme
      const { passwordHash, ...safeUser } = newUser;
      return res.status(201).json({ success: true, user: safeUser, token });

    } catch (err) {
      console.error('Kayıt hatası:', err.message);
      return res.status(500).json({ error: 'Kayıt sırasında hata oluştu.' });
    }
  }

  // ── GİRİŞ ──
  if (action === 'login' && req.method === 'POST') {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-posta ve şifre zorunludur.' });
    }

    try {
      const { users, sha } = await getUsersFile();

      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
      }

      if (user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
      }

      // Token yenile
      const token = generateToken(user.id);
      user.token = token;
      user.tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      user.updatedAt = new Date().toISOString();

      if (GITHUB_TOKEN) {
        await saveUsersFile(users, sha);
      }

      const { passwordHash, ...safeUser } = user;
      return res.status(200).json({ success: true, user: safeUser, token });

    } catch (err) {
      console.error('Giriş hatası:', err.message);
      return res.status(500).json({ error: 'Giriş sırasında hata oluştu.' });
    }
  }

  // ── PROFİL GÜNCELLE ──
  if (action === 'update' && req.method === 'POST') {
    const { token, firstName, lastName, phone, address, city, district, zip, currentPassword, newPassword } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    }

    try {
      const { users, sha } = await getUsersFile();

      const userIndex = users.findIndex(u => u.token === token && new Date(u.tokenExpiry) > new Date());
      if (userIndex === -1) {
        return res.status(401).json({ error: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.' });
      }

      const user = users[userIndex];

      if (firstName) user.firstName = firstName.trim();
      if (lastName) user.lastName = lastName.trim();
      if (phone !== undefined) user.phone = phone;
      if (!user.address) user.address = {};
      if (address !== undefined) user.address.line = address;
      if (city !== undefined) user.address.city = city;
      if (district !== undefined) user.address.district = district;
      if (zip !== undefined) user.address.zip = zip;

      // Şifre değiştirme
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Mevcut şifrenizi girin.' });
        }
        if (user.passwordHash !== hashPassword(currentPassword)) {
          return res.status(400).json({ error: 'Mevcut şifre hatalı.' });
        }
        if (newPassword.length < 6) {
          return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
        }
        user.passwordHash = hashPassword(newPassword);
      }

      user.updatedAt = new Date().toISOString();
      users[userIndex] = user;

      if (GITHUB_TOKEN) {
        await saveUsersFile(users, sha);
      }

      const { passwordHash, ...safeUser } = user;
      return res.status(200).json({ success: true, user: safeUser });

    } catch (err) {
      console.error('Profil güncelleme hatası:', err.message);
      return res.status(500).json({ error: 'Profil güncellenirken hata oluştu.' });
    }
  }

  // ── TOKEN DOĞRULA ──
  if (action === 'verify' && req.method === 'POST') {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token gerekli.' });
    }

    try {
      const { users } = await getUsersFile();

      const user = users.find(u => u.token === token && new Date(u.tokenExpiry) > new Date());
      if (!user) {
        return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
      }

      const { passwordHash, ...safeUser } = user;
      return res.status(200).json({ success: true, user: safeUser });

    } catch (err) {
      console.error('Token doğrulama hatası:', err.message);
      return res.status(500).json({ error: 'Token doğrulanırken hata oluştu.' });
    }
  }

  // ── KULLANICI SİPARİŞLERİ ──
  if (action === 'orders' && req.method === 'POST') {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    }

    try {
      const { users } = await getUsersFile();
      const user = users.find(u => u.token === token && new Date(u.tokenExpiry) > new Date());

      if (!user) {
        return res.status(401).json({ error: 'Geçersiz oturum.' });
      }

      // orders.json'dan kullanıcının siparişlerini getir
      let orders = [];
      try {
        const ordersData = await githubRequest(
          'GET',
          `/repos/${GITHUB_REPO}/contents/data/orders.json?ref=${GITHUB_BRANCH}`
        );
        const ordersContent = Buffer.from(ordersData.content.replace(/\n/g, ''), 'base64').toString('utf-8');
        const allOrders = JSON.parse(ordersContent);
        // Kullanıcının e-postasına göre filtrele
        orders = allOrders.filter(o => o.email && o.email.toLowerCase() === user.email.toLowerCase());
      } catch (e) {
        orders = [];
      }

      return res.status(200).json({ success: true, orders });

    } catch (err) {
      console.error('Sipariş getirme hatası:', err.message);
      return res.status(500).json({ error: 'Siparişler getirilirken hata oluştu.' });
    }
  }

  return res.status(404).json({ error: 'Geçersiz işlem.' });
};
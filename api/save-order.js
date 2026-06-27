// api/save-order.js — Vercel Serverless Function
// Başarılı ödeme sonrası siparişi GitHub'daki data/orders.json dosyasına kaydeder

const https = require('https');

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO || 'busebolova/promil-detoks';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const ORDERS_PATH   = 'data/orders.json';

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

async function getOrdersFile() {
  try {
    const data = await githubRequest(
      'GET',
      `/repos/${GITHUB_REPO}/contents/${ORDERS_PATH}?ref=${GITHUB_BRANCH}`
    );
    const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    return { orders: JSON.parse(content), sha: data.sha };
  } catch (err) {
    // Dosya yoksa boş array döndür
    if (err.message && err.message.includes('Not Found')) {
      return { orders: [], sha: null };
    }
    throw err;
  }
}

async function saveOrdersFile(orders, sha) {
  const content = Buffer.from(JSON.stringify(orders, null, 2)).toString('base64');
  const body = {
    message: `[Sipariş] Yeni sipariş eklendi - ${new Date().toLocaleString('tr-TR')}`,
    content,
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  return githubRequest(
    'PUT',
    `/repos/${GITHUB_REPO}/contents/${ORDERS_PATH}`,
    body
  );
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // İç servis güvenliği — sadece payment-callback'ten çağrılabilir
  const internalSecret = req.headers['x-internal-secret'];
  const expectedSecret = process.env.INTERNAL_SECRET || 'promil-internal-2026';
  if (internalSecret !== expectedSecret) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  if (!GITHUB_TOKEN) {
    console.warn('GITHUB_TOKEN tanımlı değil, sipariş kaydedilemedi.');
    return res.status(200).json({ warning: 'GITHUB_TOKEN eksik, sipariş kaydedilemedi.' });
  }

  const {
    orderId,
    firstName,
    lastName,
    email,
    phone,
    address,
    addressLine,
    district,
    city,
    zip,
    country,
    items,
    total,
    paymentId,
    createdAt,
  } = req.body;

  if (!orderId || !email) {
    return res.status(400).json({ error: 'orderId ve email zorunludur.' });
  }

  try {
    const { orders, sha } = await getOrdersFile();

    const newOrder = {
      id: orderId,
      name: `${firstName || ''} ${lastName || ''}`.trim(),
      email: email || '',
      phone: phone || '',
      address: address || '',
      addressLine: addressLine || '',
      district: district || '',
      city: city || '',
      zip: zip || '',
      country: country || 'Turkey',
      product: items && items.length > 0
        ? items.map(i => i.name).join(', ')
        : 'Promil Detoks',
      items: items || [],
      total: parseFloat(total) || 0,
      paymentId: paymentId || '',
      status: 'pending',
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    orders.unshift(newOrder); // En yeni sipariş başa ekle

    await saveOrdersFile(orders, sha);

    return res.status(200).json({ success: true, orderId });
  } catch (err) {
    console.error('Sipariş kaydetme hatası:', err.message);
    // Sipariş kaydı başarısız olsa bile ödeme başarılıydı, hata döndürme
    return res.status(200).json({ warning: 'Sipariş kaydedilemedi: ' + err.message });
  }
};
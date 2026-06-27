// api/payment-callback.js — Vercel Serverless Function
// İyzico ödeme sonucu doğrulama — IYZWSv2 imza algoritması
'use strict';

const crypto   = require('crypto');
const https    = require('https');
const emailMod = require('./send-email');

// ── Alfabetik JSON.stringify (iyzico HMAC uyumu) ──
function sortedStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(sortedStringify).join(',') + ']';
  var keys = Object.keys(obj).sort();
  var pairs = keys.map(function(k) { return JSON.stringify(k) + ':' + sortedStringify(obj[k]); });
  return '{' + pairs.join(',') + '}';
}


// ── İyzico IYZWSv2 imza algoritması ──
function generateAuthV2(apiKey, secretKey, randomKey, uri, body) {
  var bodyStr   = typeof body === 'string' ? body : sortedStringify(body);
  var signature = crypto
    .createHmac('sha256', secretKey)
    .update(randomKey + uri + bodyStr)
    .digest('hex');

  var authParams = [
    'apiKey:' + apiKey,
    'randomKey:' + randomKey,
    'signature:' + signature,
  ].join('&');

  return 'IYZWSv2 ' + Buffer.from(authParams).toString('base64');
}

function generateRandomKey() {
  return process.hrtime()[0] + Math.random().toString(36).slice(2);
}

// ── İyzico HTTPS POST ──
function iyziPost(hostname, path, bodyObj, apiKey, secretKey) {
  return new Promise(function(resolve, reject) {
    var bodyStr   = sortedStringify(bodyObj);
    var randomKey = generateRandomKey();
    var auth      = generateAuthV2(apiKey, secretKey, randomKey, path, bodyObj);

    var options = {
      hostname: hostname,
      path:     path,
      method:   'POST',
      headers: {
        'Content-Type':          'application/json',
        'Authorization':         auth,
        'x-iyzi-rnd':            randomKey,
        'x-iyzi-client-version': 'iyzipay-node-2.0.67',
        'Accept':                'application/json',
        'Content-Length':        Buffer.byteLength(bodyStr),
      },
    };

    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse hatasi: ' + data.substring(0, 200))); }
      });
    });

    req.setTimeout(25000, function() { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ── Body parser: URL-encoded veya JSON ──
function parseBody(req) {
  return new Promise(function(resolve) {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return resolve(req.body);
    }
    if (typeof req.body === 'string' && req.body.length > 0) {
      return resolve(parseRaw(req.body));
    }
    var chunks = [];
    req.on('data', function(chunk) { chunks.push(chunk); });
    req.on('end', function() { resolve(parseRaw(Buffer.concat(chunks).toString('utf8'))); });
    req.on('error', function() { resolve({}); });
  });
}

function parseRaw(raw) {
  if (!raw || !raw.trim()) return {};
  if (raw.trim().startsWith('{')) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  var params = {};
  raw.split('&').forEach(function(pair) {
    var eqIdx = pair.indexOf('=');
    if (eqIdx < 0) return;
    try {
      var k = decodeURIComponent(pair.substring(0, eqIdx).replace(/\+/g, ' '));
      var v = decodeURIComponent(pair.substring(eqIdx + 1).replace(/\+/g, ' '));
      params[k] = v;
    } catch (e) {}
  });
  return params;
}

// -- Siparis kaydet (save-order.js modulune yonlendir) --
function saveOrder(orderData) {
  return new Promise(function(resolve) {
    var bodyStr = JSON.stringify(orderData);
    var secret = process.env.INTERNAL_SECRET || 'promil-internal-2026';
    var host = (process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL || 'promildetoks.com').replace(/^https?:\/\//, '').replace(/\/$/, '');

    var options = {
      hostname: host,
      path: '/api/save-order',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    var postReq = https.request(options, function(res) {
      var data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ error: e.message }); }
      });
    });
    postReq.on('error', function(e) { resolve({ error: e.message }); });
    postReq.write(bodyStr);
    postReq.end();
  });
}

// ── E-posta gönder (doğrudan modül çağrısı) ──
async function sendOrderEmails(orderData) {
  const {
    firstName, lastName, email, phone,
    orderId, items, total,
    address, addressLine, district, city, zip,
  } = orderData;

  const addrData = { address, addressLine, district, city, zip };
  const ADMIN_EMAIL  = emailMod.ADMIN_EMAIL;
  const ADMIN_EMAIL2 = emailMod.ADMIN_EMAIL2;

  // 1. Müşteriye sipariş onay maili
  try {
    await emailMod.sendEmail(
      email,
      `Siparişiniz Alındı – Promil Detoks #${orderId || ''}`,
      emailMod.customerOrderEmailHtml({ firstName, lastName, orderId, items, total, phone, email, ...addrData })
    );
    console.log('[callback] Müşteri sipariş maili gönderildi:', email);
  } catch (err) {
    console.error('[callback] Müşteri sipariş maili hatası:', err.message);
  }

  // 2. Admin'e bildirim
  try {
    await emailMod.sendEmail(
      ADMIN_EMAIL,
      `🛒 Yeni Sipariş: ${firstName} ${lastName} – ₺${total}`,
      emailMod.adminOrderEmailHtml({ firstName, lastName, email, phone, orderId, items, total, ...addrData })
    );
    console.log('[callback] Admin sipariş maili gönderildi:', ADMIN_EMAIL);
  } catch (err) {
    console.error('[callback] Admin sipariş maili hatası:', err.message);
  }

  // 3. İkinci admin adresine
  if (ADMIN_EMAIL2 && ADMIN_EMAIL2 !== ADMIN_EMAIL) {
    try {
      await emailMod.sendEmail(
        ADMIN_EMAIL2,
        `🛒 Yeni Sipariş: ${firstName} ${lastName} – ₺${total}`,
        emailMod.adminOrderEmailHtml({ firstName, lastName, email, phone, orderId, items, total, ...addrData })
      );
      console.log('[callback] Admin2 sipariş maili gönderildi:', ADMIN_EMAIL2);
    } catch (err) {
      console.error('[callback] Admin2 sipariş maili hatası:', err.message);
    }
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  var API_KEY    = (process.env.IYZIPAY_API_KEY    || process.env.IYZICO_API_KEY    || '').trim();
  var SECRET_KEY = (process.env.IYZIPAY_SECRET_KEY || process.env.IYZICO_SECRET_KEY || '').trim();
  var HOSTNAME   = (process.env.IYZICO_ENV || '').trim().toLowerCase() === 'sandbox' ? 'sandbox-api.iyzipay.com' : 'api.iyzipay.com';

  console.log('[callback] ENV:', {
    apiKeyFirst8: API_KEY ? API_KEY.substring(0, 8) : 'YOK',
    hostname: HOSTNAME,
    hasApiKey: !!API_KEY,
    hasSecretKey: !!SECRET_KEY,
  });

  if (!API_KEY || !SECRET_KEY) {
    console.error('[callback] ENV VARS EKSIK');
    return res.redirect(302, '/?payment=error&reason=config');
  }

  var body  = await parseBody(req);
  var token = body.token || body.TOKEN || '';

  console.log('[callback] Alindi:', { hasToken: !!token, tokenPfx: token ? token.substring(0, 20) + '...' : 'YOK' });

  if (!token) {
    console.error('[callback] Token yok! Body:', JSON.stringify(body).substring(0, 200));
    return res.redirect(302, '/?payment=error&reason=no-token');
  }

  var detailPath = '/payment/iyzipos/checkoutform/auth/ecom/detail';

  try {
    var detailBody = { locale: 'tr', conversationId: 'cb-' + Date.now(), token: token };
    var result = await iyziPost(HOSTNAME, detailPath, detailBody, API_KEY, SECRET_KEY);

    console.log('[callback] Iyzico yaniti:', {
      status: result.status, paymentStatus: result.paymentStatus,
      errorCode: result.errorCode, paymentId: result.paymentId,
    });

    if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
      var buyer       = result.buyer       || {};
      var basketItems = result.basketItems || [];
      var orderId     = result.paymentId   || result.conversationId || ('PD-' + Date.now());
      var total       = result.paidPrice   || result.price || '0';

      var orderPayload = {
        id:        orderId,
        orderId:   orderId,
        name:      ((buyer.name || '') + ' ' + (buyer.surname || '')).trim(),
        firstName: buyer.name    || '',
        lastName:  buyer.surname || '',
        email:     buyer.email   || '',
        phone:     buyer.gsmNumber || '',
        address:   buyer.registrationAddress || '',
        addressLine: buyer.registrationAddress || '',
        district:  '',
        city:      buyer.city    || '',
        zip:       buyer.zipCode || '',
        country:   buyer.country || 'Turkey',
        paymentId: result.paymentId || '',
        total:     parseFloat(total),
        product:   basketItems.map(function(i) { return i.name; }).join(', '),
        items:     basketItems.map(function(item) { return { name: item.name, price: item.price, qty: 1 }; }),
        status:    'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Siparişi GitHub'a kaydet
      try {
        await saveOrder(orderPayload);
        console.log('[callback] Sipariş kaydedildi:', orderId);
      } catch (e) {
        console.error('[callback] Sipariş kayıt hatası:', e.message);
      }

      // E-postaları gönder (doğrudan modül çağrısı)
      try {
        await sendOrderEmails(orderPayload);
        console.log('[callback] E-postalar gönderildi:', buyer.email);
      } catch (e) {
        console.error('[callback] E-posta hatası:', e.message);
      }

      return res.redirect(302, '/?payment=success&orderId=' + encodeURIComponent(orderId));

    } else {
      var errCode = result.errorCode || result.paymentStatus || 'unknown';
      console.error('[callback] Odeme basarisiz:', { errorCode: result.errorCode, paymentStatus: result.paymentStatus });
      return res.redirect(302, '/?payment=error&reason=' + encodeURIComponent(errCode));
    }

  } catch (err) {
    console.error('[callback] Kritik hata:', err.message);
    return res.redirect(302, '/?payment=error&reason=server');
  }
};
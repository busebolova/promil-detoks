// api/checkout.js — Vercel Serverless Function
// İyzico Checkout Form — IYZWSv2 imza algoritması (resmi SDK ile uyumlu)
'use strict';

const crypto = require('crypto');
const https  = require('https');

// ── Alfabetik JSON.stringify (iyzico HMAC uyumu) ──
function sortedStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(sortedStringify).join(',') + ']';
  var keys = Object.keys(obj).sort();
  var pairs = keys.map(function(k) { return JSON.stringify(k) + ':' + sortedStringify(obj[k]); });
  return '{' + pairs.join(',') + '}';
}


// ── İyzico IYZWSv2 imza algoritması (resmi SDK: iyzipay-node-2.0.67) ──
// Authorization: IYZWSv2 base64(apiKey:KEY&randomKey:RND&signature:HMAC_SHA256(secretKey, rnd+uri+body))
function generateAuthV2(apiKey, secretKey, randomKey, uri, body) {
  var bodyStr    = typeof body === 'string' ? body : sortedStringify(body);
  var signature  = crypto
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

// ── Rastgele string üret (SDK ile aynı format) ──
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
        catch (e) { reject(new Error('JSON parse hatasi (HTTP ' + res.statusCode + '): ' + data.substring(0, 200))); }
      });
    });

    req.setTimeout(25000, function() { req.destroy(); reject(new Error('Iyzico API zaman asimi (25s)')); });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ── Telefon numarası normalize ──
function normalizePhone(phone) {
  var p = (phone || '').replace(/[\s\-\(\)]/g, '').replace(/[^0-9+]/g, '');
  if (p.startsWith('00')) p = '+' + p.substring(2);
  if (p.startsWith('0'))  p = '+90' + p.substring(1);
  if (!p.startsWith('+')) p = '+90' + p;
  return p;
}

// ── Ana handler ──
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method Not Allowed' });

  // ── Env değişkenleri ──
  var API_KEY    = (process.env.IYZIPAY_API_KEY    || process.env.IYZICO_API_KEY    || '').trim();
  var SECRET_KEY = (process.env.IYZIPAY_SECRET_KEY || process.env.IYZICO_SECRET_KEY || '').trim();
  var HOSTNAME   = (process.env.IYZICO_ENV || '').trim().toLowerCase() === 'sandbox' ? 'sandbox-api.iyzipay.com' : 'api.iyzipay.com';

  console.log('[checkout] ENV:', {
    apiKeyFirst8: API_KEY ? API_KEY.substring(0, 8) : 'YOK',
    apiKeyLength: API_KEY.length,
    hostname:     HOSTNAME,
    hasApiKey:    !!API_KEY,
    hasSecretKey: !!SECRET_KEY,
  });

  if (!API_KEY || !SECRET_KEY) {
    return res.status(500).json({
      error: 'Sunucu yapilandirma hatasi: API anahtarlari eksik.',
      code:  'ENV_MISSING',
    });
  }

  // ── Body parse ──
  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};

  var firstName      = body.firstName;
  var lastName       = body.lastName;
  var email          = body.email;
  var phone          = body.phone;
  var address        = body.address;
  var addressLine    = body.addressLine    || body.address || '';
  var district       = body.district      || '';
  var city           = body.city;
  var zip            = body.zip           || '00000';
  var country        = body.country;
  var basketItems    = body.basketItems;
  var price          = body.price;
  var installment    = body.installment;
  var callbackUrl    = body.callbackUrl;
  var conversationId = body.conversationId;

  // ── Zorunlu alan doğrulama ──
  var missing = [];
  if (!firstName || !firstName.trim()) missing.push('firstName');
  if (!lastName  || !lastName.trim())  missing.push('lastName');
  if (!email     || !email.trim())     missing.push('email');
  if (!phone     || !phone.trim())     missing.push('phone');
  if (!price)                          missing.push('price');
  if (!Array.isArray(basketItems) || basketItems.length === 0) missing.push('basketItems');

  if (missing.length > 0) {
    return res.status(400).json({ error: 'Eksik zorunlu alanlar: ' + missing.join(', '), missing: missing });
  }

  // ── Fiyat hesaplama ──
  var basketTotal = basketItems.reduce(function(sum, item) {
    var p = parseFloat(String(item.price || 0).replace(',', '.'));
    return sum + (isNaN(p) ? 0 : p);
  }, 0);

  var requestedPrice = parseFloat(String(price).replace(',', '.'));
  var priceStr = (Math.abs(requestedPrice - basketTotal) <= 0.01)
    ? requestedPrice.toFixed(2)
    : basketTotal.toFixed(2);

  if (parseFloat(priceStr) <= 0) {
    return res.status(400).json({ error: 'Gecersiz fiyat.', field: 'price' });
  }

  // ── Telefon normalize ──
  var gsmNumber = normalizePhone(phone);

  // ── IP adresi ──
  var ip = ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    (req.socket && req.socket.remoteAddress) ||
    '85.34.78.112').replace(/^::ffff:/, '');

  // ── Callback URL ──
  var origin = (req.headers.origin ||
    (req.headers.referer || '').replace(/\/[^/]*$/, '') ||
    'https://www.promildetoks.com').replace(/\/$/, '');

  var finalCallbackUrl = (callbackUrl || (origin + '/api/payment-callback')).trim();

  // ── Conversation & Basket ID ──
  var ts       = Date.now();
  var convId   = (conversationId || ('pd-' + ts)).substring(0, 100);
  var basketId = 'promil-' + ts;

  // ── İyzico payload ──
  var payload = {
    locale:              'tr',
    conversationId:      convId,
    price:               priceStr,
    paidPrice:           priceStr,
    currency:            'TRY',
    installment:         Math.max(1, parseInt(installment) || 1),
    basketId:            basketId,
    paymentGroup:        'PRODUCT',
    callbackUrl:         finalCallbackUrl,
    enabledInstallments: [1, 2, 3, 6, 9, 12],
    buyer: {
      id:                  'buyer-' + ts,
      name:                firstName.trim(),
      surname:             lastName.trim(),
      gsmNumber:           gsmNumber,
      email:               email.trim().toLowerCase(),
      identityNumber:      '11111111111',
      lastLoginDate:       new Date().toISOString().replace('T', ' ').substring(0, 19),
      registrationDate:    new Date().toISOString().replace('T', ' ').substring(0, 19),
      registrationAddress: (address || 'Turkiye').substring(0, 300),
      ip:                  ip,
      city:                (city    || 'Istanbul').substring(0, 100),
      country:             (country || 'Turkey').substring(0, 100),
      zipCode:             (zip     || '00000').substring(0, 10),
    },
    shippingAddress: {
      contactName: firstName.trim() + ' ' + lastName.trim(),
      city:        (city        || 'Istanbul').substring(0, 100),
      country:     (country     || 'Turkey').substring(0, 100),
      address:     (address     || 'Turkiye').substring(0, 300),
      zipCode:     (zip         || '00000').substring(0, 10),
    },
    billingAddress: {
      contactName: firstName.trim() + ' ' + lastName.trim(),
      city:        (city        || 'Istanbul').substring(0, 100),
      country:     (country     || 'Turkey').substring(0, 100),
      address:     (address     || 'Turkiye').substring(0, 300),
      zipCode:     (zip         || '00000').substring(0, 10),
    },
    basketItems: basketItems.map(function(item, i) {
      return {
        id:        String(item.id || ('item-' + i)).substring(0, 100),
        name:      String(item.name || 'Urun').substring(0, 100),
        category1: String(item.category || 'Takviye Urunleri').substring(0, 100),
        itemType:  'PHYSICAL',
        price:     parseFloat(String(item.price || 0).replace(',', '.')).toFixed(2),
      };
    }),
  };

  var apiPath = '/payment/iyzipos/checkoutform/initialize/auth/ecom';

  console.log('[checkout] Istek:', {
    hostname:     HOSTNAME,
    apiKeyFirst8: API_KEY.substring(0, 8),
    price:        priceStr,
    basketTotal:  basketTotal.toFixed(2),
    convId:       convId,
    callbackUrl:  finalCallbackUrl,
    gsmNumber:    gsmNumber,
    ip:           ip,
  });

  try {
    var result = await iyziPost(HOSTNAME, apiPath, payload, API_KEY, SECRET_KEY);

    console.log('[checkout] Iyzico yaniti:', {
      status:       result.status,
      errorCode:    result.errorCode,
      errorMessage: result.errorMessage,
      hasToken:     !!result.token,
    });

    if (result.status === 'success') {
      return res.status(200).json({
        status:              'success',
        checkoutFormContent: result.checkoutFormContent,
        token:               result.token,
        tokenExpireTime:     result.tokenExpireTime,
      });
    }

    return res.status(400).json({
      status:       'failure',
      errorCode:    result.errorCode,
      errorMessage: result.errorMessage,
      errorGroup:   result.errorGroup,
    });

  } catch (err) {
    console.error('[checkout] Kritik hata:', err.message);
    return res.status(500).json({
      error: 'Odeme baslatılamadi: ' + err.message,
      code:  'IYZICO_ERROR',
    });
  }
};
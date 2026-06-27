// api/debug-env.js — IYZWSv2 imza algoritması ile test
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


function generateAuthV2(apiKey, secretKey, randomKey, uri, body) {
  var bodyStr   = typeof body === 'string' ? body : sortedStringify(body);
  var signature = crypto
    .createHmac('sha256', secretKey)
    .update(randomKey + uri + bodyStr)
    .digest('hex');
  var authParams = ['apiKey:' + apiKey, 'randomKey:' + randomKey, 'signature:' + signature].join('&');
  return 'IYZWSv2 ' + Buffer.from(authParams).toString('base64');
}

function generateRandomKey() {
  return process.hrtime()[0] + Math.random().toString(36).slice(2);
}

function iyziPost(hostname, path, bodyObj, apiKey, secretKey) {
  return new Promise(function(resolve) {
    try {
      var bodyStr   = sortedStringify(bodyObj);
      var randomKey = generateRandomKey();
      var auth      = generateAuthV2(apiKey, secretKey, randomKey, path, bodyObj);

      var opts = {
        hostname: hostname, path: path, method: 'POST',
        headers: {
          'Content-Type':          'application/json',
          'Authorization':         auth,
          'x-iyzi-rnd':            randomKey,
          'x-iyzi-client-version': 'iyzipay-node-2.0.67',
          'Accept':                'application/json',
          'Content-Length':        Buffer.byteLength(bodyStr),
        },
      };

      var req = https.request(opts, function(r) {
        var d = '';
        r.on('data', function(c) { d += c; });
        r.on('end', function() {
          try { resolve({ httpStatus: r.statusCode, data: JSON.parse(d) }); }
          catch (e) { resolve({ httpStatus: r.statusCode, raw: d.substring(0, 300) }); }
        });
      });
      req.setTimeout(12000, function() { req.destroy(); resolve({ error: 'TIMEOUT' }); });
      req.on('error', function(e) { resolve({ error: e.message }); });
      req.write(bodyStr);
      req.end();
    } catch (e) {
      resolve({ error: 'EXCEPTION: ' + e.message });
    }
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  var API_KEY    = (process.env.IYZIPAY_API_KEY    || process.env.IYZICO_API_KEY    || '').trim();
  var SECRET_KEY = (process.env.IYZIPAY_SECRET_KEY || process.env.IYZICO_SECRET_KEY || '').trim();

  if (!API_KEY || !SECRET_KEY) {
    return res.status(200).json({
      error: 'ENV VARS EKSIK',
      checked: ['IYZIPAY_API_KEY', 'IYZICO_API_KEY', 'IYZIPAY_SECRET_KEY', 'IYZICO_SECRET_KEY'],
    });
  }

  var ts = Date.now();
  var HOSTNAME = (process.env.IYZICO_ENV || '').trim().toLowerCase() === 'sandbox' ? 'sandbox-api.iyzipay.com' : 'api.iyzipay.com';

  var payload = {
    locale: 'tr',
    conversationId: 'diag-' + ts,
    price: '199.00',
    paidPrice: '199.00',
    currency: 'TRY',
    installment: 1,
    basketId: 'diag-' + ts,
    paymentGroup: 'PRODUCT',
    callbackUrl: 'https://www.promildetoks.com/api/payment-callback',
    enabledInstallments: [1, 2, 3, 6, 9, 12],
    buyer: {
      id: 'buyer1', name: 'Test', surname: 'Kullanici',
      gsmNumber: '+905350000000', email: 'test@promildetoks.com',
      identityNumber: '11111111111',
      lastLoginDate: '2026-01-01 12:00:00', registrationDate: '2026-01-01 12:00:00',
      registrationAddress: 'Turkiye', ip: '85.34.78.112',
      city: 'Istanbul', country: 'Turkey', zipCode: '34000',
    },
    shippingAddress: { contactName: 'Test Kullanici', city: 'Istanbul', country: 'Turkey', address: 'Turkiye', zipCode: '34000' },
    billingAddress:  { contactName: 'Test Kullanici', city: 'Istanbul', country: 'Turkey', address: 'Turkiye', zipCode: '34000' },
    basketItems: [{ id: 'item1', name: 'Promil Detoks Toz', category1: 'Takviye Urunleri', itemType: 'PHYSICAL', price: '199.00' }],
  };

  var path = '/payment/iyzipos/checkoutform/initialize/auth/ecom';

  var result = await iyziPost(HOSTNAME, path, payload, API_KEY, SECRET_KEY);

  var status       = result.data ? result.data.status : null;
  var errorCode    = result.data ? result.data.errorCode : null;
  var errorMessage = result.data ? result.data.errorMessage : null;
  var hasToken     = result.data ? !!result.data.token : false;

  var teshis = '';
  if (status === 'success') {
    teshis = 'BASARILI — Odeme sistemi hazir!';
  } else if (errorCode === '1001') {
    teshis = 'HATA 1001: API key production sisteminde tanimli degil.';
  } else if (errorCode === '1000') {
    teshis = 'HATA 1000: Gecersiz imza.';
  } else {
    teshis = 'Hata: ' + errorCode + ' — ' + errorMessage;
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    imza_algoritmasi: 'IYZWSv2 (HMAC-SHA256)',
    api_key_info: {
      first8:  API_KEY.substring(0, 8),
      last4:   API_KEY.slice(-4),
      length:  API_KEY.length,
      hostname: HOSTNAME,
    },
    test_result: {
      httpStatus:   result.httpStatus,
      status:       status,
      errorCode:    errorCode,
      errorMessage: errorMessage,
      hasToken:     hasToken,
      networkError: result.error || null,
    },
    teshis: teshis,
  });
};
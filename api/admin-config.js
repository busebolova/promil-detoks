// api/admin-config.js — Vercel Serverless Function
// Admin paneline GitHub token'ını güvenli şekilde iletir
// Sadece admin şifresiyle erişilebilir

'use strict';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'promil2026';
const GITHUB_TOKEN   = process.env.GITHUB_TOKEN   || '';
const GITHUB_REPO    = process.env.GITHUB_REPO    || 'busebolova/promil-detoks';
const GITHUB_BRANCH  = process.env.GITHUB_BRANCH  || 'main';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  let body = req.body;
  if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString('utf8')); } catch (e) { body = {}; }
  } else if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const { password } = body;

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }

  // Token varsa döndür, yoksa boş string
  return res.status(200).json({
    github: {
      token:  GITHUB_TOKEN,
      repo:   GITHUB_REPO,
      branch: GITHUB_BRANCH,
    }
  });
};
const crypto = require('crypto');
const { getConfig } = require('./config');

const SESSION_COOKIE = 'hachiware_session';
const STATE_COOKIE = 'hachiware_oauth_state';

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function signedValue(payload, maxAgeSeconds) {
  const config = getConfig();
  const value = encode(JSON.stringify({ ...payload, exp: Date.now() + maxAgeSeconds * 1000 }));
  return `${value}.${sign(value, config.sessionSecret)}`;
}

function verifySignedValue(value) {
  if (!value || !value.includes('.')) return null;
  const config = getConfig();
  const [encoded, signature] = value.split('.');
  const expected = sign(encoded, config.sessionSecret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map(cookie => {
    const index = cookie.indexOf('=');
    return [cookie.slice(0, index).trim(), decodeURIComponent(cookie.slice(index + 1))];
  }));
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function createSessionCookie(login) {
  const maxAge = 60 * 60 * 8;
  return cookie(SESSION_COOKIE, signedValue({ login }, maxAge), maxAge);
}

function createStateCookie(state) {
  const maxAge = 60 * 10;
  return cookie(STATE_COOKIE, signedValue({ state }, maxAge), maxAge);
}

function clearCookie(name) {
  return cookie(name, '', 0);
}

function readSession(request) {
  const payload = verifySignedValue(parseCookies(request)[SESSION_COOKIE]);
  const config = getConfig();
  if (!payload || String(payload.login).toLowerCase() !== config.allowedLogin) return null;
  return payload;
}

function readState(request) {
  return verifySignedValue(parseCookies(request)[STATE_COOKIE]);
}

module.exports = {
  SESSION_COOKIE,
  STATE_COOKIE,
  clearCookie,
  createSessionCookie,
  createStateCookie,
  readSession,
  readState
};

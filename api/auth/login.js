const crypto = require('crypto');
const { getConfig } = require('../_lib/config');
const { absoluteUrl, sendError } = require('../_lib/http');
const { createStateCookie } = require('../_lib/session');

module.exports = (request, response) => {
  try {
    const config = getConfig();
    const state = crypto.randomBytes(24).toString('base64url');
    const callback = absoluteUrl(request, '/api/auth/callback');
    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', config.clientId);
    authorizeUrl.searchParams.set('redirect_uri', callback);
    authorizeUrl.searchParams.set('state', state);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Set-Cookie', createStateCookie(state));
    response.redirect(302, authorizeUrl.toString());
  } catch (error) {
    sendError(response, error);
  }
};

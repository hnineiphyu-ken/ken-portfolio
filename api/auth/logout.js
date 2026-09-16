const { SESSION_COOKIE, clearCookie } = require('../_lib/session');

module.exports = (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Set-Cookie', clearCookie(SESSION_COOKIE));
  response.redirect(302, '/');
};

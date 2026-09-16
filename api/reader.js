const fs = require('fs');
const path = require('path');
const { readSession } = require('./_lib/session');

module.exports = (request, response) => {
  try {
    if (!readSession(request)) {
      response.setHeader('Cache-Control', 'no-store');
      return response.redirect(302, '/api/auth/login');
    }
    const html = fs.readFileSync(path.join(process.cwd(), 'api', '_lib', 'my-md.template'), 'utf8');
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(200).send(html);
  } catch {
    return response.status(503).send('The private reader is temporarily unavailable.');
  }
};

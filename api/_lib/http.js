function sendJson(response, status, body) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.status(status).json(body);
}

function sendError(response, error) {
  const status = error.status || (error.code === 'CONFIG_ERROR' ? 503 : 500);
  const message = status >= 500 && error.code !== 'CONFIG_ERROR'
    ? 'The private reader is temporarily unavailable.'
    : error.message;
  sendJson(response, status, { error: message });
}

function absoluteUrl(request, pathname) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host;
  return `${protocol}://${host}${pathname}`;
}

module.exports = { absoluteUrl, sendError, sendJson };

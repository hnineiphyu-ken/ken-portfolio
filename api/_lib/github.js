const crypto = require('crypto');
const { getConfig } = require('./config');

let cachedInstallationToken = null;

function createAppJwt(config) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iat: now - 30, exp: now + 540, iss: config.appId })).toString('base64url');
  const data = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(data), config.privateKey).toString('base64url');
  return `${data}.${signature}`;
}

async function githubRequest(pathname, options = {}) {
  const response = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ken-portfolio-hachiware-reader',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers
    }
  });
  if (!response.ok) {
    const error = new Error(`GitHub request failed with status ${response.status}.`);
    error.status = response.status === 404 ? 404 : 502;
    throw error;
  }
  return response;
}

async function getInstallationToken() {
  if (cachedInstallationToken && cachedInstallationToken.expiresAt > Date.now() + 60_000) {
    return cachedInstallationToken.token;
  }
  const config = getConfig();
  const response = await githubRequest(`/app/installations/${config.installationId}/access_tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${createAppJwt(config)}` }
  });
  const data = await response.json();
  cachedInstallationToken = { token: data.token, expiresAt: Date.parse(data.expires_at) };
  return data.token;
}

async function repositoryRequest(pathname) {
  const config = getConfig();
  const token = await getInstallationToken();
  return githubRequest(`/repos/${config.owner}/${config.repository}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

module.exports = { githubRequest, repositoryRequest };

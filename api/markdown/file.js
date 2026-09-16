const { getConfig } = require('../_lib/config');
const { sendError, sendJson } = require('../_lib/http');
const { repositoryRequest } = require('../_lib/github');
const { readSession } = require('../_lib/session');

function safeMarkdownPath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0')) return null;
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { return null; }
  if (decoded.startsWith('/') || decoded.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return decoded.toLowerCase().endsWith('.md') ? decoded : null;
}

module.exports = async (request, response) => {
  try {
    if (!readSession(request)) return sendJson(response, 401, { error: 'Authentication required.' });
    const filePath = safeMarkdownPath(request.query.path);
    if (!filePath) return sendJson(response, 400, { error: 'A safe Markdown file path is required.' });
    const config = getConfig();
    const fileResponse = await repositoryRequest(`/contents/${filePath.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(config.branch)}`);
    const file = await fileResponse.json();
    if (file.type !== 'file' || file.encoding !== 'base64') return sendJson(response, 404, { error: 'Markdown file not found.' });
    if (file.size > 1_000_000) return sendJson(response, 413, { error: 'Markdown files larger than 1 MB are not supported.' });
    return sendJson(response, 200, {
      path: file.path,
      sha: file.sha,
      content: Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8')
    });
  } catch (error) {
    return sendError(response, error);
  }
};

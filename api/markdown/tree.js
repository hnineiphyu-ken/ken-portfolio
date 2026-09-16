const { getConfig } = require('../_lib/config');
const { sendError, sendJson } = require('../_lib/http');
const { repositoryRequest } = require('../_lib/github');
const { readSession } = require('../_lib/session');

module.exports = async (request, response) => {
  try {
    if (!readSession(request)) return sendJson(response, 401, { error: 'Authentication required.' });
    const config = getConfig();
    const branchResponse = await repositoryRequest(`/branches/${encodeURIComponent(config.branch)}`);
    const branch = await branchResponse.json();
    const treeResponse = await repositoryRequest(`/git/trees/${branch.commit.sha}?recursive=1`);
    const tree = await treeResponse.json();
    if (tree.truncated) {
      const error = new Error('The repository tree is too large to load safely.');
      error.status = 413;
      throw error;
    }
    const files = tree.tree
      .filter(item => item.type === 'blob' && item.path.toLowerCase().endsWith('.md'))
      .map(item => ({ path: item.path, size: item.size, sha: item.sha }))
      .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
    return sendJson(response, 200, { repository: `${config.owner}/${config.repository}`, branch: config.branch, files });
  } catch (error) {
    return sendError(response, error);
  }
};

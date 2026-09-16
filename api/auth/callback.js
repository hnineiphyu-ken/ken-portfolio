const { getConfig } = require('../_lib/config');
const { absoluteUrl, sendError } = require('../_lib/http');
const { githubRequest } = require('../_lib/github');
const { STATE_COOKIE, clearCookie, createSessionCookie, readState } = require('../_lib/session');

module.exports = async (request, response) => {
  try {
    const config = getConfig();
    const savedState = readState(request);
    if (!request.query.code || !savedState || savedState.state !== request.query.state) {
      const error = new Error('GitHub sign-in state is invalid or expired.');
      error.status = 400;
      throw error;
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: request.query.code,
        redirect_uri: absoluteUrl(request, '/api/auth/callback'),
        state: request.query.state
      })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      const error = new Error('GitHub sign-in could not be completed.');
      error.status = 401;
      throw error;
    }

    const userResponse = await githubRequest('/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userResponse.json();
    if (String(user.login).toLowerCase() !== config.allowedLogin) {
      const error = new Error('This GitHub account is not allowed to use the private reader.');
      error.status = 403;
      throw error;
    }

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Set-Cookie', [createSessionCookie(user.login), clearCookie(STATE_COOKIE)]);
    response.redirect(302, '/my-md');
  } catch (error) {
    sendError(response, error);
  }
};

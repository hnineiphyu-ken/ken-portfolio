const REQUIRED_ENV = [
  'GITHUB_APP_ID',
  'GITHUB_APP_CLIENT_ID',
  'GITHUB_APP_CLIENT_SECRET',
  'GITHUB_APP_PRIVATE_KEY',
  'GITHUB_ALLOWED_LOGIN',
  'SESSION_SECRET'
];

function getConfig() {
  const missing = REQUIRED_ENV.filter(name => !process.env[name]);
  if (missing.length) {
    const error = new Error(`Missing environment variables: ${missing.join(', ')}`);
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  return {
    appId: process.env.GITHUB_APP_ID,
    clientId: process.env.GITHUB_APP_CLIENT_ID,
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    allowedLogin: process.env.GITHUB_ALLOWED_LOGIN.toLowerCase(),
    owner: process.env.GITHUB_REPOSITORY_OWNER || 'hnineiphyu-ken',
    repository: process.env.GITHUB_REPOSITORY_NAME || 'ken-agent-memo',
    branch: process.env.GITHUB_REPOSITORY_BRANCH || 'main',
    sessionSecret: process.env.SESSION_SECRET
  };
}

module.exports = { getConfig };

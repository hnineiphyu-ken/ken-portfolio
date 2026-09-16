# Private Hachiware Reader Setup

The `/my-md` route uses GitHub sign-in and reads Markdown files from the private `hnineiphyu-ken/ken-agent-memo` repository through a read-only GitHub App. Credentials stay in Vercel environment variables and are never sent to browser JavaScript. The existing public `/md-reader` local-file tool remains unchanged.

## 1. Create the GitHub App

Create a GitHub App owned by `hnineiphyu-ken` with these settings:

- Homepage URL: `https://kennebula.vercel.app`
- Callback URL: `https://kennebula.vercel.app/api/auth/callback`
- Webhook: disabled
- Repository permission: **Contents — Read-only**
- Installation scope: **Only on this account**

Install it only on the private `ken-agent-memo` repository. Generate a private key and copy the App ID, Client ID, Client secret, installation ID, and private key.

## 2. Configure Vercel

Add these variables to Production, Preview, and Development as required:

| Variable | Value |
| --- | --- |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_APP_CLIENT_ID` | GitHub App Client ID |
| `GITHUB_APP_CLIENT_SECRET` | GitHub App client secret |
| `GITHUB_APP_INSTALLATION_ID` | Numeric installation ID |
| `GITHUB_APP_PRIVATE_KEY` | Complete PEM private key, including header and footer |
| `GITHUB_ALLOWED_LOGIN` | `hnineiphyu-ken` |
| `GITHUB_REPOSITORY_OWNER` | `hnineiphyu-ken` |
| `GITHUB_REPOSITORY_NAME` | `ken-agent-memo` |
| `GITHUB_REPOSITORY_BRANCH` | `main` |
| `SESSION_SECRET` | A cryptographically random value of at least 32 bytes |

After saving the variables, redeploy the project. For a preview deployment, add that deployment's `/api/auth/callback` URL to the GitHub App callback URLs before testing sign-in.

## 3. Verify

1. Open `/my-md` in a private browser window and confirm GitHub sign-in is required.
2. Sign in as `hnineiphyu-ken` and confirm the Markdown tree loads automatically.
3. Open a Markdown file and use **Refresh** to fetch the latest repository state.
4. Sign out and confirm `/api/markdown/tree` and `/api/markdown/file?path=memory.md` return `401`.
5. Sign in using a different GitHub account and confirm access is denied.

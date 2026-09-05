# AGENTS.md

Static HTML portfolio (HninEi Phyu / Ken Nebula) deployed to Vercel. No framework, no app build, no tests, no lint. Plain committed HTML/CSS/JS is what ships.

## Agent docs layer
- `.AGENT_DOCS/` holds the extended project docs: `SYSTEM_GUIDELINE.md` (root guideline), `projectArchitecture/PROJECT_ARCHITECTURE.md`, `sops/AGENTS_RULE.md` (session commands: `load`, `keep`, `read`, `save memo`) and `memory/YYYY-MM-DD.md` (cross-session memory). At session start read `SYSTEM_GUIDELINE.md` and the most recent `memory/` file.

## Structure — two distinct areas
- **Root** (`index.html`, `laptop-svg.html`, `md-reader.html`, `assets/`, `_images/`) — the actual live site. Edit here.
- **`portfolio-template/`** — a vendored upstream copy of the Meyawo Bootstrap theme with its own gulp build (`package.json`, `gulpfile.js`). It is **not** deployed. Changes there have zero effect on the live site; the root `assets/` is the theme, customized. Don't mistake it for the source of the live site.

## Theme / CSS
- Root `assets/scss/*` is the SCSS source of the Meyawo theme; `assets/css/meyawo.css` is its committed compiled output, referenced by `index.html`.
- `assets/css/ken.css` holds custom overrides (also referenced by `index.html`).
- There is **no build tool at root** (no `package.json`/`gulpfile.js`/`node_modules`). If you change `assets/scss/`, compile manually (the `portfolio-template/` gulpfile or any sass build) and commit the resulting `assets/css/` so the deployed site picks it up.
- `index.html` loads CSS via `assets/css/ken.css` then `assets/css/meyawo.css` (order matters), JS via `assets/js/meyawo.js`, vendored deps from `assets/vendors/`.

## Routing / deployment
- Vercel (repo: `hnineiphyu-ken/ken-portfolio`, root dir). `vercel.json` sets `cleanUrls` and rewrites `/laptop-svg` → `laptop-svg.html`, `/md-reader` → `md-reader.html`.
- `.htaccess` (Apache/cPanel) mirrors the same rewrites. **If you add a clean-URL page, update both `vercel.json` and `.htaccess`.**

## Repo hygiene
- No `.gitignore` — be careful not to accidentally commit local/build artifacts (e.g. `node_modules`, `dist/`).

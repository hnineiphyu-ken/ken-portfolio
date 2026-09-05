# System Instructions & Development Workflow — ken-portfolio

Root guideline for the static HTML portfolio site. Defines the project, the folder layout, and the conventions an agent must follow.

---

## 1. Project Overview

- **Product:** Personal portfolio for HninEi Phyu (Ken Nebula) — static site.
- **Stack:** Plain HTML / CSS / JS. No framework, no app build, no tests, no lint.
- **Deployment:** Vercel (root dir, repo `hnineiphyu-ken/ken-portfolio`). Clean URLs via `vercel.json`; `.htaccess` mirrors the same rewrites for Apache/cPanel.
- **What ships = what's committed:** There is no build/compile step at deploy time. A commit of plain HTML/CSS/JS **is** the deploy.

---

## 2. Repo Layout

```
ken-portfolio/
  index.html, laptop-svg.html, md-reader.html   # live pages
  assets/                                       # live site assets (theme + custom)
    css/ken.css                                 # custom overrides (loaded FIRST)
    css/meyawo.css                              # compiled Meyawo theme (loaded second)
    scss/                                       # SCSS source of the Meyawo theme
    js/meyawo.js                                # theme JS
    vendors/                                    # jQuery, Bootstrap, themify-icons
    imgs/, file/                                # images, PDF resumes
  _images/                                      # raw/alternate image assets
  portfolio-template/                           # VENDORED upstream Meyawo theme — NOT deployed
  vercel.json, .htaccess                        # clean-URL routing (keep in sync)
  test.html                                     # scratch page
```

**Two distinct areas — do not conflate them:**
- **Root** is the actual live site. Edit here.
- **`portfolio-template/`** is a vendored upstream copy of the Meyawo Bootstrap theme with its own gulp build. Changes there have **zero effect** on the live site. It is not the source of truth for the live site — the root `assets/` is the theme, customized.

---

## 3. Theme / CSS Conventions

- `index.html` loads CSS in this order: `assets/css/ken.css` **then** `assets/css/meyawo.css`. Order matters — ken.css overrides the theme.
- `assets/scss/*` is the SCSS source of the Meyawo theme; `assets/css/meyawo.css` is its **committed compiled output** and is what the deployed site loads.
- There is **no build tool at root** (no `package.json`/`gulpfile.js`/`node_modules`). If you change `assets/scss/`, compile manually (the `portfolio-template/` gulpfile or any sass build) and commit the resulting `assets/css/meyawo.css` so the deployed site picks it up.
- JS comes from `assets/js/meyawo.js`; vendored deps from `assets/vendors/`.

---

## 4. Routing / Deployment

- `vercel.json`: `cleanUrls: true`, `trailingSlash: false`, and rewrites `/laptop-svg` → `laptop-svg.html`, `/md-reader` → `md-reader.html`.
- `.htaccess` (Apache) mirrors the same rewrites, plus trailing-slash 301s.
- **If you add a clean-URL page, update BOTH `vercel.json` and `.htaccess`.**

---

## 5. Repo Hygiene

- No `.gitignore` — be careful not to accidentally commit local/build artifacts (e.g. `node_modules`, `dist/`).
- Single long-lived `main` branch. No feature-branch convention; commit messages are short plain descriptions in the existing history style.
- Never commit secrets/keys (none expected here, but keep it that way).

---

## 6. Session Start

1. Read `.AGENT_DOCS/SYSTEM_GUIDELINE.md` (this file) and `AGENTS.md`.
2. Read the most recent memory file in `.AGENT_DOCS/memory/YYYY-MM-DD.md` to pick up cross-session state.
3. See `.AGENT_DOCS/sops/AGENTS_RULE.md` for session commands (`load`, `keep`, `read`, `save memo`, ...) and context-efficiency rules.

---

## 7. Docs Structure

```
.AGENT_DOCS/
  SYSTEM_GUIDELINE.md                    # this file
  projectArchitecture/
    PROJECT_ARCHITECTURE.md              # layout, structure, known issues
  memory/
    YYYY-MM-DD.md                        # session memory files
  sops/
    AGENTS_RULE.md                       # agent token-efficiency + session commands
```
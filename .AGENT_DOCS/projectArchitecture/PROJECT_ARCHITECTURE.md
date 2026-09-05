# Project Architecture and Flow — ken-portfolio

## 1) Project Overview

Static personal portfolio for HninEi Phyu (Ken Nebula), a web developer. Built on the vendored Meyawo Bootstrap landing-page theme, customized in place. Deployed statically to Vercel.

- **Stack**: HTML, CSS (Bootstrap 4.3.1-based theme + custom overrides), vanilla-ish JS, jQuery, myewo theme JS
- **Routing**: clean URLs (`vercel.json` for Vercel, `.htaccess` for Apache)
- **Frontend**: yes — this IS the frontend. There is no backend.

## 2) Pages

| File | Purpose |
|------|---------|
| `index.html` | Main portfolio (home, about, projects, skills, blog) |
| `laptop-svg.html` | SVG/visual showcase page (clean URL `/laptop-svg`) |
| `md-reader.html` | Markdown file reader sidebar tool (clean URL `/md-reader`) |
| `test.html` | Scratch/test page |

## 3) Request Flow

No application server. Vercel (or Apache) serves static files directly; `vercel.json`/`.htaccess` map clean URLs to the matching `.html` files:

```
browser → GET /md-reader ── vercel.json rewrite ──► md-reader.html ──► static file served
browser → GET /laptop-svg ─ vercel.json rewrite ──► laptop-svg.html ─► static file served
```

Vercel's `cleanUrls` also strips `.html` on any direct `.html` path.

## 4) CSS Loading Order

`index.html` `<head>` loads, in this order:

1. `assets/vendors/themify-icons/css/themify-icons.css`
2. `assets/css/ken.css` — custom overrides
3. `assets/css/meyawo.css` — compiled theme (overrides ken.css where rules collide, so ken.css is meant to override theme defaults)

JS loaded at end of body: `assets/js/meyawo.js`, plus vendored jQuery/Bootstrap from `assets/vendors/`.

## 5) Theme Source Relationship

```
portfolio-template/public_html/assets/scss/   (upstream vendored SCSS source, gulp build)
         │ copied / customized into
root assets/scss/                             (this repo's SCSS source)
         │ compiled manually
root assets/css/meyawo.css                    (committed output — what the live site loads)
```

- `portfolio-template/` is a **vendored, non-deployed** copy that ships its own gulp build (`npm start` → sass + watch on `public_html/`). It is NOT the source of the live site.
- `assets/scss/` at root is the theme SCSS customized for this site. There is no build tool at root — compile manually and commit `assets/css/meyawo.css`.
- `assets/css/ken.css` is hand-written custom CSS (not compiled).

## 6) Known Issues / Gotchas

1. **No root build tool** — SCSS changes require manual compile + committing the resulting CSS; otherwise the deployed site won't reflect them.
2. **`portfolio-template/` confusion** — edits there do nothing for the live site; the root `assets/` is what ships.
3. **`md-reader.html` has inline CSS/JS** — it does not use the theme stylesheets.
4. **Two rewrite sources** — adding a clean URL page requires both `vercel.json` and `.htaccess` updates.
5. **No `.gitignore`** — guard against committing `node_modules`, `dist/`, or other build artifacts by hand.
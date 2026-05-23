# review-ready-site

Marketing + docs site for the **Review Ready** Claude Code plugin.
Source repo: [github.com/manthanmk66/review-ready](https://github.com/manthanmk66/review-ready)

## How it stays in sync with the plugin repo

The site fetches `CHANGELOG.md` and repository metadata (stars, latest tag, last commit)
from `github.com/manthanmk66/review-ready` **at page load**, via:

- `raw.githubusercontent.com/manthanmk66/review-ready/main/CHANGELOG.md`
- `api.github.com/repos/manthanmk66/review-ready`

Push to `main` and the site reflects the change within a few minutes
(GitHub's raw CDN cache TTL). **No rebuild required.**

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

That's it. The repo is pure static HTML/CSS/JS — Vercel auto-detects, no build step.

Alternatively, push this folder to a Git repo and import it on
[vercel.com/new](https://vercel.com/new) — every push to `main` then redeploys.

## Local dev

```bash
# Any static server works:
python3 -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000`.

## Files

| File          | Purpose                                                         |
| ------------- | --------------------------------------------------------------- |
| `index.html`  | Single-page site, all sections inline                           |
| `styles.css`  | Hallmark Terminal-theme tokens + Workbench layout               |
| `app.js`      | Copy buttons, live GitHub fetch (changelog + stars + last commit) |
| `vercel.json` | Cache headers + security headers                                 |

## Design

Built with [Hallmark](https://github.com/anthropics/skills/tree/main/hallmark) —
genre: atmospheric · theme: Terminal · macrostructure: Workbench.

# Hayya website

Static marketing + legal site for the Hayya app. Plain HTML/CSS, no build step.

| Page | File | Use in Play Console |
|---|---|---|
| Home | `index.html` | Website URL (store listing) |
| Privacy Policy | `privacy.html` | **Privacy policy URL (required)** |
| Support | `support.html` | Support / contact URL |
| Terms of Use | `terms.html` | Optional |

## Preview locally

```bash
cd website
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy (pick one — all free)

### GitHub Pages
1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build from a branch**, folder `/website` (or move these files to `/docs`).
3. Your privacy URL becomes `https://<user>.github.io/<repo>/privacy.html`.

### Netlify / Cloudflare Pages / Vercel (drag-and-drop)
1. Create a new project and drag the `website/` folder into the deploy area.
2. Set the publish directory to `website` (or deploy the folder directly).
3. Privacy URL: `https://<your-site>.netlify.app/privacy.html`.

## Before publishing
- The contact email is `rushan52@gmail.com` in `privacy.html`, `support.html`, and `terms.html`. Swap it for a dedicated support address if you'd prefer.
- Effective dates are set to 21 July 2026 — update if you publish later.

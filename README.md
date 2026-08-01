# Hayya website

Static marketing + legal site for the [Hayya](https://apps.apple.com/ca/app/hayya-prayer-alarm/id6795738268) app. Plain HTML/CSS, no build step, no dependencies.

Live at <https://saiyedrushan.github.io/hayya-site/>.

| Page | File | Use in the stores |
|---|---|---|
| Home | `index.html` | Website URL (store listing) |
| Privacy Policy | `privacy.html` | **Privacy policy URL (required)** |
| Support | `support.html` | Support / contact URL |
| Terms of Use | `terms.html` | Optional |

## Store links

Both are hard-coded in `index.html` (hero + closing CTA) and in the footer of every page:

- App Store — `https://apps.apple.com/ca/app/hayya-prayer-alarm/id6795738268`
- Google Play — `https://play.google.com/store/apps/details?id=com.saiyedrushan.hayya`

The Play listing is **not public yet** (the build is in testing, so the URL 404s for
visitors). The hero carries a "Android is in testing" note and the closing CTA repeats it —
drop both lines once the app is live on Play.

## Assets

Everything under `assets/` and `screenshots/` is generated, so it can be regenerated rather
than hand-edited. Both scripts expect the app repo checked out beside this one
(`../hayya`).

### Icons, favicons, and the social card

```bash
node tools/generate-icons.js
```

Draws the gold crescent + call-dot on Hayya's deep green using the *same geometry as the app
icons* (ported from the app repo's `scripts/generate-icons.js`), so the favicon in a browser
tab is the icon on the home screen. Pure Node — no image libraries. Writes:

| File | What it is |
|---|---|
| `favicon-16.png`, `favicon-32.png` | classic favicons, rendered at size rather than downscaled |
| `apple-touch-icon.png` | 180px, iOS home-screen icon |
| `icon-192.png`, `icon-512.png` | manifest icons; also the nav mark and hero icon |
| `crescent.png` | gold crescent on transparency, for the closing CTA |
| `og-image.png` | 1200×630 social card (crescent + HAYYA wordmark + tagline) |

`assets/favicon.svg` is hand-written to the same geometry and is what modern browsers use.
If the app icon ever changes, update both it and `tools/generate-icons.js`.

### Screenshots

```bash
tools/sync-screenshots.sh [path-to-hayya-repo]
```

Takes six of the App Store masters from `../hayya/store/screenshots-ios-1284x2778`, resizes
them to 600px wide, and writes a WebP (what browsers load) plus a PNG fallback for each. The
six and their order are set at the top of the script. Needs `cwebp` (`brew install webp`);
`sips` is built into macOS.

### Store badges

`assets/badge-app-store.svg` and `assets/badge-google-play.png` are the official badges:

```bash
curl -O https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg
curl -o play.png https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png
sips -c 198 570 play.png --out assets/badge-google-play.png   # trim Google's built-in padding
```

Google's asset ships with ~10% transparent padding; the crop makes it sit at the same visual
height as Apple's.

## Preview locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

GitHub Pages serves `main` from the repo root — pushing to `main` publishes.

## Before publishing changes

- Contact email is `rushan52@gmail.com` in `privacy.html`, `support.html`, `terms.html`, and
  every footer.
- Effective dates on the legal pages are 21 July 2026.
- iOS requirement quoted on the site (iOS 16.4 or later) comes from the App Store listing —
  re-check it after a build that raises the deployment target.

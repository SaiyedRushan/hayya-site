# Hayya website

Static marketing + legal site for the [Hayya](https://apps.apple.com/ca/app/hayya-prayer-alarm/id6795738268) app. Plain HTML, CSS and one JavaScript module. No build step, no dependencies, and no requests to anyone else's servers except the city search, which only runs when a visitor searches.

Live at <https://hayyaprayer.com/>. The domain is registered at Porkbun, which points it at
GitHub Pages (four A and four AAAA records for the root, and `www` as a CNAME to
`saiyedrushan.github.io`). The `CNAME` file in this repo tells Pages to serve the site there.
The old address, saiyedrushan.github.io/hayya-site/, redirects to it, so the links already
in the app (share, support, and the `version.json` update check) keep working.

| Page | File | Use in the stores |
|---|---|---|
| Home | `index.html` | Website URL (store listing) |
| Privacy Policy | `privacy.html` | **Privacy policy URL (required)** |
| Support | `support.html` | Support / contact URL |
| Terms of Use | `terms.html` | Optional |

## Store links

Both are hard-coded in `index.html` (hero + closing CTA, each with a "Works on Apple Watch" or
"Works on Wear OS" badge beside it that opens the same listing) and in the footer of every page:

- App Store: `https://apps.apple.com/ca/app/hayya-prayer-alarm/id6795738268`
- Google Play: `https://play.google.com/store/apps/details?id=com.saiyedrushan.hayya`

Both listings are public. Google Play went live on 2026-10-01.

## Assets

Everything under `assets/`, `screenshots/` and `collages/` is generated, so it can be
regenerated rather than hand-edited. Both scripts expect the app repo checked out beside
this one (`../hayya`), or take its path as an argument.

### Icons, favicons, and the social card

```bash
node tools/generate-icons.js
```

Draws the gold crescent + call-dot on Hayya's deep green using the *same geometry as the app
icons* (ported from the app repo's `scripts/generate-icons.js`), so the favicon in a browser
tab is the icon on the home screen. Pure Node, no image libraries. Writes:

| File | What it is |
|---|---|
| `favicon-16.png`, `favicon-32.png` | classic favicons, rendered at size rather than downscaled |
| `apple-touch-icon.png` | 180px, iOS home-screen icon |
| `icon-192.png`, `icon-512.png` | manifest icons; also the nav mark and hero icon |
| `crescent.png` | gold crescent on transparency, for the closing CTA |
| `og-image.png` | 1200×630 social card (crescent + HAYYA wordmark + tagline) |

`assets/favicon.svg` is hand-written to the same geometry and is what modern browsers use.
If the app icon ever changes, update both it and `tools/generate-icons.js`.

### Screenshots and collages

```bash
tools/sync-screenshots.sh [path-to-hayya-repo]
```

Two sets, both from the app repo's store art:

- **`screenshots/`**: ten App Store masters from `store/revamp/ios-1284x2778-raw`, resized
  to 600px wide, as a WebP (what browsers load) plus a PNG fallback. The `#how` section shows
  five of them, in a phone that follows the step you're reading.
- **`collages/`**: six wide feature collages from `store/revamp/collages`, resized to 1600px
  wide, as a WebP plus a **JPEG** fallback. Their large soft gradients cost far more as PNG
  than the artefacts cost as JPEG. One leads the themes section; the other five are the
  `#tour` "A closer look" section.

Which files, and their order, are set at the top of the script. It falls back to the old
`store/screenshots-ios-1284x2778` folder if the revamp one isn't there. Needs `cwebp`
(`brew install webp`); `sips` is built into macOS.

## The home page

`index.html` is the markup, `home.css` its styles (on top of the shared `styles.css`), and
`home.js` the moving parts:

- **Live prayer times** on an HTML copy of the app's home screen. Times come from
  `assets/vendor/adhan.esm.min.js`, the same adhan-js version the app uses (4.4.4), with the
  app's per-country method and Asr defaults copied into `home.js`. Update both together if
  the app's `methodByCountry.ts` or `madhabByCountry.ts` change. The first guess comes from
  the browser's time zone via `data/zones.json`, so it needs no permission and no request.
  "Use my exact location" asks the browser; the city search calls Open-Meteo's free
  geocoding API.
- **The preview call** plays `audio/ringtone-phone.mp3`; the call styles section plays all
  five. They're the app's own ringtones, encoded to MP3.
- **Every duʿā** from `data/duas.json`.
- **The Wear OS face picker** loads one of `watch/faces/*.webp` per choice.

Fonts are the app's own, Amiri and Figtree, served from `assets/fonts/` (`assets/fonts.css`).

### Search engines and AI assistants

- `tools/build-static.py` writes the 39 duʿā cards into `index.html` and the FAQ's
  structured data (schema.org `FAQPage`) from the visible FAQ. Run it after
  `tools/sync-duas.sh` and after editing the FAQ. AI crawlers mostly don't run JavaScript, so
  without this they'd see an empty duʿā section.
- The app's own structured data (`MobileApplication`, `WebSite`, `VideoObject`) is hand-written
  in the `<head>` of `index.html`. Update its feature list when a big feature ships. Never add
  ratings or reviews to it that aren't real.
- `llms.txt` is a plain description of Hayya for AI assistants. Keep its facts (version,
  requirements, features) in step with the page.
- `sitemap.xml` carries a `lastmod` per page. Bump it when a page changes.
- `robots.txt` allows every crawler, AI crawlers included, and points at the sitemap. It and
  `llms.txt` work because the site is at the root of hayyaprayer.com.

### Duʿās

```bash
tools/sync-duas.sh [path-to-hayya-repo]
```

Writes `data/duas.json` from the app's `duaLibrary()`, run through the app repo's own
TypeScript, so the page lists exactly the duʿās the app holds. Run it whenever one is added
or corrected in the app.

### Time zones

```bash
tools/build-zones.py [path-to-zone.tab]
```

Writes `data/zones.json` (time zone to country and coordinates) from the system's `zone.tab`.
Only needs re-running if a country gets a new time zone.

### City names for "Use my exact location"

```bash
tools/build-cities.py
```

Writes `data/cities.json` from GeoNames' list of places with 15,000 people or more
(neighbourhoods left out). The page names the visitor's city by finding the nearest one in
the browser, so the coordinates are never sent to a lookup service. About 400 KB over the
wire, fetched only when someone presses the button. GeoNames is CC BY 4.0 and is credited
under the city search.

### Ringtones

```bash
for id in phone huddle zoom facetime whatsapp; do
  ffmpeg -y -i ../hayya/assets/ringtones/${id}_r2.wav -ac 1 -b:a 80k audio/ringtone-$id.mp3
done
```

### Watch pictures

```bash
tools/sync-watch.sh [path-to-hayya-repo] [path-to-hayya-wear-repo]
```

Fills `watch/`, the pictures in the `#watches` section, from two repos:

- **Wear OS**: the app, tile and call from `hayya-wear/store/screens`, and five of the
  faces from `hayya-wear/store/faces` (one per style, each in a different colour). These
  are drawn by hayya-wear's scripts, not captured, and are round with transparent
  corners. Resized to 440px, WebP plus PNG, corners kept transparent.
- **Apple Watch**: four simulator captures from the app repo's `store/watch`, copied at
  their own 374x446. While that folder only exists on `build-train`, the script reads it
  from git (`WATCH_BRANCH`, default `origin/build-train`).

It also writes every face style in every colour, plus each style's always-on screen, to
`watch/faces/` for the face picker (65 WebPs, about 1 MB, loaded one at a time).

Which files, and their names on the site, are set at the top of the script. Needs `cwebp`.

### Store badges

`assets/badge-app-store.svg` and `assets/badge-google-play.png` are the official badges:

```bash
curl -O https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg
curl -o play.png https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png
ffmpeg -i play.png -vf "crop=564:168:3:15" -pix_fmt rgba assets/badge-google-play.png
```

Google's PNG has transparent padding baked in (570x198 with the badge in 564x168 of it).
The crop takes it off, so at one CSS height both badges are the same size. The badge is
3.357 times as wide as it is tall: 175x52, 128x38.

## Preview locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

GitHub Pages serves `main` from the repo root. Pushing to `main` publishes.

## Before publishing changes

- Contact email is `rushan52@gmail.com` in `privacy.html`, `support.html`, `terms.html`, and
  every footer.
- Effective dates on the legal pages are 21 July 2026.
- iOS requirement quoted on the site (iOS 16.4 or later) comes from the App Store listing.
  Re-check it after a build that raises the deployment target.

# TrustOS — trustos.missionctrl.agency

The trust-intelligence layer of the Brand Effect — MissionCTRL's methodology for turning purpose-led brands into movements.

A MissionCTRL product. © 2026 MissionCTRL Ltd.

---

## Site structure

Pure static HTML. No build step, no framework, no external stylesheet — each
page carries its own `<style>` block. Netlify publishes the repo root
(`publish = "."`), so **the repo is the deployed site**.

23 public pages, 12 of them sector POVs, plus 14 gated pages.

```
.
├── index.html                     # Homepage
├── 404.html
├── netlify.toml                   # publish = "."; security headers; apex redirect
├── robots.txt  sitemap.xml  _redirects
├── favicon.svg  favicon-32.png  apple-touch-icon.png  og-image.png
│
├── assets/                        # mc-analytics.js, mc-goals.js (cookieless)
│
├── explorer/                      # The TrustOS Explorer — 3-slider self-check
├── methodology/                   # How the index is built
├── faq/                           # FAQ (+ netlify/functions/faq-ask.mjs)
├── insights/                      # Sector Insights hub
│   └── brand-growth-in-an-insular-world-measured/
├── privacy-policy/  cookie-policy/  terms/
├── notrack/                       # Analytics opt-out (noindex)
│
├── <12 sector POVs>/              # One folder each, e.g. energy-integrity-test/
│   ├── index.html                 #   index.html, and where present
│   ├── banner.png                 #   banner.png (1280×720) + banner@2x.png
│   └── banner@2x.png
│
├── navigator/
│   ├── index.html                 # Public "Request a Navigator" page
│   └── <client>/                  # GATED — Basic Auth, per-client password
│       ├── index.html             #   the Navigator
│       └── solutions/index.html   #   the MissionCTRL Solutions read
│
├── viiv/                          # GATED — passcode gate, client campaign
│   ├── index.html
│   └── more/index.html
│
└── netlify/
    ├── edge-functions/
    │   ├── navigator-auth.js      # Basic Auth on /navigator/<client>/*
    │   └── viiv-passcode.js       # Branded passcode gate on /viiv/*
    └── functions/faq-ask.mjs
```

### The 12 sector POVs

`council-trust-test` · `education-public-purpose-test` · `energy-integrity-test` ·
`healthcare-trust-test` · `ingo-brand-trust` · `membership-bodies-trust-test` ·
`mining-trust-window` · `netzero-consent-test` · `private-capital-trust-test` ·
`professional-services-trust-test` · `regtech-brand-trust` ·
`social-care-workforce-test`

## Gating

| Path | Gate | Secret lives in |
|------|------|-----------------|
| `/navigator/<client>/*` | Basic Auth (any username) | `NAVIGATOR_PASSWORD_<CLIENT>` |
| `/viiv/*` | Branded passcode form | `VIIV_PASSCODE` |

Both are Netlify environment variables, set under **Site configuration →
Environment variables**. Neither secret belongs in this repo. `/navigator/`
itself is public — the auth edge function only matches `/navigator/<something>/`.

## Brand identity (canonical)

| Token            | Value          | Use                            |
|------------------|----------------|--------------------------------|
| `--deep`         | `#0a0f1a`      | Primary background             |
| `--trust-slate`  | `#2d3a4a`      | Secondary background / CTA     |
| `--trust-cool`   | `#5a8a9a`      | Primary accent / Clarity color |
| `--trust-ice`    | `#6da0b8`      | Gradient highlight             |
| `--trust-mid`    | `#8fb5c0`      | Light teal accent              |
| Clarity          | `#5a8a9a`      | Driver 1 (Intent↔Expectation)  |
| Connection       | `#7cc4a8`      | Driver 2 (Expectation↔Reality) |
| Confidence       | `#a78bdb`      | Driver 3 (Intent↔Reality)      |

Typography: **Sora**, loaded from Google Fonts.

The product name is written **TrustOS** — one word, no space.

## Local preview

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Netlify picks up `netlify.toml` automatically. No build step.

## Adding the next sector POV

1. Create a root folder named for the POV slug (e.g. `local-government-trust-test/`).
2. Copy `energy-integrity-test/index.html` as the template.
3. Replace title, hero, lede, body, diagnostic scores and sources. Keep the
   `<title>` in the form *Headline | TrustOS by MissionCTRL*.
4. Drop `banner.png` + `banner@2x.png` into the same folder.
5. Add a card on `insights/index.html` and move the sector out of its
   coming-soon strip.
6. Add the sector to the selector data in `index.html` (`SECTORS`) and to the
   `SECTORS` map in `explorer/index.html` so the benchmark matches.
7. Cross-link it from the "Related Sector POVs" cards on the other POVs.
8. Add the new URL to `sitemap.xml`.

## Methodology

TrustOS runs Intent / Expectation / Reality, plus the three trust drivers
(Clarity / Connection / Confidence) on a foundation of Integrity. Public
surfaces publish a **band**, never a composite score. See `/methodology/` for
the canonical model.

---

For questions: hello@missionctrl.agency

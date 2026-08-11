# Fonts

**Noto Sans Devanagari** — © The Noto Project Authors.
Licensed under the SIL Open Font License, Version 1.1.
Full licence: https://openfontlicense.org

Self-hosted rather than loaded from Google Fonts: it removes a third-party
request from every page load, avoids a render delay on the main heading, and
keeps the site working if Google Fonts is blocked or slow.

| File | Subset | Size |
|---|---|---|
| `noto-devanagari.woff2` | Devanagari (U+0900–097F et al.) | 118 KB |
| `noto-latin.woff2` | Latin | 25 KB |

Both are variable weight (100–900), so one file covers every weight the site
uses. Only the Devanagari file is fetched by browsers rendering Devanagari
text; `unicode-range` in `style.css` keeps the Latin subset from downloading
unless it is needed.

**Host Grotesk** — © The Host Grotesk Project Authors.
Licensed under the SIL Open Font License, Version 1.1.

| File | Subset | Size |
|---|---|---|
| `hostgrotesk.woff2` | Latin | 20 KB |

Variable weight (100–900), so one file covers every weight the player uses.
Latin only — Devanagari falls through to Noto via `unicode-range`.

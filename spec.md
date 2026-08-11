# Bus Driver Playlist — Specification

**Status:** v1.3 — built and live. Awaiting 9:16 portrait image variants.
**Date:** 2026-08-11

**Decisions locked:** audio via YouTube IFrame API (§3, Option A) · images are
AI-generated and owned by us (§4.3) · deploying as a public shareable link (§6b)
· 4 images compressed 7.9 MB → 541 KB (§4.4).

**Open:** none blocking. Counter is simulated for now (§10.3, Option C, chosen
knowingly) · portrait is centre-crop until 9:16 variants are produced (§4.4b).

---

## 1. Concept

A single-page website that recreates the sound of an Indian long-distance bus /
truck cabin: 90s–early-2000s Bollywood tracks playing continuously, over a slow
rotation of four full-bleed images that cross-fade into each other.

Spiritual sibling of `saloon.wtf` (Yash Bhardwaj, Aug 2026), which does the same
thing for neighbourhood barbershops. Same format, different setting: highway
instead of barber's chair.

### 1.1 What "clone of saloon.wtf" means here

We are cloning the **format** — one page, no navigation, continuous nostalgic
playlist, ambient visuals, tiny UI. We are not copying their source code,
markup, styling, image assets, or track list. Two reasons:

1. Their code and assets are theirs. Re-implementing the idea is fine; lifting
   the files is not.
2. **Practical blocker:** the sandbox this spec was written in cannot reach
   `saloon.wtf` (egress proxy returns 403 on CONNECT; archive.org and the news
   coverage are blocked too). Everything below about "how saloon.wtf works" is
   inference from the standard way this kind of page is built, **not observed
   fact.** If exact behaviour parity matters, someone needs to open the site on
   an unrestricted machine and note: the audio source, whether there is a play
   gate, what the visual layer is, and what controls exist. See §8.

---

## 2. Core requirements

### 2.1 Must have

| # | Requirement |
|---|---|
| R1 | Single page, no routing, no navigation, no scrolling. Fills the viewport. |
| R2 | Continuous playback of a curated 90s/2000s Bollywood playlist. |
| R3 | Auto-advance to the next track when one ends. Playlist loops forever. |
| R4 | Exactly 4 background images, full-bleed, cycling on a timer. |
| R5 | Each image holds for **7s**, then cross-fades into the next. Loops 1→2→3→4→1. |
| ~~R6~~ | ~~An entry gate ("tap to start")~~ — **withdrawn**, see §4.1. The play button supplies the gesture instead. |
| R7 | Minimal controls: play/pause, next, volume/mute. |
| R8 | Current track title visible somewhere unobtrusive. |
| R9 | Works on mobile (this will mostly be opened on phones from a shared link). |
| R10 | Live occupancy counter — *"34 passengers here"* — showing how many people are on the site right now. See §10. |

### 2.2 Should have

- Shuffle by default, with no immediate repeats.
- Track list decoupled from code (`playlist.json`) so songs can be added without
  touching JS.
- Period-appropriate texture over the images: grain, vignette, slight warmth —
  it should feel like a scanned photo, not a stock wallpaper.
- Respects `prefers-reduced-motion` (cut instead of cross-fade).

### 2.3 Explicit non-goals

- No accounts, no database, no analytics beyond nothing.
- ~~No backend.~~ **Superseded by R10** — a truthful live counter cannot be
  built from static files alone. See §10.
- No search, no user-submitted songs, no comments.
- No build step, no framework. Plain HTML/CSS/JS is enough and stays deployable
  to GitHub Pages forever with zero maintenance.

---

## 3. THE BLOCKER: where does the music come from

This is the single decision the whole project hangs on. Everything else is a
weekend's work; this is the part that can get the site taken down.

**The problem:** the 90s Bollywood catalogue is not public domain and not
royalty-free. Those recordings are owned by T-Series, Saregama, Tips, Venus,
Sony Music India and others, and those labels are unusually active about
enforcement. Self-hosting MP3s of them on a public site is straightforward
copyright infringement, regardless of the site being free, non-commercial,
nostalgic, or a joke.

Four options, with honest trade-offs:

### Option A — YouTube IFrame Player API *(recommended for a public site)*

Embed the official label uploads and drive them through the IFrame API. The
playlist becomes a list of YouTube video IDs.

- **Legal:** clean. Licensing is between YouTube and the labels; plays count
  toward the rights holder. This is the intended use of the embed API.
- **Cost:** free, no API key needed for the IFrame player.
- **Costs you pay in UX:**
  - YouTube ToS requires the player be present and not obscured. It can be
    small and pushed to a corner, but fully hiding it behind the images is a
    ToS violation. Design has to make room for it — or lean in and make the
    little player part of the aesthetic.
  - Ads may play before/between tracks. Cannot be suppressed.
  - Individual videos can be region-blocked, or have embedding disabled, or be
    deleted — the playlist will rot and needs occasional checking. Needs a
    graceful "skip to next" on load failure.
  - Requires network; no offline.
  - iOS needs `playsinline`; some mobile browsers require a user gesture per
    play, not just once.

### Option B — self-hosted audio files

`<audio>` element, MP3s in the repo or on a CDN.

- **UX:** perfect. Full control, instant, no ads, no third party.
- **Legal:** infringing, for any track you don't own. Expect DMCA notices;
  GitHub Pages / Netlify will pull the site. Do not do this on a public URL.
- **Acceptable variant:** local-only. Run it on your own machine, files stay
  out of git (`.gitignore` the audio dir). Perfect for personal use, but you
  can't share the link — which is most of the point of a project like this.

### Option C — licensed streaming SDK (Spotify Web Playback)

- Requires every listener to log in with **Spotify Premium**. Kills the
  "click a link, hear music" magic instantly. Rejected.

### Option D — royalty-free / commissioned / AI-generated retro-Bollywood-style tracks

- **Legal:** clean, fully self-hostable, no ads, no rot.
- **Cost:** the joke stops landing. The entire emotional payload is *"oh my god,
  THIS song."* Generic 90s-flavoured instrumentals get none of that.
- Viable as a fallback layer if the primary source fails, not as the main plan.

### DECISION: Option A — YouTube IFrame API

Chosen. It is the only route that is both legal and shareable, and the site is
going public (§6b). We design around the visible-player constraint rather than
fighting it: a small player docked in a corner, styled to read as a dashboard
stereo or cassette deck, becomes part of the aesthetic instead of a compromise.

Option B stays available behind a local dev flag so the visuals can be built
offline without YouTube in the loop.

**Consequences accepted:** ads may play between tracks; the player stays
visible; the playlist will need occasional checking as videos get removed or
region-blocked.

---

## 4. Other constraints

### 4.1 Autoplay is blocked — the play button is the gesture

Chrome, Safari and Firefox all block audible autoplay without a user gesture.
There is no workaround and we should not want one.

**Superseded:** this originally called for a landing gate ("tap to board") to
collect that gesture. The gate is gone. A gate was only ever *one* way to get a
click, and the play button is already a click — so the page now loads straight
into the site with the player **cued and paused**, and the first press of play
starts the audio. From then on `loadVideoById` carries that permission forward
for the rest of the session, so track changes need no further interaction.

R6 in §2.1 is therefore withdrawn.

The one thing the gate did buy was a guaranteed head start on image preloading
before the first cross-fade. The `<link rel="preload">` on slide 1, `eager`
loading on the rest, and the 7s dwell before the first fade cover that.

### 4.2 Mobile realities

- iOS Safari suspends audio when the tab backgrounds or the phone locks.
  Nothing to do about it in a web page; don't promise background playback.
- Viewport height: use `100dvh`, not `100vh` — mobile browser chrome will
  otherwise crop the image.
- Data: full-bleed images on 4G. Budget hard, see §4.4.

### 4.3 Image rights — RESOLVED

The 4 images are AI-generated (ChatGPT). No third-party rights problem; they
ship with the site.

One residual caution, cheap to check: if any image closely depicts a recognisable
real actor or reproduces a specific film frame, that reintroduces a likeness /
publicity-rights question that AI generation does not wash out. Generic bus
interiors, highways, dashboards and roadside scenes are entirely clear. Worth a
30-second look at the four before launch, then forget about it.

### 4.4 Performance budget — MET

Source images were 4 × 1920×1080 totalling **7.9 MB** (two PNG, two JPEG) —
about 6.5× over budget. Compressed to WebP (q80) + progressive JPEG fallback at
1920px and 1280px:

| Set | Payload |
|---|---|
| Desktop, WebP (1920) | **541 KB** |
| Mobile, WebP (1280) | **326 KB** |
| Desktop, JPEG fallback | 1047 KB |

93% reduction, comfortably inside the 1.2 MB budget. Quality verified by PSNR
against the originals: 34.4–37.8 dB across the four, above the threshold where
differences become visible. Flat vector-style illustration is the ideal case for
WebP — large areas of uniform colour, no film grain to preserve.

- Serve via `<picture>`: WebP first, JPEG fallback, `srcset` switching to the
  1280px set below 800px viewport width.
- All 4 preloaded during the landing screen, before the first fade. A fade that
  stutters because image 2 is still downloading looks broken.
- Total page weight excluding audio: target under 1.5MB. Currently on track.
- Uncompressed originals removed from the working tree; they remain in git
  history on `main` if a re-encode is ever needed.

### 4.4b The portrait-crop problem — needs a decision

All 4 images are **16:9 landscape**, and the composition uses the full width:
in the driver's-cabin image the road sign sits far left and the driver far
right. A portrait phone at `object-fit: cover` shows roughly the middle third —
which throws away most of what makes each illustration work. Most traffic will
be portrait phones.

Three ways out:

1. **Horizontal Ken Burns pan on portrait** *(recommended)*. Rather than fight
   the crop, use it: slowly pan across the wide image during its dwell,
   revealing the composition like a camera move. This solves the crop *and* the
   §4.6 loop-monotony problem with the same mechanism, needs no new assets, and
   looks deliberate.
2. **Letterbox** (`object-fit: contain`) over a blurred backdrop. Shows the whole
   frame, but wastes vertical space and reads as a slideshow rather than a place.
3. **Portrait variants** — 4 more generated images cropped/extended to 9:16.
   Best result, most work, and risks the two sets feeling inconsistent.

### 4.4c Palette continuity

The four images do not share a palette. 01 and 02 are warm gold/teal interiors;
03 is bright blue-and-orange; 04 is cool blue/pink. Cross-fading between
distant palettes goes muddy at the 50% mark. Mitigations: order them to keep
adjacent pairs close (current order 01→02→03→04 does this reasonably, with
04→01 the one hard jump), and let the shared grain/vignette/warmth overlay from
§2.2 sit above all four — a common top layer pulls disparate images into one
world.

### 4.4d Tone check — your call, not a blocker

Images 03 and 04 depict a passenger being sick and a scuffle breaking out.
They're funny and true to the format, but they're a sharp tonal turn from the
warm nostalgia of 01 and 02, and each one holds the full screen for 7 seconds.
Worth a deliberate decision: keep all four for the comedy, or lead with the two
warm ones and treat the other two as punchlines deeper into the rotation.
Flagging it because it's easy to not notice until it's live.

### 4.5 Accessibility

- `prefers-reduced-motion: reduce` → hard cut between images, no cross-fade.
- Controls must be real focusable buttons with labels, not divs.
- Contrast: text over photographs needs a scrim or text-shadow, not hope.

### 4.6 The short-loop problem

4 images × **7s** = a **28-second** visual cycle, running under 4–5 minute
songs — so the full set comes round roughly nine times per track. Shortening the
dwell from 10s to 7s made the page livelier and the repetition more frequent;
the Ken Burns drift below is what keeps that from reading as a stutter, since no
two passes frame the image identically. Mitigations, cheapest first:

1. **Ken Burns** — a very slow zoom/pan on each image (~1.05x over its 7s).
   Same 4 assets, but no two viewings look identical. Big effect, ~10 lines of
   CSS. *Recommended.*
2. **Longer dwell** — back toward 10–15s per image. Cuts the loop frequency. Free.
3. **Change on track change** instead of a fixed timer — ties visuals to music,
   loop becomes invisible. But breaks the fixed-dwell requirement (R5).
4. **More images.** Most effective, but you have 4.

Ken Burns is in. Dwell is a single constant (`DWELL_MS` in `app.js`, mirrored by
`--dwell` in `style.css`), so retuning it is a one-number change in two places.

---

## 5. Proposed architecture

Static site. No build. Deployable to GitHub Pages as-is.

```
index.html          — markup, all of it
style.css           — layers, fades, grain, responsive
app.js              — slideshow timer + player controller + playlist + counter
playlist.json       — [{ title, film, year, videoId }]
images/
  01.webp  02.webp  03.webp  04.webp          (1920px)
  01-1280.webp … 04-1280.webp                 (mobile)
  01.jpg … 04.jpg, 01-1280.jpg … 04-1280.jpg  (fallback)
worker/             — live counter service, deployed separately (§10)
```

Image order is fixed as: 01 driver's cabin · 02 aisle with conductor ·
03 crowded bus · 04 the scuffle.

### 5.1 Visual layers (bottom → top)

1. **Image stack** — 4 absolutely-positioned `<img>`, all loaded up front, only
   one at `opacity: 1`. Cross-fade is a CSS `opacity` transition (~1.2s), driven
   by toggling one class. GPU-composited, cheap, no JS animation loop.
2. **Grain + vignette** — one fixed overlay, `pointer-events: none`.
3. **UI** — track title, controls, the YouTube player dock.

### 5.2 Slideshow controller

- `setInterval` at `DWELL_MS = 10000`.
- Advance = remove `.is-active` from current, add to next. CSS does the rest.
- On `visibilitychange` → hidden: clear the interval. On visible: restart it.
  Prevents drift and pointless work in a backgrounded tab.
- Fully independent of the audio. Simpler, and it keeps moving through ads and
  buffering.

### 5.3 Player controller

Thin wrapper with a stable interface — `play() / pause() / next() / setVolume()`
plus an `onEnded` callback — with two implementations behind it: YouTube IFrame
and plain `<audio>`. This is the one piece of indirection worth building,
because it means the §3 decision can be revisited without a rewrite.

### 5.4 YouTube backend — implementation notes

Now that Option A is locked, the specifics that will actually bite:

- Load `https://www.youtube.com/iframe_api`; it calls the global
  `onYouTubeIframeAPIReady` when ready. Construct the player only after that.
- Use `host: 'https://www.youtube-nocookie.com'` — no tracking cookies until
  playback actually starts.
- `playerVars`: `playsinline: 1` (mandatory for iOS, otherwise iOS hijacks the
  screen with its native fullscreen player), `rel: 0`, `modestbranding: 1`,
  and `origin` set to our deployed URL.
- **Create the player once and call `loadVideoById()` to change tracks — never
  tear down and rebuild the iframe.** Rebuilding loses the user-gesture context,
  and several mobile browsers will then refuse to play until the user taps
  again. This single detail is the difference between "works on my phone" and
  a playlist that stalls after track one.
- `onStateChange` → `YT.PlayerState.ENDED` drives auto-advance.
- `onError` must skip, not stall. Codes worth handling: `100` (video gone or
  private), `101` / `150` (owner disabled embedding — common on label uploads,
  expect to lose a few), `2` (bad ID), `5` (player error). All four → drop from
  this session's queue, advance, and don't retry.
- **Player size:** YouTube's IFrame API docs specify a 200×200px minimum.
  **This is what sets the size of the circular album art** — see §12.2.
- **iOS volume:** `setVolume()` is a no-op on iOS — volume is hardware-only
  there. Mute/unmute *does* work. So the control should be a mute toggle, with a
  volume slider shown only where it functions, rather than a slider that
  silently does nothing on half the traffic.
### 5.4b Playlist mode — now the default

`playlist.json` carries a `playlistId` and the player is constructed with
`listType: 'playlist'` + `loop: 1`. This is materially better than a hand-kept
list of video IDs:

- YouTube owns ordering, auto-advance and **skipping unplayable entries**, so
  the 101/150 attrition problem above stops being ours to manage.
- Curation happens on YouTube. Adding a song needs no commit and no redeploy.
- Consequences in code: `onStateChange → ENDED` must *not* call our `next()`
  (YouTube already advanced — doing both skips two songs), `next()` maps to
  `nextVideo()`, and `onError` maps to `nextVideo()`.

**Shuffle.** `setShuffle()` has a long history of not taking effect reliably, so
it isn't trusted. Instead the first press of play jumps to a random index via
`playVideoAt()` — that press *is* the user gesture, so starting playback there
is allowed. Repeat visits open on a different song; after that it runs in
playlist order and loops.

**Requirement:** the playlist must be public or unlisted. A private playlist
fails to load in an embed, and the failure is silent — the page looks fine and
simply never plays.

The track-list path is kept as a fallback for when `playlistId` is absent.

### 5.5 Playlist logic

- Fisher-Yates shuffle on load; reshuffle when exhausted, never repeating the
  last-played track as the first of the new cycle.
- On player error (video removed / region-blocked / embedding disabled): log,
  drop it from this session's queue, advance. Never leave the user in silence.

---

## 6. Interaction flow

```
Landing  →  tap  →  Playing
   │                   │
   │                   ├─ images cross-fade every 7s, forever
   │                   ├─ track ends → next track
   │                   └─ controls: play/pause · next · mute
   │
   └─ preloads 4 images while waiting
```

---

## 6b. Deployment

Public, shareable link. Static files → GitHub Pages off this repo. No backend,
no build step, no running costs, nothing to maintain between deploys.

---

## 7. Open questions — blocking: ALL ANSWERED

- ~~**Q1. Audio source?**~~ → **YouTube IFrame API.** See §3, §5.5.
- ~~**Q2. Image provenance?**~~ → **AI-generated, ours.** See §4.3.
- ~~**Q3. Public or personal?**~~ → **Public shareable link.** See §6b.

### 7a. Assets still needed before implementation completes

Not decisions — just things only you can hand over:

- ~~**A1.** The 4 image files.~~ → **Received and compressed.** See §4.4.
- ~~**A2.** The curated song list.~~ → **Received.** Playing from YouTube
  playlist `PLVeY0XJJSxJMh2rXK2Taby1v23kj3P5_N`; see §5.4b. Curation now
  happens on YouTube and needs no redeploy.

## 7b. Open questions — non-blocking

- **Q4.** How many songs in the initial playlist? 10–15 is enough for a launch.
- **Q5.** Do you already have a track list, or should it be drafted for review?
- **Q6.** Domain — GitHub Pages subdomain, or a real domain?
- **Q7.** Text on screen — English, Hindi, Hinglish?
- **Q8.** What are the 4 images *of*? Affects whether Ken Burns helps (it does a
  lot for wide landscapes, less for tight interiors).

---

## 8. saloon.wtf — RESOLVED

The site was never reachable from this environment (egress proxy, 403 on
CONNECT, every attempt). Its served HTML was pasted in instead, so §1.1's
inference can now be replaced with observation.

**It is a Next.js app on Cloudflare, and it plays through a hidden YouTube
IFrame player.** The tell:

```html
<div class="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
  <div></div>
</div>
```

A 1×1px, `opacity-0` container holding an empty `<div>` — precisely the mount
point `YT.Player` replaces with an iframe. Corroborating:

- Cover art is self-hosted at `/covers/<id>.jpg`, where `<id>` is an 11-char
  **YouTube video ID** (`N0jnLZxYwYc`).
- The artist line reads **"Satrang Music Official"** — a YouTube *channel*
  name, not a label or singer credit. The metadata comes from YouTube.
- There is a working seek bar (`0:00 / 0:00`, `role="slider"`), which the
  IFrame API supports via `getCurrentTime` / `getDuration` / `seekTo`.
- No 200×200 player exists anywhere in the layout.

### 8.1 What this means for our decisions

- **Same audio source as ours** (§3 Option A). The route was right.
- **Their player is hidden at 1×1**, which is a straight violation of the
  IFrame API terms. Ours is visible at 80px — undersized (§12.2b) but present
  and interactive. Our deviation is the much smaller one, and worth keeping.
- **Ads are not being suppressed by any technique**, because none exists. The
  likely reason their playback feels uninterrupted is *song selection*: a
  channel like "Satrang Music Official" is a small unofficial uploader, and
  unmonetised uploads serve no ads. Official label uploads (T-Series, Saregama,
  Tips) are monetised and always will. This is exactly the trade described in
  §3 — fewer ads, at the cost of link rot and takedown risk, since unofficial
  copies are the ones that disappear.
- Worth noting a hidden player makes ads *worse* when they do fire: the
  visitor hears an ad with no reachable "Skip" button.

### 8.2 Worth borrowing (all legitimate)

- Outbound **Spotify** and **YT Music** playlist links, top-right. Two anchors,
  no licensing implications, and a graceful way to hand the playlist over.
- Album art that **spins while playing** (`animation-play-state` toggled between
  `running` and `paused`) — our disc is static and already circular.
- A **seek bar** and a **previous-track** button; we have neither.

---

## 10. Live passenger counter (R10)

*"34 passengers here."* Great fit for the concept — it turns a solo page into a
shared bus. But it is the one feature that cannot be built from static files,
so it deserves its own decision.

### 10.1 Why this breaks the architecture

Counting concurrent visitors requires somewhere shared to count. GitHub Pages
serves static files and nothing else. So the site stays static, and the counter
talks to a small service hosted elsewhere (a `workers.dev` subdomain or similar)
over CORS. The site is still deployable to Pages; there is simply now a second,
tiny thing to deploy.

### 10.2 The scale question is the real one

saloon.wtf did roughly 1.6M views off a single post. If this lands even
slightly, the counter is the only component with a hard concurrency ceiling —
and it fails exactly at the moment the most people are watching, which is the
worst possible failure mode. Free tiers of the managed realtime services cap
around **200 concurrent connections**. A viral spike passes that in seconds.

### 10.3 Options

**A. Cloudflare Worker + Durable Object, heartbeat polling** *(recommended)*
- Client POSTs a heartbeat with a random ephemeral session ID every ~15s. The
  Durable Object keeps a sliding 45s window and returns the live count.
- No persistent sockets, so it scales far past a WebSocket approach at the same
  cost, and survives a viral spike.
- Freshness ~15s, which is indistinguishable from live for this purpose.
- Requires the Workers **paid plan, $5/month** (Durable Objects aren't on the
  free tier). That's the entire running cost of the project.

**B. Managed realtime presence (Supabase / Ably / Pusher), client-only**
- Least code — presence is a built-in primitive; no service to write or deploy.
- Free tier ≈ 200 concurrent connections, then it degrades or cuts off. Fine
  for friends-and-family, wrong bet if this is meant to be shared publicly.

**C. Simulated counter** — **CHOSEN**
- A plausible-looking number generated client-side, no backend, no cost.
- The trade was raised and accepted: the number is visible in the JS to anyone
  who looks, and on a site about being somewhere together, being caught faking
  it costs more than the feature is worth. Decision taken knowingly.
- **Mitigation that matters:** it is implemented behind the exact async
  interface a real backend would expose — `Passengers.get() → Promise<number>`.
  Switching to Option A later replaces one function body with a `fetch()`; no
  other code changes. The simulation is a swappable adapter, not a dead end.
- The simulation drifts on a random walk rather than jumping, and is weighted
  by Indian time-of-day so an evening visitor sees a busier bus.

### 10.4 Behaviour details

- Copy: *"N passengers here"*, singular-aware — *"1 passenger here"*, and
  *"just you on this bus"* at N=1 is a nicer read than the bare number.
- Count the current visitor, so it never shows 0 while someone is looking at it.
- **If the counter service is unreachable, hide the element entirely.** Never
  show 0, never show a stale number, never fall back to a fake one.
- Ephemeral random session IDs only. No cookies, no fingerprinting, no IP
  storage, nothing that outlives the visit — keeps the whole feature out of
  consent-banner territory.
- Poll on a timer; pause heartbeats when the tab is hidden (reuses the
  `visibilitychange` handling already specified in §5.2) so backgrounded tabs
  don't inflate the count or burn quota.

### 10.5 Added file

```
worker/            — counter service (Cloudflare Worker + Durable Object)
  index.js
  wrangler.toml
```

---

## 12. Design revision — Hindi masthead, centred pill player

### 12.1 Copy is now Hindi throughout

Masthead: **उत्तर प्रदेश परिवहन सेवा** (white, bold, 800 weight), with
**आपका स्वागत करती है** beneath it. Every other string — controls, counter,
errors, the boarding button — is Devanagari too, and `<html lang="hi">`.
All UI text lives in the `T` object at the top of `app.js`, so wording changes
never mean hunting through markup.

**Font: Noto Sans Devanagari, self-hosted** (`fonts/`, OFL 1.1, redistribution
permitted). Self-hosted rather than linked from Google Fonts because the
masthead is the first thing painted — a third-party round-trip there is exactly
where a webfont delay is most visible. The variable file covers every weight;
`unicode-range` means the Latin subset only downloads if Latin text appears.
146 KB total, of which browsers typically fetch only the 118 KB Devanagari file.
System Hindi faces (Nirmala UI, Kohinoor Devanagari, Mangal) back it up.

### 12.2 The circular art and the YouTube terms — resolved, with a caveat

The brief was circular album art inside the player. Read literally that means
hiding the YouTube iframe and showing artwork in its place, which is the one
thing §3 Option A rules out: the IFrame API terms require the player stay
visible and unobscured. Hiding it would put the site's licensing position — the
whole reason for choosing YouTube — at risk.

**Resolution: the circular art *is* the player.** The iframe is built 356×200
(16:9 at the minimum legal height) and clipped by a 200px circular mask, so the
video fills the disc instead of letterboxing. The player is fully visible,
plays, and is interactive. Nothing is faked and nothing is hidden.

- **Circular clipping crops the video's sides.** Mild grey area: the player is
  visible and unobscured, but not showing its full frame.

### 12.2b Disc reduced to 80px — a knowing deviation

The 200px disc made the player dominate the screen, so it is now **80px** (a
60% reduction), which puts the *presented* player below YouTube's documented
200×200 minimum. Recorded plainly because it is a real deviation, taken
deliberately for the design:

- **What is preserved:** the player is still the visible, interactive,
  real YouTube embed. It is not hidden, and no fake artwork stands in for it.
  Undersized is a materially smaller deviation than concealed.
- **How it is built:** the iframe is instantiated at 356×200 — a normal size,
  so YouTube's own player renders as it expects — and then scaled to 0.4 in
  CSS. Constructing it at 142×80 instead would invite YouTube's
  too-small-player handling, which can refuse to render controls or the video.
  The scale factor and both sizes are variables in `style.css`, kept in step
  with `DISC_NATIVE` in `app.js`.
- **Practical risk:** low. Enforcement here is not automated and small embeds
  are common across the web. The exposure is theoretical rather than likely,
  but it is non-zero and it exists on the licensing path the whole project
  depends on.
- **Reverting is one line:** set `--disc: 200px` and `--disc-scale: 1`.

### 12.3 Layout

One centred player replaces the old split deck-and-dock: a rounded rectangle
(`border-radius: 20px`, 1px white stroke at 50%) laid out as a single row —
disc, then title, then controls — at every breakpoint. The title column is
vertically centred against the art, and the controls are set off to the right
with their own margin. With the disc at 80px there is no longer any reason to
stack on mobile, so the shape stays consistent.

**Titles: one line, marquee on overflow, soft-masked.** Real YouTube titles run
long — *"Song | Film | Artist | Full Video Song"* — and the middle column is
narrow once the disc and three controls take their share (≈126px on a 390px
phone). The title gets a fixed one-line window:

- Fits → centred, static.
- Doesn't fit → a second copy is appended and the pair scrolls at 42px/s. Two
  copies make the loop seamless rather than snapping back at the end.
- Either way the window is **mask-faded** at both edges
  (`mask-image: linear-gradient`), so overflow reads as continuing rather than
  being chopped. No ellipsis, no hard cut.
- Overflow is measured in a `requestAnimationFrame` after the text is in the
  DOM, and re-measured (debounced) on resize, since rotating a phone flips
  whether scrolling is needed. The track and its spans are `flex: 0 0 auto` —
  without that they would shrink to fit and never register as overflowing.
- Under `prefers-reduced-motion` the animation is off; the mask still fades the
  overflow, so it degrades to a soft cut rather than a hard one.

`MARQUEE_GAP_PX` in `app.js` must stay equal to `--marquee-gap` in `style.css`;
the gap is part of the scroll distance.

Masthead is fixed top-centre and persists across both the gate and playback.
The passenger counter sits under the player.

---

## 13. Bus horn

A horn sting sounds at a random interval over the music. Requested floor: 40s
between horns, longer is fine.

- **Interval:** random in 40–95s. The floor holds in practice as well as in
  theory — a turn skipped because playback is paused waits out a *fresh*
  interval rather than firing immediately on resume, so two audible horns are
  never closer than 40s.
- **Gated on:** music actually playing, not muted, tab not hidden. A horn over
  a paused page, or into a backgrounded tab, would read as a bug.
- **Web Audio, not `<audio>`.** iOS ignores `HTMLAudioElement.volume`, so an
  `<audio>` horn would play at full device volume on every iPhone regardless of
  what we set. A `GainNode` is respected everywhere. The `AudioContext` is
  constructed inside the play-button click, since one created outside a user
  gesture starts suspended and never makes a sound.
- **Degrades quietly:** no Web Audio support, or a missing/undecodable file, and
  the horn simply never plays. Nothing else breaks.

### 13.1 The clip is 9.75s — worth a decision

The supplied file is 9.75s of stereo audio, not a short toot. Over a 40–95s
cycle that is roughly **10–25% of the runtime with a horn sounding over the
music**, which is a lot more horn than "occasional".

Left at full length, because it is the file that was provided and trimming it
unasked would be guessing at intent. `Horn.MAX_LEN_S` in `app.js` trims it to a
given number of seconds — set it to `2` for a short blast — and the underlying
file is untouched either way.

### 13.2 File renamed

Uploaded as `bus horn.mp3`; renamed to `bus-horn.mp3`. Spaces in asset names
have to be percent-encoded in URLs and are a routine source of 404s on static
hosts. Not worth the risk for a filename.

---

## 14. Traffic ambience

A looping traffic/engine bed at 50%, running independently of the music.

### 14.1 Why not a second YouTube player

The obvious route — a second `YT.Player` on an ambience video, held at a fixed
level —
**cannot meet its own requirement on iOS**:

- **`setVolume()` is a no-op on iOS.** Volume there is hardware-only. The
  ambience would play at exactly the same level as the songs on every iPhone.
  A fixed level below the songs is the whole point, and it is unachievable
  this way.
- **Concurrent playback is unreliable on iOS**, where starting a second stream
  has historically paused the first. The failure mode is the *music* stopping.
- It compounds the §12.2b deviation: a second player would also need to be
  visible under the IFrame API terms, and an ambience track has nowhere
  sensible to be seen.

Desktop would be fine. Phones are most of the traffic for a shared link, so
"works on desktop" isn't good enough here.

### 14.2 What was built instead

A local audio file through the same Web Audio path as the horn (§13), where a
`GainNode` gives a true fixed level on every platform including iOS.

- Loops gaplessly via `AudioBufferSourceNode.loop` for the whole session.
- **Runs independently of the music**, at **50%**. It starts as soon as the page
  is woken and keeps going whether or not a song is playing — you are on the bus
  before the driver puts the tape in. Only mute or a hidden tab silence it, over
  a ~2s ramp so it breathes rather than clicking on and off. Mute silences the
  whole cabin, not just the songs.

### 14.2b Starting before the music — what is actually possible

Requested: the ambience should already be playing when someone opens the page.
No browser permits sound before the page has been interacted with, and no
`AudioContext` will leave `suspended` until then — this is the same wall as
§4.1 and there is no way through it.

What is done instead: the context is built and the loop **started** at page
load, sitting suspended and silent, then resumed on the **first sign of life** —
`mousemove`, `pointermove`, `pointerdown`, `touchstart`, `keydown`, `wheel` or
`scroll`, anywhere on the page. Not just the play button.

**`mousemove` is the one that matters on desktop.** The HTML spec's list of
activation-triggering events does not include it, so this was tested rather than
assumed — on a bare page with no app code, Chromium stays `suspended` with no
input at all, and `resume()` resolves to `running` after mouse movement alone,
with no click. So on a desktop the traffic starts as the visitor's hand moves,
before they touch anything.

Two honest limits:

- **Touch devices have no `mousemove`.** Phones wake on their first tap
  instead — which for most visitors is the play button, so the ambience and the
  music start together rather than the ambience arriving first.
- Verified in **Chromium**. Safari and Firefox may take a stricter line, since
  this leans on browser leniency rather than a guarantee in the spec. If they
  refuse, the fallback is the ordinary tap or click, which always works.

Events a browser declines to treat as activation cost nothing. All handlers
detach the moment the context reaches `running`.
- Horn and ambience share one `AudioContext` (`AudioBus`); browsers cap how
  many can exist and there's no reason for two.
- **Absent file degrades to silence.** `ambience.mp3` is not in the repo yet;
  the fetch 404s, the module returns early, and nothing else is affected.
  Verified.

### 14.3 Compression — 12.4 MB → 313 KB

The supplied file was **9 minutes** of 192 kbps stereo (12.4 MB). Since the bed
loops, almost all of that was waste: the biggest saving is duration, not
bitrate.

| Step | Why |
|---|---|
| Trim to **40s** | It loops. Nine minutes buys nothing a listener can detect. |
| **Mono** | Halves the data. A background bed has no stereo image to lose. |
| **32 kHz**, 64 kbps | Traffic rumble is low-frequency and sits under the music. Detail here is inaudible. |

**97.5% smaller**, and now the single largest asset is still the images.

**The loop is genuinely seamless**, which took care. Cutting 40s at an arbitrary
point clicks audibly on every wrap. Instead the 2s immediately *after* the cut
are crossfaded back over the opening 2s, so the last sample and the first are
consecutive samples of the original recording.

MP3 encoding then threatens that: encoders add delay and padding that can
insert silence at the join. Verified in Chromium after a full decode —
**39.996s, zero leading or trailing silence**, and a wrap-point jump of 0.029
against a normal peak sample-to-sample step of 0.050. The join sits inside the
signal's own motion, so it is inaudible.

Reproducing this from a new source file: decode → mono/32 kHz → take
`SKIP + LOOP + CROSSFADE` → wrap the crossfade tail over the head → encode
64 kbps mono. The original 12.4 MB file remains in git history.

---

## 11. Rough plan

1. Scaffold `index.html` / `style.css` / `app.js`, landing gate, no audio.
2. Image layer: 4 slots, preload, 7s cross-fade, Ken Burns, reduced-motion.
3. Player abstraction + chosen backend, auto-advance, error-skip.
4. Controls, track title, grain/vignette pass.
5. Mobile pass — real device, `100dvh`, tap targets, data weight.
6. Deploy to GitHub Pages.

Nothing in this list is blocked on a decision any more. Steps 1–2 can start
immediately using placeholder images; steps 3–4 are fully specified by §5.4.
Step 5 needs the real images (A1) and the track list (A2) to be meaningful.

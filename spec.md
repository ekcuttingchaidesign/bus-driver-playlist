# Bus Driver Playlist — Specification

**Status:** v1.0 — blocking questions answered, ready to implement. No code written yet.
**Date:** 2026-08-11

**Decisions locked:** audio via YouTube IFrame API (§3, Option A) · images are
AI-generated and owned by us (§4.3) · deploying as a public shareable link (§6b).

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
| R5 | Each image holds for **10s**, then cross-fades into the next. Loops 1→2→3→4→1. |
| R6 | An entry gate ("tap to start") — required by browser autoplay policy, see §4.1. |
| R7 | Minimal controls: play/pause, next, volume/mute. |
| R8 | Current track title visible somewhere unobtrusive. |
| R9 | Works on mobile (this will mostly be opened on phones from a shared link). |

### 2.2 Should have

- Shuffle by default, with no immediate repeats.
- Track list decoupled from code (`playlist.json`) so songs can be added without
  touching JS.
- Period-appropriate texture over the images: grain, vignette, slight warmth —
  it should feel like a scanned photo, not a stock wallpaper.
- Respects `prefers-reduced-motion` (cut instead of cross-fade).

### 2.3 Explicit non-goals

- No accounts, no backend, no database, no analytics beyond nothing.
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

### 4.1 Autoplay is blocked — turn it into the front door

Chrome, Safari and Firefox all block audible autoplay without a user gesture.
There is no workaround and we should not want one.

So the first paint is a landing screen — a still image, the title, and one
prompt (`"Chalo"` / `"Board the bus"` / `"Tap to start"`). One tap starts audio
and begins the slideshow. This satisfies the policy, sets the tone, and gives
images time to preload. It is a feature, not a workaround.

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

### 4.4 Performance budget

- 4 images, each ≤ 300KB, WebP with JPEG fallback, sized for ~2x of a phone
  screen (roughly 1600px on the long edge). Total image payload under ~1.2MB.
- All 4 preloaded during the landing screen, before the first fade. A fade that
  stutters because image 2 is still downloading looks broken.
- Total page weight excluding audio: target under 1.5MB.

### 4.5 Accessibility

- `prefers-reduced-motion: reduce` → hard cut between images, no cross-fade.
- Controls must be real focusable buttons with labels, not divs.
- Contrast: text over photographs needs a scrim or text-shadow, not hope.

### 4.6 The 40-second loop problem

4 images × 10s = a **40-second** visual cycle, running under 4–5 minute songs.
The loop will be noticed, roughly six times per track. Worth deciding
deliberately rather than discovering after launch. Mitigations, cheapest first:

1. **Ken Burns** — a very slow zoom/pan on each image (~1.04x over its 10s).
   Same 4 assets, but no two viewings look identical. Big effect, ~10 lines of
   CSS. *Recommended.*
2. **Longer dwell** — 15–20s per image. Halves the loop frequency. Free.
3. **Change on track change** instead of a fixed timer — ties visuals to music,
   loop becomes invisible. But breaks the stated "10 seconds" requirement.
4. **More images.** Most effective, but you have 4.

Recommendation: keep 10s as specified, add Ken Burns, and make the dwell time a
single constant at the top of the file so it's a one-character change to try 15s.

---

## 5. Proposed architecture

Static site. No build. Deployable to GitHub Pages as-is.

```
index.html          — markup, all of it
style.css           — layers, fades, grain, responsive
app.js              — slideshow timer + player controller + playlist logic
playlist.json       — [{ title, film, year, videoId }]
images/
  01.webp … 04.webp
```

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
- **Player size:** YouTube's IFrame API docs specify a 200×200px minimum. Budget
  for that in the layout; it is roughly a cassette-deck-sized dock, which suits
  the design.
- **iOS volume:** `setVolume()` is a no-op on iOS — volume is hardware-only
  there. Mute/unmute *does* work. So the control should be a mute toggle, with a
  volume slider shown only where it functions, rather than a slider that
  silently does nothing on half the traffic.
- Because the playlist is video IDs, verifying links is a recurring maintenance
  chore. Keep `playlist.json` slightly over-stocked so attrition doesn't thin it
  to nothing.

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
   │                   ├─ images cross-fade every 10s, forever
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

- **A1.** The 4 image files. Steps 1–2 of §9 can proceed with placeholders, but
  the visual tuning (fade duration, Ken Burns direction, scrim strength) can't
  be finished without the real ones.
- **A2.** The song list — see Q5 below.

## 7b. Open questions — non-blocking

- **Q4.** How many songs in the initial playlist? 10–15 is enough for a launch.
- **Q5.** Do you already have a track list, or should it be drafted for review?
- **Q6.** Domain — GitHub Pages subdomain, or a real domain?
- **Q7.** Text on screen — English, Hindi, Hinglish?
- **Q8.** What are the 4 images *of*? Affects whether Ken Burns helps (it does a
  lot for wide landscapes, less for tight interiors).

---

## 8. Verification still owed

Because saloon.wtf could not be reached from this environment, before or during
implementation someone should open it on an unrestricted machine and record:

1. What the audio source actually is (YouTube iframe? self-hosted? something
   else?) — view source / network tab.
2. Whether there is an entry gate, and what it says.
3. What the visual layer is — static image, slideshow, video, canvas?
4. What controls exist.
5. Whether there is a visible track title.

This is worth 5 minutes and would let §3 and §5 be confirmed rather than
inferred.

---

## 9. Rough plan (once §7 is answered)

1. Scaffold `index.html` / `style.css` / `app.js`, landing gate, no audio.
2. Image layer: 4 slots, preload, 10s cross-fade, Ken Burns, reduced-motion.
3. Player abstraction + chosen backend, auto-advance, error-skip.
4. Controls, track title, grain/vignette pass.
5. Mobile pass — real device, `100dvh`, tap targets, data weight.
6. Deploy to GitHub Pages.

Nothing in this list is blocked on a decision any more. Steps 1–2 can start
immediately using placeholder images; steps 3–4 are fully specified by §5.4.
Step 5 needs the real images (A1) and the track list (A2) to be meaningful.

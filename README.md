# Bus Driver Playlist

### ▶ [ekcuttingchaidesign.github.io/bus-driver-playlist](https://ekcuttingchaidesign.github.io/bus-driver-playlist/)

A one-page site that recreates the sound of a long-distance Indian bus: 90s
Bollywood on a loop, over four illustrations that cross-fade every 7 seconds,
with a traffic bed underneath and a horn every so often.

Spiritual sibling of [saloon.wtf](https://saloon.wtf), which does the same for
neighbourhood barbershops.

See **[spec.md](spec.md)** for requirements, constraints and the decisions
behind the build.

## Run it

Static files, no build step, no dependencies:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

| Path | What it is |
|---|---|
| `index.html` | All the markup |
| `style.css` | Layers, cross-fades, grain, responsive |
| `app.js` | Slideshow, YouTube player, horn, ambience, counter |
| `playlist.json` | Track list — edit this, not the JS |
| `images/` | 4 illustrations, WebP + JPEG, 1920px + 1280px |
| `fonts/` | Noto Sans Devanagari, self-hosted (OFL 1.1) |
| `bus-horn.mp3` | Horn sting, played at random intervals |
| `ambience.mp3` | 40s traffic loop under everything |

## The horn

Sounds at a random gap of **40–95 seconds**, only while music is actually
playing, never while muted, and never in a background tab. A skipped turn waits
out a fresh interval, so two audible horns are never closer than 40s.

Tuning constants live at the top of the `Horn` object in `app.js`:

| Constant | Default | What it does |
|---|---|---|
| `MIN_GAP_MS` | `40000` | Floor between horns |
| `MAX_GAP_MS` | `95000` | Ceiling between horns |
| `VOLUME` | `0.42` | Level under the music |
| `MAX_LEN_S` | `null` | Seconds to trim the clip to; `null` plays it whole |

It uses Web Audio rather than an `<audio>` element because iOS ignores
`HTMLAudioElement.volume` — an `<audio>` horn would blast at full device volume
on every iPhone. A `GainNode` behaves everywhere.

## Traffic ambience

A 40s loop at **50% volume**, running independently of the music — it starts as
soon as the page is woken and keeps going whether or not a song is playing. Only
mute or a hidden tab silence it.

It can't sound before any interaction — no browser allows audio until the page
has been touched. So the loop starts at page load in a suspended context and
resumes on the **first sign of life**: mouse movement, a tap, a keypress or a
scroll, anywhere on the page.

On desktop **moving the mouse is enough** — no click needed (tested in
Chromium; not guaranteed in Safari or Firefox, which fall back to a click).
Touch devices have no mouse movement, so phones wake on their first tap.

Compressed from the 12.4 MB source to **313 KB** (40s, mono, 32 kHz, 64 kbps) —
it loops, so nine minutes of audio bought nothing. The loop point is crossfaded
so it does not click on wrap; verified gapless after MP3 decode.

Tuning lives on the `Ambience` object in `app.js` — `VOLUME` (0.50) and
`FADE_S` (2.0).

Replacing it: keep it seamlessly loopable and unremarkable — no sirens, no
sudden events, nothing with a recognisable rhythm. See spec.md §14.3 for the
compression recipe.

UI text is Hindi throughout. Every string lives in the `T` object at the top of
`app.js` — change wording there, not in the markup.

## Listen-elsewhere links

Pills appear top-right (centred above the title on phones) when you fill these
in. Leave either blank and it simply doesn't render:

```json
"links": {
  "spotify": "https://open.spotify.com/playlist/...",
  "ytMusic": "https://music.youtube.com/playlist?list=..."
}
```

## Player controls

Previous / play / next, a mute toggle, and a seek bar. The bar is draggable,
focusable, and arrow keys nudge ±5s while it has focus. Space toggles play;
left/right arrows change track when the bar isn't focused.

The record ring spins while music plays. It sits *behind* the disc rather than
rotating it, because the disc is the live YouTube player — spinning the video
would be disorienting and would obscure a player we're required to keep visible.

## Adding songs

Edit `playlist.json`. The loader accepts three shapes, so an exported song list
can be dropped in without reformatting.

**Song list (current).** Full watch URLs, with metadata used for the display
title (`Song — Film (Year)`):

```json
{ "songs": [
  { "title": "…", "film": "…", "year": 1991,
    "youtube_url": "https://www.youtube.com/watch?v=…" }
] }
```

`watch?v=`, `youtu.be/`, `/embed/` and `/shorts/` URLs all work. Rows without a
usable ID are dropped rather than breaking the list.

The two older shapes still work:

**Playlist mode (current).** Point at a YouTube playlist and YouTube handles
ordering, auto-advance and skipping unplayable entries:

```json
{ "playlistId": "PLVeY0XJJSxJMh2rXK2Taby1v23kj3P5_N" }
```

The playlist must be **public or unlisted** — a private one won't load in an
embed, and the page will simply sit silent. Curate by editing the playlist on
YouTube; no code change and no redeploy needed.

**Track mode.** Drop `playlistId` and list videos yourself. `title` is optional
— leave it out and the player shows YouTube's own title.

```json
{ "tracks": [ { "videoId": "0pWsCiBvLOk" } ] }
```

Songs play through the YouTube IFrame API, so licensing stays between YouTube
and the rights holders. Some uploads have embedding disabled by their owner —
those fail with error 101/150 and are skipped automatically, so keep the list
slightly over-stocked.

## Known state

- **The passenger counter is simulated.** The number is generated in the
  browser and does not reflect real visitors. It sits behind
  `Passengers.get()`, an async interface matching what a real backend would
  expose — see `app.js`. Switching to a live count means replacing that one
  function body with a `fetch()`; see spec.md §10.3.
- Images are centre-cropped on portrait phones, so wide compositions lose their
  edges. 9:16 variants are planned; drop them in at `.slide img` in `style.css`.
- **The circular album art is the YouTube player itself**, clipped to a circle —
  not artwork with the player hidden behind it. The iframe is built at 356×200
  so YouTube renders normally, then scaled to 0.4 for the 80px disc. That puts
  the presented player below YouTube's documented 200×200 minimum: a knowing
  deviation, low practical risk, and reversible in one line
  (`--disc: 200px; --disc-scale: 1`). See spec.md §12.2b.

## Deploying

Already set up. Push to `main` and
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes to
[the live site](https://ekcuttingchaidesign.github.io/bus-driver-playlist/)
in about a minute. Nothing to configure — there is no backend and no build step.

It deploys from `main` specifically because the `github-pages` environment only
accepts deployments from the default branch; a run on a feature branch is
rejected before any step executes.

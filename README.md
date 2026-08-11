# Bus Driver Playlist

A one-page site that recreates the sound of a long-distance Indian bus: 90s
Bollywood on a loop, over four illustrations that cross-fade every 10 seconds.

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
| `app.js` | Slideshow, YouTube player, passenger counter |
| `playlist.json` | Track list — edit this, not the JS |
| `images/` | 4 illustrations, WebP + JPEG, 1920px + 1280px |
| `fonts/` | Noto Sans Devanagari, self-hosted (OFL 1.1) |
| `bus-horn.mp3` | Horn sting, played at random intervals |

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

## Traffic ambience — file needed

A looping traffic bed at 30% under the music, fading in and out with playback.
The code is in place; **drop an `ambience.mp3` in the repo root and it starts
working.** Until then it 404s and stays silent, harming nothing.

Pick something seamlessly loopable and unremarkable — no sirens, no sudden
events, nothing with a recognisable rhythm. 30–60s is plenty; it loops. Source
it royalty-free (freesound.org has CC0 traffic recordings); it can't be pulled
from a YouTube link.

Tuning lives on the `Ambience` object in `app.js` — `VOLUME` (0.30) and
`FADE_S` (2.0).

UI text is Hindi throughout. Every string lives in the `T` object at the top of
`app.js` — change wording there, not in the markup.

## Adding songs

Edit `playlist.json`. Two modes:

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
- The playlist currently holds one placeholder track pending curation.

## Deploying

Push to `main` and enable GitHub Pages on the repository root. Nothing else to
configure — there is no backend.

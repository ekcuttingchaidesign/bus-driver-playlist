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

UI text is Hindi throughout. Every string lives in the `T` object at the top of
`app.js` — change wording there, not in the markup.

## Adding songs

Edit `playlist.json`. `title` is optional — leave it out and the player shows
YouTube's own title for the video.

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
  not artwork with the player hidden behind it. YouTube's terms require the
  player stay visible at 200×200 or larger, which is what fixes the disc at
  200px and makes the pill as chunky as it is. Shrinking the circle means
  breaking those terms. See spec.md §12.2.
- The playlist currently holds one placeholder track pending curation.

## Deploying

Push to `main` and enable GitHub Pages on the repository root. Nothing else to
configure — there is no backend.

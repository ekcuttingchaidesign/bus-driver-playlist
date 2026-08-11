/* Bus Driver Playlist
   Slideshow + YouTube player + passenger counter. No build step, no deps. */

(() => {
  'use strict';

  const DWELL_MS = 10000;   // keep in sync with --dwell in style.css
  const FADE_MS  = 1200;    // keep in sync with --fade  in style.css

  // The iframe is built 16:9 at YouTube's documented 200px minimum so their
  // player renders normally, then CSS scales it down into the small circular
  // disc. Building it small instead would risk YouTube's own too-small-player
  // handling. Must match --disc-native in style.css.
  const DISC_NATIVE = 200;

  const MARQUEE_GAP_PX = 40;   // must match --marquee-gap in style.css
  const MARQUEE_SPEED  = 42;   // px per second — comfortable reading pace

  const T = {
    loading:   'लोड हो रहा है…',
    unknown:   'अज्ञात गाना',
    noPlayer:  'प्लेयर लोड नहीं हो सका। कनेक्शन जाँचकर दोबारा कोशिश कीजिए।',
    empty:     'गानों की सूची खाली है।',
    exhausted: 'कोई और गाना नहीं बचा।',
    alone:     'इस बस में सिर्फ़ आप',
    riders:    (n) => `<b>${n}</b> यात्री सवार हैं`,
    pause:     'रोकें',
    play:      'चलाएँ',
    mute:      'आवाज़ बंद करें',
    unmute:    'आवाज़ चालू करें',
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    hud:      $('hud'),
    title:    $('trackTitle'),
    playBtn:  $('playBtn'),
    nextBtn:  $('nextBtn'),
    muteBtn:  $('muteBtn'),
    passengers: $('passengers'),
  };

  /* ------------------------------------------------------------------ *
   * Slideshow                                                          *
   * Independent of audio, so it keeps moving through ads and buffering.*
   * ------------------------------------------------------------------ */

  const Slideshow = {
    slides: Array.from(document.querySelectorAll('.slide')),
    i: 0,
    timer: null,

    start() {
      if (!this.slides.length) return;
      // Slide 0 is active from first paint; restart its drift so the journey
      // begins from the top rather than mid-animation.
      this.slides[0].classList.add('is-active');
      this._restartDrift(this.slides[0]);
      this.resume();
      document.addEventListener('visibilitychange', () => {
        document.hidden ? this.pause() : this.resume();
      });
    },

    advance() {
      const cur = this.slides[this.i];
      this.i = (this.i + 1) % this.slides.length;
      const next = this.slides[this.i];

      next.classList.add('is-active');
      cur.classList.remove('is-active');
      this._restartDrift(next);
    },

    _restartDrift(slide) {
      const img = slide.querySelector('img');
      if (!img) return;
      img.style.animation = 'none';
      void img.offsetWidth;      // force reflow so the animation re-runs
      img.style.animation = '';
    },

    resume() {
      if (this.timer) return;
      this.timer = setInterval(() => this.advance(), DWELL_MS);
    },

    pause() {
      clearInterval(this.timer);
      this.timer = null;
    },
  };

  /* ------------------------------------------------------------------ *
   * Title                                                              *
   *                                                                    *
   * Fits on one line where it can, centred. Where it can't, a second   *
   * copy is appended and the pair scrolls, so the loop is seamless     *
   * rather than snapping back. The window is mask-faded in CSS, so     *
   * overflow reads as continuing rather than being chopped off.        *
   * ------------------------------------------------------------------ */

  const Title = {
    _text: '',

    set(text) {
      this._text = text || '';
      const view = el.title;

      view.classList.remove('is-scrolling');
      view.textContent = '';

      const track = document.createElement('span');
      track.className = 'title__track';
      const first = document.createElement('span');
      first.textContent = this._text;
      track.appendChild(first);
      view.appendChild(track);

      // Measure after layout, or the width is whatever it was last frame.
      requestAnimationFrame(() => {
        const textW = Math.ceil(first.getBoundingClientRect().width);
        if (!textW || textW <= view.clientWidth) return;

        const clone = first.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');  // don't read it twice
        track.appendChild(clone);

        const distance = textW + MARQUEE_GAP_PX;
        track.style.setProperty('--marquee-distance', `${distance}px`);
        track.style.setProperty('--marquee-duration', `${distance / MARQUEE_SPEED}s`);
        view.classList.add('is-scrolling');
      });
    },

    // Width changes on rotate/resize flip whether scrolling is needed.
    refresh() { if (this._text) this.set(this._text); },
  };

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => Title.refresh(), 180);
  });

  /* ------------------------------------------------------------------ *
   * Passenger counter                                                  *
   *                                                                    *
   * SIMULATED — this number is invented in the browser and does not    *
   * reflect real visitors. It exists behind the same async interface a *
   * real backend would expose, so switching to a live count later      *
   * means replacing the body of get() with a fetch() and nothing else. *
   *                                                                    *
   * To go live: stand up the Cloudflare Worker described in spec.md    *
   * §10.3 option A and change get() to:                                *
   *   const r = await fetch(ENDPOINT, {method:'POST', body: sessionId});*
   *   return (await r.json()).count;                                   *
   * ------------------------------------------------------------------ */

  const Passengers = {
    _n: null,
    POLL_MS: 6000,

    // Evening in India is busier than 4am. Gives the number a believable shape.
    _baseline() {
      const istHour = (new Date().getUTCHours() + 5.5) % 24;
      const curve = [
        6, 5, 4, 4, 4, 5, 9, 14, 22, 28, 30, 31,
        32, 33, 34, 36, 40, 46, 52, 55, 50, 38, 24, 12,
      ];
      return curve[Math.floor(istHour)];
    },

    async get() {
      const base = this._baseline();
      if (this._n === null) {
        this._n = base + Math.floor(Math.random() * 7) - 3;
      } else {
        // Random walk, gently pulled toward the hour's baseline.
        const pull = Math.sign(base - this._n) * (Math.random() < 0.35 ? 1 : 0);
        const jitter = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -1 : 1);
        this._n += pull + jitter;
      }
      this._n = Math.max(2, this._n);
      return this._n;
    },

    render(n) {
      el.passengers.hidden = false;
      el.passengers.innerHTML = n === 1 ? T.alone : T.riders(n);
    },

    async start() {
      const tick = async () => {
        if (document.hidden) return;
        try {
          this.render(await this.get());
        } catch {
          el.passengers.hidden = true;   // never show 0, never show stale
        }
      };
      await tick();
      setInterval(tick, this.POLL_MS);
    },
  };

  /* ------------------------------------------------------------------ *
   * Horn                                                               *
   *                                                                    *
   * Sounds at a random interval, never less than MIN_GAP_MS apart.     *
   *                                                                    *
   * Web Audio rather than an <audio> element, for one reason: iOS      *
   * ignores HTMLAudioElement.volume, so an <audio> horn would blast at *
   * full device volume on every iPhone. A GainNode works everywhere.   *
   * ------------------------------------------------------------------ */

  const Horn = {
    SRC:        'bus-horn.mp3',
    MIN_GAP_MS: 40000,      // the floor asked for; real gaps land above it
    MAX_GAP_MS: 95000,
    VOLUME:     0.42,       // under the music, not over it
    MAX_LEN_S:  null,       // set a number of seconds to trim the clip

    ctx: null,
    buffer: null,
    timer: null,
    armed: false,

    // Must be called from inside a click handler: an AudioContext created
    // outside a user gesture starts suspended and stays silent.
    arm() {
      if (this.armed) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;                       // no Web Audio: no horn, no error
      this.armed = true;
      try {
        this.ctx = new AC();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch {
        this.armed = false;
        return;
      }
      this._load().then(() => this._schedule());
    },

    async _load() {
      try {
        const res = await fetch(this.SRC);
        this.buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        this.buffer = null;                  // missing or undecodable: stay quiet
      }
    },

    blast() {
      if (!this.buffer) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = this.VOLUME;
      src.connect(gain).connect(this.ctx.destination);
      this.MAX_LEN_S ? src.start(0, 0, this.MAX_LEN_S) : src.start();
    },

    _schedule() {
      clearTimeout(this.timer);
      const wait = this.MIN_GAP_MS + Math.random() * (this.MAX_GAP_MS - this.MIN_GAP_MS);
      this.timer = setTimeout(() => {
        // Only over music that is actually playing, never while muted, never
        // in a background tab. A skipped turn still waits out a fresh
        // interval, so two audible horns are never closer than MIN_GAP_MS.
        if (!document.hidden && !Player.muted && Player.isPlaying()) this.blast();
        this._schedule();
      }, wait);
    },
  };

  /* ------------------------------------------------------------------ *
   * Playlist                                                           *
   * ------------------------------------------------------------------ */

  const Playlist = {
    queue: [],
    pos: 0,
    playlistId: null,

    async load() {
      try {
        const res = await fetch('playlist.json', { cache: 'no-cache' });
        const data = await res.json();
        this.playlistId = data.playlistId || null;
        this.queue = this._shuffle((data.tracks || []).filter((t) => t && t.videoId));
      } catch {
        this.playlistId = null;
        this.queue = [];
      }
      return this.playlistId ? 1 : this.queue.length;
    },

    // In playlist mode YouTube handles ordering, advancing and skipping
    // unplayable videos, so most of the logic below goes unused.
    isPlaylist() { return !!this.playlistId; },

    _shuffle(a) {
      const out = a.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },

    current() { return this.queue[this.pos]; },

    next() {
      this.pos += 1;
      if (this.pos >= this.queue.length) {   // exhausted: reshuffle and loop
        const last = this.queue[this.queue.length - 1];
        this.queue = this._shuffle(this.queue);
        if (this.queue.length > 1 && this.queue[0] === last) {
          this.queue.push(this.queue.shift());
        }
        this.pos = 0;
      }
      return this.current();
    },

    // A video that can't be embedded is gone for this session.
    drop() {
      this.queue.splice(this.pos, 1);
      if (this.pos >= this.queue.length) this.pos = 0;
      return this.queue.length;
    },
  };

  /* ------------------------------------------------------------------ *
   * Player                                                             *
   *                                                                    *
   * One YT.Player instance for the whole session; tracks change via    *
   * loadVideoById. Rebuilding the iframe would lose the user-gesture   *
   * context and several mobile browsers would then refuse to play.     *
   * ------------------------------------------------------------------ */

  const Player = {
    yt: null,
    apiReady: false,
    _readyWaiters: [],
    muted: false,
    _started: false,   // has playback been kicked off by a user gesture yet

    loadApi() {
      window.onYouTubeIframeAPIReady = () => {
        this.apiReady = true;
        this._readyWaiters.forEach((fn) => fn());
        this._readyWaiters = [];
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => this._fail('Could not reach YouTube.');
      document.head.appendChild(s);
    },

    whenReady() {
      return new Promise((resolve, reject) => {
        if (this.apiReady) return resolve();
        this._readyWaiters.push(resolve);
        setTimeout(() => reject(new Error('YouTube API timed out')), 12000);
      });
    },

    create() {
      const asPlaylist = Playlist.isPlaylist();

      const playerVars = {
        playsinline: 1,        // without this iOS hijacks the screen
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      };

      if (asPlaylist) {
        playerVars.listType = 'playlist';
        playerVars.list = Playlist.playlistId;
        playerVars.loop = 1;   // with a list, loop restarts the playlist
      }

      const opts = {
        width: String(Math.round(DISC_NATIVE * 16 / 9)),
        height: String(DISC_NATIVE),
        host: 'https://www.youtube-nocookie.com',
        playerVars,
        events: {
          // Deliberately not playing here: there has been no user gesture yet,
          // so the video sits cued until the play button is pressed.
          onReady: () => {
            if (asPlaylist) { try { this.yt.setLoop(true); } catch { /* older API */ } }
            this._showTitle();
          },
          onStateChange: (e) => this._onState(e),
          onError: (e) => this._onError(e),
        },
      };

      if (!asPlaylist) opts.videoId = Playlist.current().videoId;

      this.yt = new YT.Player('ytplayer', opts);
    },

    _onState(e) {
      // In playlist mode YouTube advances by itself; calling next() here too
      // would jump two songs at a time.
      if (e.data === YT.PlayerState.ENDED && !Playlist.isPlaylist()) {
        this.play(Playlist.next());
      }
      if (e.data === YT.PlayerState.PLAYING) {
        el.playBtn.classList.remove('is-paused');
        el.playBtn.setAttribute('aria-label', T.pause);
        this._showTitle();
      }
      if (e.data === YT.PlayerState.PAUSED) {
        el.playBtn.classList.add('is-paused');
        el.playBtn.setAttribute('aria-label', T.play);
      }
    },

    // 101/150 = embedding disabled by the owner, common on label uploads.
    // 100 = gone or private. 2 = bad id. 5 = player error. All are terminal
    // for that track, so drop it and move on rather than stalling in silence.
    _onError() {
      if (Playlist.isPlaylist()) {
        try { this.yt.nextVideo(); } catch { /* nothing further to try */ }
        return;
      }
      const left = Playlist.drop();
      if (!left) return this._fail(T.exhausted);
      this.play(Playlist.current());
    },

    _showTitle() {
      let name = '';
      try { name = this.yt.getVideoData().title || ''; } catch { /* not ready */ }
      const meta = Playlist.isPlaylist() ? null : Playlist.current();
      Title.set((meta && meta.title) || name || T.unknown);
    },

    _fail(msg) {
      Title.set(msg);
    },

    play(track) {
      if (!track || !this.yt) return;
      this.yt.loadVideoById(track.videoId);
      this._showTitle();
    },

    isPlaying() {
      try { return !!this.yt && this.yt.getPlayerState() === YT.PlayerState.PLAYING; }
      catch { return false; }
    },

    toggle() {
      if (!this.yt) return;
      if (this.yt.getPlayerState() === YT.PlayerState.PLAYING) {
        this.yt.pauseVideo();
        return;
      }

      // First press in playlist mode starts somewhere random, so repeat
      // visits don't always open on the same song. setShuffle is unreliable,
      // and this is the user gesture, so playVideoAt is safe here.
      if (Playlist.isPlaylist() && !this._started) {
        this._started = true;
        const list = (typeof this.yt.getPlaylist === 'function' && this.yt.getPlaylist()) || [];
        if (list.length > 1) {
          this.yt.playVideoAt(Math.floor(Math.random() * list.length));
          return;
        }
      }

      this._started = true;
      this.yt.playVideo();
    },

    next() {
      if (!this.yt) return;
      this._started = true;
      if (Playlist.isPlaylist()) { this.yt.nextVideo(); return; }
      this.play(Playlist.next());
    },

    // setVolume is a no-op on iOS (hardware-only), but mute/unmute works,
    // so mute is the control we expose.
    toggleMute() {
      if (!this.yt) return;
      this.muted = !this.muted;
      this.muted ? this.yt.mute() : this.yt.unMute();
      el.muteBtn.classList.toggle('is-muted', this.muted);
      el.muteBtn.setAttribute('aria-label', this.muted ? T.unmute : T.mute);
    },
  };

  /* ------------------------------------------------------------------ *
   * Boot                                                               *
   * ------------------------------------------------------------------ */

  // The slideshow and counter don't depend on audio, so they start straight
  // away rather than waiting on YouTube.
  Player.loadApi();
  Slideshow.start();
  Passengers.start();

  (async () => {
    await Playlist.load();

    try {
      await Player.whenReady();
    } catch {
      Title.set(T.noPlayer);
      return;
    }

    if (!Playlist.isPlaylist() && !Playlist.current()) {
      Title.set(T.empty);
      return;
    }

    // Built cued, not playing. The play button press supplies the user gesture
    // browsers require before audio may start; from then on loadVideoById
    // carries that permission forward for the rest of the session.
    Player.create();
  })();

  // Horn.arm() must run inside the click itself — see the note on its arm().
  el.playBtn.addEventListener('click', () => { Horn.arm(); Player.toggle(); });
  el.nextBtn.addEventListener('click', () => Player.next());
  el.muteBtn.addEventListener('click', () => Player.toggleMute());

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); Horn.arm(); Player.toggle(); }
    if (e.code === 'ArrowRight') Player.next();
    if (e.key.toLowerCase() === 'm') Player.toggleMute();
  });
})();

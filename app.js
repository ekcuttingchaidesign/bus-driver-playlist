/* Bus Driver Playlist
   Slideshow + YouTube player + passenger counter. No build step, no deps. */

(() => {
  'use strict';

  const DWELL_MS = 10000;   // keep in sync with --dwell in style.css
  const FADE_MS  = 1200;    // keep in sync with --fade  in style.css

  // The player is clipped to a 200px circle, so it is built 16:9 at that
  // height: the video fills the disc rather than letterboxing inside it.
  // 200 is also the IFrame API's minimum player dimension — do not go below.
  const DISC_PX  = 200;

  const T = {
    engine:    'इंजन चालू हो रहा है…',
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
    gate:     $('gate'),
    gateNote: $('gateNote'),
    boardBtn: $('boardBtn'),
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
      // Slide 0 is already active behind the gate; restart its drift so the
      // journey begins from the top rather than mid-animation.
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
   * Playlist                                                           *
   * ------------------------------------------------------------------ */

  const Playlist = {
    queue: [],
    pos: 0,

    async load() {
      try {
        const res = await fetch('playlist.json', { cache: 'no-cache' });
        const data = await res.json();
        this.queue = this._shuffle((data.tracks || []).filter((t) => t && t.videoId));
      } catch {
        this.queue = [];
      }
      return this.queue.length;
    },

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

    create(videoId) {
      this.yt = new YT.Player('ytplayer', {
        width: String(Math.round(DISC_PX * 16 / 9)),
        height: String(DISC_PX),
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          playsinline: 1,      // without this iOS hijacks the screen
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => { e.target.playVideo(); this._showTitle(); },
          onStateChange: (e) => this._onState(e),
          onError: (e) => this._onError(e),
        },
      });
    },

    _onState(e) {
      if (e.data === YT.PlayerState.ENDED) {
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
      const left = Playlist.drop();
      if (!left) return this._fail(T.exhausted);
      this.play(Playlist.current());
    },

    _showTitle() {
      let name = '';
      try { name = this.yt.getVideoData().title || ''; } catch { /* not ready */ }
      const meta = Playlist.current();
      el.title.textContent = (meta && meta.title) || name || T.unknown;
    },

    _fail(msg) {
      el.title.textContent = msg;
    },

    play(track) {
      if (!track || !this.yt) return;
      this.yt.loadVideoById(track.videoId);
      this._showTitle();
    },

    toggle() {
      if (!this.yt) return;
      const s = this.yt.getPlayerState();
      s === YT.PlayerState.PLAYING ? this.yt.pauseVideo() : this.yt.playVideo();
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

  Player.loadApi();
  Playlist.load();

  el.boardBtn.addEventListener('click', async () => {
    el.boardBtn.disabled = true;
    el.gateNote.textContent = T.engine;

    if (!Playlist.queue.length) await Playlist.load();

    try {
      await Player.whenReady();
    } catch {
      el.boardBtn.disabled = false;
      el.gateNote.textContent = T.noPlayer;
      return;
    }

    const first = Playlist.current();
    if (!first) {
      el.boardBtn.disabled = false;
      el.gateNote.textContent = T.empty;
      return;
    }

    // Constructed inside the click handler so the gesture carries to playback.
    Player.create(first.videoId);

    el.gate.classList.add('is-gone');
    el.hud.hidden = false;
    Slideshow.start();
    Passengers.start();
  });

  el.playBtn.addEventListener('click', () => Player.toggle());
  el.nextBtn.addEventListener('click', () => Player.play(Playlist.next()));
  el.muteBtn.addEventListener('click', () => Player.toggleMute());

  document.addEventListener('keydown', (e) => {
    if (el.hud.hidden || e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); Player.toggle(); }
    if (e.code === 'ArrowRight') Player.play(Playlist.next());
    if (e.key.toLowerCase() === 'm') Player.toggleMute();
  });
})();

/* Bus Driver Playlist
   Slideshow + YouTube player + passenger counter. No build step, no deps. */

(() => {
  'use strict';

  const DWELL_MS = 7000;    // keep in sync with --dwell in style.css
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
    spotify:   'Spotify',
    ytMusic:   'YT Music',
    mute:      'आवाज़ बंद करें',
    unmute:    'आवाज़ चालू करें',
  };

  const $ = (id) => document.getElementById(id);

  const el = {
    hud:      $('hud'),
    title:    $('trackTitle'),
    player:   document.querySelector('.player'),
    links:    $('links'),
    seek:     $('seek'),
    seekFill: $('seekFill'),
    seekKnob: $('seekKnob'),
    tCur:     $('tCur'),
    tDur:     $('tDur'),
    prevBtn:  $('prevBtn'),
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
   * Listen-elsewhere links                                             *
   * Rendered from playlist.json so URLs stay data, not markup. Absent  *
   * or blank URLs render nothing at all.                               *
   * ------------------------------------------------------------------ */

  const ICON = {
    // Brand marks, used only to link to those services.
    spotify: 'M12 0a12 12 0 100 24 12 12 0 000-24zm5.5 17.3a.75.75 0 01-1.03.25c-2.83-1.73-6.38-2.12-10.58-1.16a.75.75 0 11-.33-1.46c4.59-1.05 8.52-.6 11.69 1.34a.75.75 0 01.25 1.03zm1.47-3.27a.94.94 0 01-1.29.31c-3.24-1.99-8.17-2.57-12-1.4a.94.94 0 01-.54-1.8c4.38-1.33 9.82-.68 13.52 1.6a.94.94 0 01.31 1.29zm.13-3.4C15.22 8.34 8.9 8.13 5.2 9.25a1.12 1.12 0 11-.65-2.15c4.25-1.29 11.23-1.04 15.66 1.59a1.12 1.12 0 11-1.14 1.94z',
    ytMusic: 'M12 0a12 12 0 100 24 12 12 0 000-24zm0 19.1a7.1 7.1 0 110-14.2 7.1 7.1 0 010 14.2zm0-13.33a6.23 6.23 0 100 12.46 6.23 6.23 0 000-12.46zM9.68 15.54V8.46L15.82 12l-6.14 3.54z',
  };

  const Links = {
    render(links) {
      const items = [
        { url: links && links.spotify, label: T.spotify, icon: ICON.spotify },
        { url: links && links.ytMusic, label: T.ytMusic, icon: ICON.ytMusic },
      ].filter((i) => typeof i.url === 'string' && i.url.trim());

      if (!items.length) return;          // nothing configured: stay hidden

      el.links.innerHTML = items.map((i) => `
        <a href="${i.url}" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${i.icon}"/></svg>
          <span>${i.label}</span>
        </a>`).join('');
      el.links.hidden = false;
    },
  };

  /* ------------------------------------------------------------------ *
   * Seek bar                                                           *
   * ------------------------------------------------------------------ */

  const mmss = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s - m * 60)).padStart(2, '0')}`;
  };

  const Progress = {
    POLL_MS: 250,
    dragging: false,

    start() {
      setInterval(() => this.tick(), this.POLL_MS);

      const frac = (e) => {
        const r = el.seek.getBoundingClientRect();
        return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      };

      el.seek.addEventListener('pointerdown', (e) => {
        if (!this._duration()) return;
        this.dragging = true;
        el.seek.classList.add('is-dragging');
        el.seek.setPointerCapture(e.pointerId);
        this.paint(frac(e));
      });

      el.seek.addEventListener('pointermove', (e) => {
        if (this.dragging) this.paint(frac(e));
      });

      const commit = (e) => {
        if (!this.dragging) return;
        this.dragging = false;
        el.seek.classList.remove('is-dragging');
        const d = this._duration();
        if (d) Player.seek(frac(e) * d);
      };
      el.seek.addEventListener('pointerup', commit);
      el.seek.addEventListener('pointercancel', () => {
        this.dragging = false;
        el.seek.classList.remove('is-dragging');
      });

      // Arrow keys nudge by 5s while the bar has focus. The global handler
      // skips arrows in that case so they don't also change track.
      el.seek.addEventListener('keydown', (e) => {
        const d = this._duration();
        if (!d) return;
        let delta = 0;
        if (e.key === 'ArrowRight') delta = 5;
        if (e.key === 'ArrowLeft') delta = -5;
        if (!delta) return;
        e.preventDefault();
        Player.seek(Math.min(d, Math.max(0, Player.currentTime() + delta)));
      });
    },

    _duration() {
      const d = Player.duration();
      return isFinite(d) && d > 0 ? d : 0;
    },

    tick() {
      if (this.dragging) return;
      const d = this._duration();
      const c = Player.currentTime();
      this.paint(d ? c / d : 0, c, d);
    },

    paint(f, cur, dur) {
      const pct = `${(f * 100).toFixed(2)}%`;
      el.seekFill.style.width = pct;
      el.seekKnob.style.left = pct;
      el.seek.setAttribute('aria-valuenow', Math.round(f * 100));
      if (cur !== undefined) el.tCur.textContent = mmss(cur);
      if (dur !== undefined) el.tDur.textContent = mmss(dur);
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
   * Sound effects                                                      *
   *                                                                    *
   * Web Audio rather than <audio> elements, for one reason: iOS        *
   * ignores HTMLAudioElement.volume, so an <audio> horn would blast at *
   * full device volume on every iPhone and ambience could never sit at *
   * 30%. A GainNode is respected everywhere.                           *
   * ------------------------------------------------------------------ */

  // One shared context. Browsers cap how many can exist, and the effects
  // below have no reason to own separate ones.
  const AudioBus = {
    ctx: null,

    // Must run inside a click: a context created outside a user gesture
    // starts suspended and never makes a sound.
    init() {
      if (this.ctx) return this.ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;                  // no Web Audio: effects stay silent
      try {
        this.ctx = new AC();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch {
        this.ctx = null;
      }
      return this.ctx;
    },

    // A context built before any interaction starts suspended; browsers only
    // let it run once the user has touched the page.
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },

    async load(url) {
      if (!this.ctx) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;            // not added yet: no error, no sound
        return await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    },
  };

  // Sounds at a random interval, never less than MIN_GAP_MS apart.
  const Horn = {
    SRC:        'bus-horn.mp3',
    MIN_GAP_MS: 40000,      // the floor asked for; real gaps land above it
    MAX_GAP_MS: 95000,
    VOLUME:     0.42,       // under the music, not over it
    MAX_LEN_S:  null,       // set a number of seconds to trim the clip

    buffer: null,
    timer: null,
    armed: false,

    async arm() {
      if (this.armed || !AudioBus.ctx) return;
      this.armed = true;
      this.buffer = await AudioBus.load(this.SRC);
      if (this.buffer) this._schedule();
    },

    blast() {
      if (!this.buffer) return;
      const ctx = AudioBus.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.buffer;
      const gain = ctx.createGain();
      gain.gain.value = this.VOLUME;
      src.connect(gain).connect(ctx.destination);
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

  // Traffic/engine bed. Runs independently of the music: it starts as soon as
  // the page is woken and keeps going whether or not a song is playing. Only
  // mute or a hidden tab silence it.
  //
  // Deliberately a local file rather than a second YouTube player. YouTube's
  // setVolume is a no-op on iOS, so a YouTube ambience track could not be held
  // below the music there — it would play as loud as the songs. See spec.md §14.
  const Ambience = {
    SRC:    'ambience.mp3',
    VOLUME: 0.50,
    FADE_S: 2.0,

    gain: null,
    armed: false,

    async arm() {
      if (this.armed || !AudioBus.ctx) return;
      this.armed = true;

      const buffer = await AudioBus.load(this.SRC);
      if (!buffer) return;                   // file not added yet: stays silent

      const ctx = AudioBus.ctx;
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;              // faded in by sync()
      this.gain.connect(ctx.destination);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;                       // gapless, runs for the session
      src.connect(this.gain);
      src.start();

      this.sync();
    },

    sync() {
      if (!this.gain) return;
      const ctx = AudioBus.ctx;
      // Deliberately not conditioned on the music: the bed runs on its own.
      const target = (!document.hidden && !Player.muted) ? this.VOLUME : 0;
      this.gain.gain.cancelScheduledValues(ctx.currentTime);
      this.gain.gain.setTargetAtTime(target, ctx.currentTime, this.FADE_S / 3);
    },
  };

  // The ambience should be running the moment someone arrives, but no browser
  // will make sound before the page has been interacted with. So: build the
  // context and start the loop straight away — it sits suspended and silent —
  // then resume it on the first interaction of any kind, not just the play
  // button. In practice that is the visitor's first tap, click or keypress,
  // well before they reach for play. Calling this repeatedly is harmless.
  const armEffects = () => {
    if (!AudioBus.init()) return;
    AudioBus.resume();
    Horn.arm();
    Ambience.arm();
    if (AudioBus.ctx.state === 'running') {
      WAKE_EVENTS.forEach((t) => window.removeEventListener(t, armEffects));
    }
  };

  // Widest net the platform allows. mousemove is the valuable one on desktop:
  // tested in Chromium, moving the mouse alone is enough to let resume()
  // through, so the traffic starts before anyone clicks anything. Touch
  // devices have no mousemove, so phones still wake on their first tap.
  // Events that a browser declines to treat as activation cost nothing —
  // all handlers detach as soon as the context is running.
  const WAKE_EVENTS = [
    'mousemove', 'pointermove', 'pointerdown', 'touchstart',
    'keydown', 'wheel', 'scroll',
  ];

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
        Links.render(data.links);
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

    prev() {
      this.pos = this.pos > 0 ? this.pos - 1 : this.queue.length - 1;
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
      s.onerror = () => this._fail(T.noPlayer);
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

      // Drives the spinning ring.
      el.player.classList.toggle('is-playing', e.data === YT.PlayerState.PLAYING);

      Ambience.sync();   // the bed follows whatever the music is doing
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

    prev() {
      if (!this.yt) return;
      this._started = true;
      if (Playlist.isPlaylist()) { this.yt.previousVideo(); return; }
      this.play(Playlist.prev());
    },

    currentTime() {
      try { return this.yt ? (this.yt.getCurrentTime() || 0) : 0; } catch { return 0; }
    },

    duration() {
      try { return this.yt ? (this.yt.getDuration() || 0) : 0; } catch { return 0; }
    },

    seek(seconds) {
      try { if (this.yt) this.yt.seekTo(seconds, true); } catch { /* not ready */ }
    },

    // setVolume is a no-op on iOS (hardware-only), but mute/unmute works,
    // so mute is the control we expose.
    toggleMute() {
      if (!this.yt) return;
      this.muted = !this.muted;
      this.muted ? this.yt.mute() : this.yt.unMute();
      el.muteBtn.classList.toggle('is-muted', this.muted);
      el.muteBtn.setAttribute('aria-label', this.muted ? T.unmute : T.mute);
      Ambience.sync();   // mute silences the whole cabin, not just the songs
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

  // Read-only debug hook. Run __busAudio() in the console to see whether the
  // browser has let the audio start, and at what level.
  window.__busAudio = () => ({
    ctx:      AudioBus.ctx ? AudioBus.ctx.state : 'not created',
    clock:    AudioBus.ctx ? +AudioBus.ctx.currentTime.toFixed(2) : null,
    ambience: Ambience.gain ? +Ambience.gain.gain.value.toFixed(3) : 'not started',
    muted:    Player.muted,
    playing:  Player.isPlaying(),
  });

  // Queue the ambience now; it becomes audible at the first interaction.
  armEffects();
  WAKE_EVENTS.forEach((t) =>
    window.addEventListener(t, armEffects, { passive: true }));

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
  el.playBtn.addEventListener('click', () => { armEffects(); Player.toggle(); });
  el.nextBtn.addEventListener('click', () => Player.next());
  el.prevBtn.addEventListener('click', () => Player.prev());
  document.addEventListener('visibilitychange', () => Ambience.sync());
  Progress.start();
  el.muteBtn.addEventListener('click', () => Player.toggleMute());

  document.addEventListener('keydown', (e) => {
    // Arrows belong to the seek bar while it has focus.
    if (e.target.matches('input, textarea') || e.target === el.seek) return;
    if (e.code === 'Space') { e.preventDefault(); armEffects(); Player.toggle(); }
    if (e.code === 'ArrowLeft') Player.prev();
    if (e.code === 'ArrowRight') Player.next();
    if (e.key.toLowerCase() === 'm') Player.toggleMute();
  });
})();

/*
 * Töne für den Spielautomaten (slots.js) – alle im Browser erzeugt (Web Audio), keine Sounddateien.
 * Sie spielen nur, wenn am Automaten selbst gezogen wird – nicht beim Knopf „Neues Spiel würfeln“ (das entscheidet
 * slots.js). Ein/Aus merkt sich das Gerät (localStorage „randomizer-sound“, Knopf am Automaten).
 *
 *   ratchet()        Hebel ratscht beim Ziehen          pull()       ganzer Zug (Klick/Tastatur)
 *   clunk()          Hebel rastet ein                   coinIn()     Münze fällt in den Schlitz
 *   spinStart()      Walzen rollen (Schleifen)          spinStop()   sofort still
 *   spinDown([s…])   Walzen laufen nacheinander aus     reelStop(i)  Walze i schlägt an
 *   win()            Gewinn-Fanfare                     coins()      Münzen klimpern in die Schale
 *   lose()           kein Gewinn
 *
 * Das Rollen ist das klassische mechanische Rattern: jede der drei Walzen klackert in ihrem eigenen Takt (Rastnasen,
 * die an der Sperrklinke vorbeilaufen), darunter surrt der Antrieb. Beim Anlaufen drehen sie hoch, beim Anhalten wird
 * jede Walze für sich langsamer und verstummt – das Rattern dünnt sich aus, bis die letzte steht.
 * Die Schleifen sind fertig gerechnete Puffer, die im Audio-Thread laufen – sie stottern also nicht, während der
 * Randomizer die Seite beschäftigt.
 */
window.SlotSound = (function () {
  'use strict';

  var KEY = 'randomizer-sound';
  var on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* ohne Speicher: an */ }
  var ctx = null, master = null, noiseBuf = null, reelBufs = null, spin = null, played = 0;

  // Audio erst bei der ersten Berührung des Automaten anlegen (vorher erlaubt es der Browser nicht)
  function ac() {
    if (!on) return null;
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) { return null; }
    return ctx;
  }
  function noise(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  // Lautstärke-Verlauf: schnell an, dann ausklingen
  function env(c, t, dur, vol, attack) {
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(master);
    return g;
  }
  // Ton: Wellenform, Tonhöhe (optional gleitend auf „to“)
  function tone(c, type, freq, t, dur, vol, to, attack) {
    var o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.connect(env(c, t, dur, vol, attack));
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  // Rauschen durch einen Filter: Klicks, Schläge
  function hit(c, filter, freq, t, dur, vol) {
    var s = c.createBufferSource(), f = c.createBiquadFilter();
    s.buffer = noise(c);
    f.type = filter;
    f.frequency.value = freq;
    s.connect(f);
    f.connect(env(c, t, dur, vol, 0.002));
    s.start(t, Math.random() * 0.5, dur + 0.02);
  }
  // Glocke/Münze: Grundton mit zwei schrägen Obertönen
  function bell(c, freq, t, dur, vol) {
    tone(c, 'sine', freq, t, dur, vol);
    tone(c, 'sine', freq * 2.76, t, dur * 0.6, vol * 0.35);
    tone(c, 'sine', freq * 5.4, t, dur * 0.3, vol * 0.18);
  }
  function play(fn) {
    var c = ac();
    if (!c) return;
    played++;
    try { fn(c, c.currentTime + 0.01); } catch (e) { /* Ton ist nie wichtig genug für einen Fehler */ }
  }

  /* ── Rollende Walzen: je Walze eine Schleife aus Klacks, dazu das Surren des Antriebs ── */
  var N = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.51 };
  var LOOP_SECS = 2;
  // Klacks je Schleife (= Rastnasen je 2 s), Klang des Gehäuses (Hz) – jede Walze etwas anders, so rattert es durcheinander
  var REELS = [{ ticks: 38, body: 560, knock: 210 }, { ticks: 44, body: 690, knock: 250 }, { ticks: 50, body: 830, knock: 290 }];
  function reelBuffers(c) {
    if (reelBufs) return reelBufs;
    var sr = c.sampleRate, len = Math.round(sr * LOOP_SECS);
    reelBufs = REELS.map(function (r) {
      var buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
      for (var n = 0; n < r.ticks; n++) {
        var start = Math.round(n * len / r.ticks), accent = n % 4 === 0;        // jedes vierte Bild: die Rastnase schlägt härter
        var amp = (accent ? 1 : 0.55) * (0.8 + Math.random() * 0.2), body = r.body * (0.96 + Math.random() * 0.08);
        var dur = Math.round(0.05 * sr), lp = 0, i, t, x;
        for (i = 0; i < dur; i++) {            // über das Ende hinaus zurück an den Anfang → nahtlose Schleife
          t = i / sr;
          lp += 0.45 * ((Math.random() * 2 - 1) - lp);                           // Rauschen, etwas gedämpft: das „Tk“
          x = lp * Math.exp(-t * 700) * 0.9 +
            Math.sin(6.2832 * body * t) * Math.exp(-t * 150) * 0.5 +             // hohles Gehäuse
            (accent ? Math.sin(6.2832 * r.knock * t) * Math.exp(-t * 90) * 0.6 : 0);
          d[(start + i) % len] += x * amp * 0.32;
        }
      }
      return buf;
    });
    // Antrieb: tiefes Surren mit leichtem Flattern (ganze Schwingungen je Schleife → nahtlos), dazu ein Rauschen, dessen
    // Ende in den Anfang überblendet wird
    var motor = c.createBuffer(1, len, sr), m = motor.getChannelData(0), fade = Math.round(0.05 * sr);
    var hiss = new Float32Array(len + fade), low = 0, k, tt;
    for (k = 0; k < hiss.length; k++) { low += 0.02 * ((Math.random() * 2 - 1) - low); hiss[k] = low; }
    for (k = 0; k < fade; k++) hiss[k] = hiss[k] * (k / fade) + hiss[len + k] * (1 - k / fade);
    for (k = 0; k < len; k++) {
      tt = k / sr;
      m[k] = (Math.sin(6.2832 * 58 * tt) * 0.5 + Math.sin(6.2832 * 116 * tt) * 0.22 + Math.sin(6.2832 * 174 * tt) * 0.1) * (0.75 + 0.25 * Math.sin(6.2832 * 11 * tt)) * 0.22 + hiss[k] * 0.9;
    }
    reelBufs.push(motor);
    return reelBufs;
  }

  var api = {
    isOn: function () { return on; },
    // Ein/Aus (merkt sich das Gerät); beim Einschalten klimpert eine Münze zur Bestätigung
    setOn: function (v) {
      on = !!v;
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* gilt dann nur bis zum Schließen */ }
      if (!on) api.spinStop();
      else api.coinIn();
    },
    // Für Tests: läuft die Schleife, wie viele Töne wurden gespielt
    info: function () { return { on: on, ready: !!ctx, spinning: !!spin && !!ctx && ctx.currentTime < spin.until, played: played }; },

    ratchet: function () {
      play(function (c, t) {
        hit(c, 'highpass', 2600, t, 0.03, 0.22);
        tone(c, 'square', 170, t, 0.03, 0.05);
      });
    },
    pull: function () {
      play(function (c, t) {
        for (var i = 0; i < 6; i++) { hit(c, 'highpass', 2600, t + i * 0.038, 0.03, 0.2); tone(c, 'square', 150 + i * 14, t + i * 0.038, 0.03, 0.045); }
      });
    },
    clunk: function () {
      play(function (c, t) {
        tone(c, 'sine', 130, t, 0.18, 0.55, 46);
        hit(c, 'lowpass', 900, t, 0.09, 0.4);
        tone(c, 'sine', 240, t + 0.07, 0.16, 0.12, 520, 0.02);   // Feder schnellt zurück
      });
    },
    coinIn: function () {
      play(function (c, t) {
        bell(c, 2900, t, 0.22, 0.2);
        bell(c, 3700, t + 0.07, 0.3, 0.16);
        tone(c, 'sine', 180, t + 0.2, 0.1, 0.25, 90);
      });
    },
    spinStart: function () {
      var c = ac();
      if (!c) return;
      api.spinStop();
      played++;
      try {
        var t = c.currentTime + 0.01, bufs = reelBuffers(c);
        // Vier Schleifen: drei Walzen und der Antrieb. Anlaufen: erst langsam, dann auf volle Drehzahl
        var parts = bufs.map(function (buf, i) {
          var s = c.createBufferSource(), g = c.createGain(), motor = i === 3;
          s.buffer = buf;
          s.loop = true;
          s.playbackRate.setValueAtTime(0.35, t);
          s.playbackRate.exponentialRampToValueAtTime(1, t + 0.55);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(motor ? 0.5 : 0.7, t + 0.12);
          s.connect(g);
          g.connect(master);
          s.start(t, motor ? 0 : Math.random() * LOOP_SECS);   // Walzen nicht im Gleichschritt
          return { src: s, gain: g, vol: motor ? 0.5 : 0.7 };
        });
        spin = { parts: parts, until: Infinity };
      } catch (e) { spin = null; }
    },
    // Sofort still (Ton aus, Abbruch)
    spinStop: function () {
      if (!spin || !ctx) { spin = null; return; }
      var s = spin, t = ctx.currentTime;
      spin = null;
      s.parts.forEach(function (p) {
        try {
          p.gain.gain.cancelScheduledValues(t);
          p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), t);
          p.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
          p.src.stop(t + 0.14);
        } catch (e) { /* schon aus */ }
      });
    },
    // Auslaufen: Walze i wird kurz vor delays[i] (Sekunden ab jetzt) langsamer und steht dann; der Antrieb mit der letzten
    spinDown: function (delays) {
      if (!spin || !ctx) { spin = null; return; }
      var t = ctx.currentTime, last = Math.max.apply(null, delays);
      spin.until = t + last;
      spin.parts.forEach(function (p, i) {
        var at = t + (i < delays.length ? delays[i] : last), slow = Math.max(t, at - 0.22);
        try {
          p.src.playbackRate.cancelScheduledValues(t);
          p.src.playbackRate.setValueAtTime(1, t);                 // falls das Anlaufen noch nicht fertig war
          p.src.playbackRate.setValueAtTime(1, slow);
          p.src.playbackRate.exponentialRampToValueAtTime(0.4, at);
          p.gain.gain.cancelScheduledValues(t);
          p.gain.gain.setValueAtTime(p.vol, t);
          p.gain.gain.setValueAtTime(p.vol, Math.max(t, at - 0.03));
          p.gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.02);
          p.src.stop(at + 0.04);
        } catch (e) { /* schon aus */ }
      });
    },
    reelStop: function (i) {
      play(function (c, t) {
        tone(c, 'sine', 170, t, 0.16, 0.6, 55);
        hit(c, 'lowpass', 1600, t, 0.07, 0.5);
        hit(c, 'highpass', 2200, t, 0.02, 0.18);
        bell(c, [N.C5, N.E5, N.G5][i] || N.C6, t + 0.02, 0.4, 0.09);
      });
    },
    win: function () {
      play(function (c, t) {
        ['C5', 'E5', 'G5', 'C6', 'E6'].forEach(function (n, i) {
          tone(c, 'triangle', N[n], t + i * 0.075, 0.2, 0.26);
          tone(c, 'square', N[n], t + i * 0.075, 0.12, 0.05);
        });
        var end = t + 0.42;
        [N.C6, N.E6, N.G5 * 2].forEach(function (f) { tone(c, 'triangle', f, end, 0.9, 0.2, null, 0.01); bell(c, f, end, 0.9, 0.08); });
        [0.16, 0.32].forEach(function (d) { [N.C6, N.E6, N.G5 * 2].forEach(function (f) { tone(c, 'triangle', f, end + d, 0.14, 0.1); }); });   // Tusch
      });
    },
    coins: function () {
      play(function (c, t) {
        for (var i = 0, at = 0; i < 16; i++) {
          at += 0.035 + Math.random() * 0.06;
          bell(c, 2300 + Math.random() * 2100, t + at, 0.16 + Math.random() * 0.12, 0.1 + Math.random() * 0.08);
        }
      });
    },
    lose: function () {
      play(function (c, t) {
        [[392, 0], [349.2, 0.24], [293.7, 0.48]].forEach(function (n, i) {
          tone(c, 'sawtooth', n[0], t + n[1], i === 2 ? 0.6 : 0.22, 0.1, i === 2 ? n[0] * 0.7 : n[0] * 0.97, 0.02);
          tone(c, 'sine', n[0] / 2, t + n[1], i === 2 ? 0.6 : 0.22, 0.2, i === 2 ? n[0] * 0.35 : null, 0.02);
        });
      });
    }
  };
  return api;
})();

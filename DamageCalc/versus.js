/*
 * „Kräftemessen“ hinter dem Schadens-Rechner: wie eine Kampfansage – links der Angreifer, rechts der Verteidiger,
 * jede Hälfte in der Typfarbe ihres Pokémon mit Leuchtband und Speedlines. Sonne, Regen und Schilde sieht man.
 * „Angriff!“ ist ein Probetreffer mit genau den berechneten Schadenswerten (Volltreffer mit der Chance der
 * Generation); die KP bleiben zwischen den Treffern stehen – so sieht man, nach wie vielen Treffern es K.O. geht.
 * Farben und Aussehen: versus.css. Animationen der Attacken: attacks.js. Helfer: scene.js (HubScene).
 *
 *   VersusScene.update(data)  – nach jeder Berechnung (app.js, updateScene):
 *     { atk, def: { id, sprite, name, level, color, color2 (zweiter Typ oder null) } | null, move: { id, type, name, typeLabel, color, textColor, physical } | null,
 *       hit: { rolls, crits, later, laterCrits, hp, hpCur, eff, critChance } | null,
 *       weather: 'sun'|'rain'|null, screens, burn, atkPar, defPar }
 */
window.VersusScene = (function () {
  'use strict';

  var root = document.getElementById('vs');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var TR = {
    de: {
      hit: 'Angriff!', again: 'Nochmal', uses: '{a} setzt {m} ein!', crit: 'Ein Volltreffer!',
      eff0: 'Es hat keine Wirkung auf {d} …', effLow: 'Das ist nicht sehr effektiv …', effHigh: 'Das ist sehr effektiv!',
      ko: '{d} wurde besiegt!', koAfter: 'K.O. nach {n} {w}', hits: 'Treffer: {n} · {dmg} Schaden', hp: 'KP',
      hitWord: ['Treffer', 'Treffern']
    },
    en: {
      hit: 'Attack!', again: 'Again', uses: '{a} used {m}!', crit: 'A critical hit!',
      eff0: 'It doesn’t affect {d} …', effLow: 'It’s not very effective …', effHigh: 'It’s super effective!',
      ko: '{d} fainted!', koAfter: 'KO after {n} {w}', hits: 'Hits: {n} · {dmg} damage', hp: 'HP',
      hitWord: ['hit', 'hits']
    }
  };
  var tr = function () { return TR[window.LANG] || TR.de; };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  var q = function (s) { return root.querySelector(s); };

  var el = {
    atkBox: q('.vs-mon--atk'), atk: q('.vs-mon--atk img'),
    defBox: q('.vs-mon--def'), def: q('.vs-mon--def img'),
    name: q('.vs-name'), lv: q('.vs-lv'), hpLabel: q('.vs-hp i'), hpFill: q('.vs-hp-fill'), hpNum: q('.vs-hp-num'),
    moveType: q('.vs-move-type'), moveName: q('.vs-move-name'), btn: q('.vs-hit'), tally: q('.vs-tally'), msg: q('.vs-msg')
  };

  var data = null, scale = 0, busy = false, key = '', lastDuel = null, backTimer = null;
  var sim = { hp: 0, max: 0, hits: 0, dealt: 0, ko: false };
  var urls = { atk: '', def: '' };

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduced ? 0 : ms); }); };
  var play = function (node, frames, opts) {
    if (reduced) return Promise.resolve();
    return node.animate(frames, opts).finished.catch(function () {});
  };
  var center = function (n) { var r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  function say(text) { el.msg.textContent = text; el.msg.classList.toggle('is-empty', !text); }

  // Lichtschein über das Band (versus.css, .is-rush): bei einem neuen Duell und beim „Angriff!“ – sonst steht alles still
  var rushTimer = null;
  // Angaben für die Attacken-Animation (attacks.js)
  function fxArgs(d) {
    return { id: d.move.id, type: d.move.type, physical: d.move.physical, s: scale, atk: el.atkBox, def: el.defBox, scene: root };
  }
  // Pixelbilder der gewählten Attacke vorab malen lassen (in Leerlaufzeit), damit „Angriff!“ ohne Hänger beginnt –
  // nach einem neuen Duell, einem geladenen Sprite oder einer neuen Größe
  var prepTimer = null;
  function prepFx() {
    clearTimeout(prepTimer);
    prepTimer = setTimeout(function () {
      if (window.VersusFx && data && data.move && data.atk && data.def && scale) VersusFx.prepare(fxArgs(data));
    }, 400);
  }

  function rush() {
    if (reduced) return;
    root.classList.remove('is-rush');
    void root.offsetWidth;
    root.classList.add('is-rush');
    clearTimeout(rushTimer);
    rushTimer = setTimeout(function () { root.classList.remove('is-rush'); }, 1600);
  }

  // Sprite setzen; Box so groß wie das Pokémon selbst, damit es auf dem Band steht und der KP-Kasten am Kopf sitzt
  function setMon(role, mon) {
    var url = mon ? HubScene.monSprite(mon.id, mon.sprite) : '';
    if (url === urls[role]) return;
    urls[role] = url;
    var box = el[role + 'Box'], img = el[role];
    root.classList.remove('has-' + role);
    if (!mon) return;
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      if (urls[role] !== url) return;
      var b = HubScene.bounds(img) || { top: 12, bottom: 8 };
      box.style.setProperty('--nw', img.naturalWidth);
      box.style.setProperty('--nh', img.naturalHeight - b.top - b.bottom);
      box.style.setProperty('--feet', b.bottom);
      root.classList.add('has-' + role);
      prepFx();
      play(box, [{ opacity: 0, translate: (role === 'atk' ? -1 : 1) * 30 * scale + 'px 0' }, { opacity: 1, translate: '0 0' }], { duration: 450, easing: 'ease-out' });
    };
    img.onerror = function () {
      if (!img.crossOrigin) return;
      img.removeAttribute('crossorigin');
      img.src = url;
    };
    img.src = url;
  }

  function renderHp(hp) {
    var max = sim.max || 1, pct = Math.max(0, hp) / max * 100;
    el.hpFill.style.width = pct + '%';
    el.hpFill.dataset.zone = pct > 50 ? 'ok' : pct > 20 ? 'mid' : 'low';
    el.hpNum.textContent = Math.max(0, Math.round(hp)) + ' / ' + sim.max;
  }

  function renderControls() {
    var T = tr();
    el.btn.textContent = sim.ko ? T.again : T.hit;
    el.btn.disabled = busy || !data || !data.hit || !scale;
    el.hpLabel.textContent = T.hp;
    if (sim.ko) el.tally.textContent = fill(T.koAfter, { n: sim.hits, w: T.hitWord[sim.hits === 1 ? 0 : 1] });
    else el.tally.textContent = sim.hits ? fill(T.hits, { n: sim.hits, dmg: sim.dealt }) : '';
  }

  // Neue Werte: Probe-KP zurück auf die aktuellen KP – aber nur, wenn sich etwas geändert hat
  function reset() {
    var h = data && data.hit;
    sim = { hp: h ? h.hpCur : 0, max: h ? h.hp : 0, hits: 0, dealt: 0, ko: false };
    clearTimeout(backTimer);
    if (root.classList.contains('is-fainted')) {
      root.classList.remove('is-fainted');
      // Kommt zurück wie aus dem Pokéball: weiß aufleuchtend aus klein heraus
      play(el.defBox, [
        { opacity: 0, scale: '0.2', filter: 'brightness(0) invert(1)' },
        { opacity: 1, scale: '1.08', filter: 'brightness(0) invert(1)', offset: 0.55 },
        { opacity: 1, scale: '1', filter: 'none' }
      ], { duration: 500, easing: 'ease-out' });
    }
    if (h) renderHp(sim.hp);
    root.classList.toggle('has-hp', !!h);
    say('');
  }

  function update(d) {
    data = d;
    setMon('atk', d.atk);
    setMon('def', d.def);
    // erster Typ = Farbe der Hälfte, zweiter = Speedlines und untere Kante des Bands (nur ein Typ: wieder der erste)
    root.style.setProperty('--ta', d.atk ? d.atk.color : '#bbbbaa');
    root.style.setProperty('--td', d.def ? d.def.color : '#bbbbaa');
    root.style.setProperty('--ta2', d.atk ? d.atk.color2 || d.atk.color : '#bbbbaa');
    root.style.setProperty('--td2', d.def ? d.def.color2 || d.def.color : '#bbbbaa');
    if (d.def) { el.name.textContent = d.def.name; el.lv.textContent = 'Lv' + d.def.level; }
    if (d.move) {
      el.moveType.textContent = d.move.typeLabel;
      el.moveType.style.background = d.move.color;
      el.moveType.style.color = d.move.textColor;
      el.moveName.textContent = d.move.name;
      root.style.setProperty('--tm', d.move.color);
    }
    root.classList.toggle('has-move', !!d.move);
    root.dataset.weather = d.weather || 'none';
    root.classList.toggle('has-screens', !!d.screens);
    root.classList.toggle('atk-burn', !!d.burn);
    root.classList.toggle('atk-par', !!d.atkPar);
    root.classList.toggle('def-par', !!d.defPar);
    // anderes Duell (Pokémon oder Attacke): ein Schub
    var duel = [d.atk && d.atk.id, d.def && d.def.id, d.move && d.move.name].join('|');
    if (duel !== lastDuel) { lastDuel = duel; rush(); prepFx(); }
    var h = d.hit;
    var k = h ? [d.atk.id, d.def.id, d.move && d.move.name, h.hp, h.hpCur, h.rolls.join(), h.crits.join(), h.later.join()].join('|') : '';
    if (k !== key && !busy) { key = k; reset(); }
    renderControls();
  }

  // ── Probetreffer ──────────────────────────────────────────────────────────
  var pick = function (list) { return list[Math.floor(Math.random() * list.length)]; };

  async function attack() {
    if (busy || !data || !data.hit || !scale) return;
    if (sim.ko) { reset(); renderControls(); return; }
    rush();
    busy = true;
    renderControls();
    var d = data, h = d.hit, T = tr();
    var first = sim.hits === 0;
    var crit = Math.random() < h.critChance;
    var dmg = pick(crit ? (first ? h.crits : h.laterCrits) : (first ? h.rolls : h.later));
    say(fill(T.uses, { a: d.atk.name, m: d.move.name }));
    await wait(350);

    var to = center(el.def);
    // Die Attacke selbst (attacks.js): eigene Animation für bekannte Attacken, sonst passend zu Typ und Kategorie
    if (window.VersusFx) {
      await VersusFx.play(fxArgs(d));
    }
    impact(to, d.move.color, crit);

    // Treffer: Verteidiger blinkt, Schadenszahl, KP laufen runter
    if (dmg > 0) {
      popNumber(to, dmg, crit);
      play(el.defBox, [{ opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }], { duration: 480, easing: 'steps(1, end)' });
      var start = sim.hp, end = Math.max(0, sim.hp - dmg);
      sim.hp = end;
      sim.hits++;
      sim.dealt += Math.min(dmg, start);
      await drain(start, end);
    } else {
      sim.hits++;
    }
    if (crit && dmg > 0) { say(T.crit); await wait(700); }
    // Fester Schaden hat keine Effektivität (eff = null)
    var effText = h.eff == null || h.eff === 1 ? '' : h.eff === 0 ? fill(T.eff0, { d: d.def.name }) : h.eff < 1 ? T.effLow : T.effHigh;
    if (effText) { say(effText); await wait(800); }
    if (sim.hp <= 0) {
      sim.ko = true;
      // Besiegt: sinkt nach unten weg wie im Spiel
      await play(el.defBox, [{ translate: '0 0', opacity: 1 }, { translate: '0 ' + 40 * scale + 'px', opacity: 0 }], { duration: 520, easing: 'ease-in', fill: 'forwards' });
      root.classList.add('is-fainted');
      el.defBox.getAnimations().forEach(function (a) { a.cancel(); });
      say(fill(T.ko, { d: d.def.name }));
      // Nach einer Weile kommt es von selbst wieder, mit den eingestellten KP („Nochmal“ geht sofort)
      backTimer = setTimeout(function () { if (sim.ko && !busy) { reset(); renderControls(); } }, 3000);
    }
    busy = false;
    // Hat sich während des Treffers etwas geändert, gelten jetzt die neuen Werte
    if (data !== d) update(data);
    renderControls();
  }

  // KP-Balken und Zahl laufen wie im Spiel gleichmäßig herunter (länger bei viel Schaden)
  function drain(from, to) {
    if (reduced) { renderHp(to); return Promise.resolve(); }
    var ms = Math.min(1400, 350 + (from - to) / (sim.max || 1) * 1500), t0 = performance.now();
    el.hpFill.classList.add('is-draining');
    return new Promise(function (resolve) {
      (function step(now) {
        var t = Math.min(1, (now - t0) / ms);
        renderHp(from + (to - from) * t);
        if (t < 1) requestAnimationFrame(step); else { el.hpFill.classList.remove('is-draining'); resolve(); }
      })(t0);
    });
  }

  function impact(p, color, crit) {
    var b = document.createElement('i');
    b.className = 'vs-impact' + (crit ? ' is-crit' : '');
    b.style.left = p.x + 'px';
    b.style.top = p.y + 'px';
    b.style.setProperty('--tm', color);
    b.style.setProperty('--s', scale);
    document.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 600);
  }
  function popNumber(p, dmg, crit) {
    var n = document.createElement('b');
    n.className = 'vs-dmg' + (crit ? ' is-crit' : '');
    n.textContent = '−' + dmg;
    n.style.left = p.x + 'px';
    n.style.top = p.y + 'px';
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 1300);
  }

  // ── Größe nach dem Platz neben der Karte: Pokémon 3- oder 2-fach, sonst nur der Hintergrund ──
  function layout() {
    var b = HubScene.beside(card), strip = b.strip - 24;
    scale = strip >= 400 ? 3 : strip >= 240 ? 2 : 0;
    root.style.setProperty('--s', scale || 2);
    root.style.setProperty('--sw', Math.max(0, strip) + 'px');
    root.style.setProperty('--cl', b.cl + 'px');
    root.style.setProperty('--cr', b.cr + 'px');
    root.classList.toggle('is-tight', !scale);
    if (data) { renderControls(); prepFx(); }
  }

  el.btn.addEventListener('click', attack);
  layout();
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(card);

  return { update: update };
})();

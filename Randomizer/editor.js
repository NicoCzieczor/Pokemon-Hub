/*
 * Randomizer-Einstellungen zum Anklicken – mit denselben Reitern wie im Universal Pokémon Randomizer.
 *
 * Am Anfang ist nichts gewählt (RandoOptions.blank). Man wählt selbst aus oder lädt eine Einstellungsdatei
 * (.rnqs) des Randomizers; die Auswahl lässt sich auch wieder als .rnqs-Datei speichern.
 * Je Spiel (Platin, Omega Rubin / Alpha Saphir) gibt es andere Optionen und eine eigene gemerkte Auswahl:
 * sie liegt als fertige .rnqs-Datei im localStorage („rando-settings“ bzw. „rando-settings-oras“) und wird
 * bei jedem Würfeln benutzt. Ist nichts gewählt, wird der Eintrag gelöscht.
 */
(function () {
  'use strict';

  const R = window.Rnqs, O = window.RandoOptions;
  const KEYS = { pt: 'rando-settings', oras: 'rando-settings-oras' };
  const FILE_NAMES = { pt: 'Randomizer-Einstellungen-Platin.rnqs', oras: 'Randomizer-Einstellungen-ORAS.rnqs' };

  const I18N = {
    de: {
      none: g => g + ': noch nichts gewählt – wähle selbst aus oder lade eine Datei (.rnqs)',
      chosen: (n, g) => g + ': ' + n + (n === 1 ? ' Einstellung' : ' Einstellungen') + ' gewählt',
      note: 'Deine Auswahl wird auf diesem Gerät gespeichert – für jedes Spiel getrennt – und bei jedem Würfeln benutzt. Ausgegraute Punkte passen nicht zur übrigen Auswahl. Die Zahl am Reiter zeigt, wie viel dort gewählt ist.',
      reset: 'Alles abwählen',
      resetConfirm: 'Die ganze Auswahl verwerfen? Danach ist wieder nichts gewählt.',
      load: 'Datei laden (.rnqs)',
      save: 'Als Datei speichern',
      loaded: n => 'Einstellungen aus „' + n + '“ übernommen.',
      loadedPart: (n, k, g) => 'Einstellungen aus „' + n + '“ übernommen. ' + (k === 1 ? '1 Einstellung passt' : k + ' Einstellungen passen') + ' nicht zu ' + g + ' und ' + (k === 1 ? 'wurde' : 'wurden') + ' weggelassen oder angepasst.',
      bad: 'Das ist keine Einstellungsdatei des Randomizers (.rnqs).',
      version: 'Diese Datei stammt aus einer anderen Randomizer-Version. Hier geht nur 4.6.1.',
      random: 'Zufällig',
      starter: i => 'Starter ' + i,
      pokemon: n => '+' + n + ' Pokémon',
      unique: n => n + ' Pokémon'
    },
    en: {
      none: g => g + ': nothing chosen yet – pick your own or load a file (.rnqs)',
      chosen: (n, g) => g + ': ' + n + (n === 1 ? ' setting' : ' settings') + ' chosen',
      note: 'Your choice is saved on this device – separately for each game – and used every time you roll. Greyed out options don\'t fit the rest of your choice. The number on a tab shows how much is chosen there.',
      reset: 'Clear all',
      resetConfirm: 'Discard the whole choice? Afterwards nothing is chosen again.',
      load: 'Load file (.rnqs)',
      save: 'Save as file',
      loaded: n => 'Settings from "' + n + '" applied.',
      loadedPart: (n, k, g) => 'Settings from "' + n + '" applied. ' + (k === 1 ? '1 setting doesn\'t' : k + ' settings don\'t') + ' fit ' + g + ' and ' + (k === 1 ? 'was' : 'were') + ' left out or adjusted.',
      bad: 'This is not a randomizer settings file (.rnqs).',
      version: 'This file comes from a different randomizer version. Only 4.6.1 works here.',
      random: 'Random',
      starter: i => 'Starter ' + i,
      pokemon: n => '+' + n + ' Pokémon',
      unique: n => n + ' Pokémon'
    }
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Gleiche Einstellungen? (ohne ROM-Name und Prüfsummen dahinter)
  const same = (a, b) => { for (let i = 0; i < R.LEN; i++) if (a[i] !== b[i]) return false; return true; };
  const toB64 = bytes => { let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); }); return btoa(bin); };

  // Alle Optionen (auch Unter-Regler) nach Schlüssel
  const BY_KEY = {};
  O.ITEMS.forEach(it => { BY_KEY[it.k] = it; (it.subs || []).forEach(sub => { BY_KEY[sub.k] = sub; }); });

  /*
   * o.lang()      aktuelle Sprache ('de' | 'en')
   * o.ctx()       { game: 'pt' | 'oras', english, code, romName, label } – Spiel der geladenen ROM (sonst das im Hub
   *               gewählte); label = Name zum Anzeigen
   * o.onChange()  die Auswahl hat sich geändert (z. B. ist jetzt etwas gewählt)
   */
  function create(o) {
    const $ = id => document.getElementById(id);
    const st = { data: {}, game: null, tab: O.TABS[0].id, msg: null };
    const L = () => I18N[o.lang()];
    const ctx = () => o.ctx();
    const tr = t => (typeof t === 'function' ? t(ctx()) : t)[o.lang()];

    function stored(c) {
      try {
        const s = JSON.parse(localStorage.getItem(KEYS[c.game]) || 'null');
        if (s && s.b64) return O.adopt(R.parse(Uint8Array.from(atob(s.b64), ch => ch.charCodeAt(0))), c);
      } catch (e) { /* kaputt oder andere Version → nichts gewählt */ }
      return null;
    }
    // Auswahl für das aktuelle Spiel
    function data() {
      const c = ctx();
      if (!st.data[c.game]) st.data[c.game] = stored(c) || O.blank(c);
      return st.data[c.game];
    }
    // Als Datei: mit dem Namen der ROM, wie ihn das Original-Programm hineinschreibt
    const built = () => R.build(R.rename(data(), O.blank(ctx())));
    function save() {
      const c = ctx();
      try {
        if (same(data(), O.blank(c))) localStorage.removeItem(KEYS[c.game]);
        else localStorage.setItem(KEYS[c.game], JSON.stringify({ b64: toB64(built()) }));
      } catch (e) { window.PokeHubStorageWarning?.(true); }   // gilt dann nur bis zum Schließen
      if (o.onChange) o.onChange();
    }

    // Fertige .rnqs-Datei fürs Würfeln
    const file = () => Promise.resolve(built());
    const chosen = () => O.changes(data(), O.blank(ctx()), ctx());
    const isEmpty = () => Object.keys(chosen()).length === 0;

    /* ── Anzeige ─────────────────────────────────────────────────── */
    function optHtml(type, k, val, checked, off, label, hint) {
      return '<label class="rs-opt' + (off ? ' is-off' : '') + '">' +
        '<input type="' + type + '" name="rs-' + esc(k) + '" data-k="' + esc(k) + '" value="' + esc(val) + '"' + (checked ? ' checked' : '') + (off ? ' disabled' : '') + '>' +
        '<span class="rs-text"><b>' + esc(label) + '</b>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span>' +
      '</label>';
    }
    function selectHtml(k, opts, value, off, label) {
      return '<label class="rs-select' + (off ? ' is-off' : '') + '">' + (label ? '<span>' + esc(label) + '</span>' : '') +
        '<select data-k="' + esc(k) + '"' + (off ? ' disabled' : '') + '>' +
        opts.map((op, i) => '<option value="' + i + '"' + (op.v === value ? ' selected' : '') + '>' + esc(op.l) + '</option>').join('') +
        '</select></label>';
    }
    function subHtml(sub, s, on) {
      const v = s[sub.k];
      if (sub.type === 'range') {
        return '<label class="rs-range' + (on ? '' : ' is-off') + '">' +
          '<input type="range" data-k="' + esc(sub.k) + '" min="' + sub.min + '" max="' + sub.max + '" step="' + sub.step + '" value="' + v + '"' + (on ? '' : ' disabled') + '>' +
          '<output>' + esc(sub.fmt(v)) + '</output></label>';
      }
      return selectHtml(sub.k, O.opts(sub, ctx()).map(op => ({ v: op.v, l: tr(op.l) })), v, !on, sub.l ? tr(sub.l) : '');
    }

    function itemHtml(it, s) {
      const on = O.enabled(it, s), l = L(), c = ctx();
      const wrap = html => '<div class="rs-item">' + html + '</div>';

      if (it.type === 'radio') {
        return wrap('<div class="rs-radios" role="radiogroup">' + O.opts(it, c).map((op, i) =>
          optHtml('radio', it.k, i, s[it.k] === op.v, !on || (op.on && !op.on(s)), tr(op.l), op.h && tr(op.h))).join('') + '</div>');
      }
      if (it.type === 'check') {
        const subs = (it.subs || []).map(sub => subHtml(sub, s, on && s[it.k])).join('');
        const warn = it.warn && it.warn(s) ? '<p class="rs-warn">' + esc(tr(it.warnL)) + '</p>' : '';
        return wrap(optHtml('checkbox', it.k, '1', s[it.k], !on, tr(it.l), it.h && tr(it.h)) +
          (subs ? '<div class="rs-subs">' + subs + '</div>' : '') + warn);
      }
      if (it.type === 'count') {
        const v = s[it.k], opts = Array.from({ length: it.max }, (_, i) => ({ v: i + 1, l: (it.max <= 2 ? l.unique : l.pokemon)(i + 1) }));
        return wrap(optHtml('checkbox', it.k, 'count', v > 0, !on, tr(it.l), it.h && tr(it.h)) +
          '<div class="rs-subs">' + selectHtml(it.k, opts, v || 1, !on || !v, '') + '</div>');
      }
      if (it.type === 'starters') {
        if (!on) return '';
        // Pokémon des Spiels: Platin bis #493, Omega Rubin / Alpha Saphir bis #721
        const names = (c.game === 'oras' ? window.ORAS_DATA : window.PT_DATA).text[o.lang()].species;
        const opts = [{ v: 0, l: l.random }].concat(names.slice(1, O.GAMES[c.game].species + 1).map((n, i) => ({ v: i + 1, l: '#' + String(i + 1).padStart(3, '0') + ' ' + n })));
        return wrap('<div class="rs-starters">' + [0, 1, 2].map(i => selectHtml(it.k + '.' + i, opts, s[it.k + '.' + i], false, l.starter(i + 1))).join('') + '</div>');
      }
      return '';
    }

    function render() {
      const l = L(), c = ctx(), d = data();
      if (st.game !== c.game) { st.game = c.game; st.msg = null; }   // anderes Spiel: Meldung zur alten Datei weg
      const ch = chosen(), count = Object.keys(ch).length;
      $('rs-status').textContent = count ? l.chosen(count, c.label) : l.none(c.label);
      $('rs').classList.toggle('is-custom', count > 0);
      $('rs-reset').textContent = l.reset;
      $('rs-load').textContent = l.load;
      $('rs-save').textContent = l.save;
      $('rs-note').textContent = l.note;
      $('rs-reset').disabled = same(d, O.blank(c));
      $('rs-save').disabled = !count;
      $('rs-msg').hidden = !st.msg;
      if (st.msg) {
        $('rs-msg').textContent = st.msg.text;
        $('rs-msg').classList.toggle('is-error', !!st.msg.error);
      }

      const perTab = {};
      Object.keys(ch).forEach(k => { perTab[ch[k]] = (perTab[ch[k]] || 0) + 1; });
      $('rs-tabs').innerHTML = O.TABS.map(t => {
        const active = t.id === st.tab;
        return '<button type="button" role="tab" class="rs-tab' + (active ? ' is-active' : '') + '" data-tab="' + t.id + '" aria-selected="' + active + '">' +
          esc(tr(t.t)) + (perTab[t.id] ? '<span class="rs-count">' + perTab[t.id] + '</span>' : '') + '</button>';
      }).join('');

      const tab = O.TABS.find(t => t.id === st.tab), s = O.values(d);
      $('rs-panel').innerHTML = tab.groups.map(g => {
        const items = g.items.filter(it => O.visible(it, c)).map(it => itemHtml(it, s)).join('');
        return items ? '<section class="rs-group"><h3>' + esc(tr(g.t)) + '</h3>' + (g.h ? '<p class="rs-hint">' + esc(tr(g.h)) + '</p>' : '') + items + '</section>' : '';
      }).join('');
    }

    /* ── Bedienung ───────────────────────────────────────────────── */
    // Wert eines Steuerelements → Feld in den Einstellungen
    function apply(el) {
      const k = el.dataset.k, d = data(), c = ctx();
      if (/^customStarters\.\d$/.test(k)) {
        const it = BY_KEY.customStarters;
        R.set(d, it.fs[+k.split('.')[1]], +el.value);
        return;
      }
      const it = BY_KEY[k];
      if (el.type === 'radio') R.set(d, it.f, O.opts(it, c)[+el.value].v);
      else if (el.type === 'checkbox') R.set(d, it.f, it.type === 'count' ? (el.checked ? 1 : 0) : el.checked);
      else if (el.type === 'range') R.set(d, it.f, +el.value);
      else if (el.tagName === 'SELECT') R.set(d, it.f, it.type === 'count' ? +el.value + 1 : O.opts(it, c)[+el.value].v);
    }
    function changed(el) {
      const k = el.dataset.k, val = el.value;
      apply(el);
      O.normalize(data(), ctx());
      st.msg = null;
      save();
      render();
      // Fokus zurück auf dasselbe Element (die Liste wurde neu gezeichnet)
      const again = [...$('rs-panel').querySelectorAll('[data-k]')].find(x => x.dataset.k === k && (x.type !== 'radio' || x.value === val));
      if (again && !again.disabled) again.focus({ preventScroll: true });
    }

    // Wie viele Einstellungen einer geladenen Datei gibt es in diesem Spiel nicht (oder nur anders)?
    function lost(raw, d) {
      const a = O.values(raw), b = O.values(d), out = new Set();
      O.FIELDS.forEach(x => {
        if (a[x.k] === b[x.k]) return;
        if (x.it.type === 'starters') { if (a.startersMod === 'CUSTOM') out.add(x.it.k); return; }
        if (x.k !== x.it.k && !a[x.it.k]) return;      // Unter-Regler einer nicht gewählten Option
        out.add(x.it.k);
      });
      return out.size;
    }

    $('rs-panel').addEventListener('change', e => { if (e.target.dataset.k) changed(e.target); });
    // Regler: Zahl beim Ziehen sofort anzeigen
    $('rs-panel').addEventListener('input', e => {
      const el = e.target;
      if (el.type !== 'range') return;
      const sub = BY_KEY[el.dataset.k];
      el.nextElementSibling.textContent = sub.fmt(+el.value);
    });
    $('rs-tabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      st.tab = b.dataset.tab;
      render();
      const again = $('rs-tabs').querySelector('[data-tab="' + st.tab + '"]');
      if (again) again.focus({ preventScroll: true });
    });
    $('rs-reset').addEventListener('click', () => {
      if (!window.confirm(L().resetConfirm)) return;
      const c = ctx();
      st.data[c.game] = O.blank(c);
      st.msg = null;
      save();
      render();
    });
    $('rs-save').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([built()], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = FILE_NAMES[ctx().game];
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
    $('rs-load').addEventListener('click', () => $('rs-input').click());
    $('rs-input').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        if (f.size > 65536) throw new Error('format');
        const raw = R.parse(new Uint8Array(await f.arrayBuffer())), c = ctx();
        st.data[c.game] = O.adopt(raw, c);
        const n = lost(raw, st.data[c.game]);
        st.msg = { text: n ? L().loadedPart(f.name, n, c.label) : L().loaded(f.name) };
        save();
      } catch (err) {
        st.msg = { text: err && err.message === 'version' ? L().version : L().bad, error: true };
      }
      render();
    });

    return { render: render, file: file, isEmpty: isEmpty };
  }

  window.RandoEditor = { create: create };
})();

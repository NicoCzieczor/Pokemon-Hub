/*
 * Randomizer-Einstellungen zum Anklicken – mit denselben Reitern wie im Universal Pokémon Randomizer.
 *
 * Ausgangspunkt ist settings.rnqs (die Einstellungen, mit denen bisher gewürfelt wurde). Wer etwas ändert,
 * dessen Einstellungen landen als fertige .rnqs-Datei im localStorage („rando-settings“) und werden bei
 * jedem Würfeln benutzt. Stimmt alles wieder mit dem Standard überein, wird der Eintrag gelöscht –
 * dann gilt automatisch, was der Hub als Standard mitbringt.
 */
(function () {
  'use strict';

  const R = window.Rnqs, O = window.RandoOptions;
  const KEY = 'rando-settings';

  const I18N = {
    de: {
      isDefault: 'Standard – dieselben wie bisher',
      changed: n => 'Angepasst – ' + n + (n === 1 ? ' Änderung' : ' Änderungen'),
      customRaw: 'Angepasst',
      loading: 'Einstellungen werden geladen…',
      loadError: 'Die Einstellungen konnten nicht geladen werden. Bist du online? Lade die Seite neu.',
      note: 'Deine Auswahl wird auf diesem Gerät gespeichert und bei jedem Würfeln benutzt. Ausgegraute Punkte passen nicht zur übrigen Auswahl. Ein Punkt am Rand zeigt, was vom Standard abweicht.',
      reset: 'Standard wiederherstellen',
      resetConfirm: 'Alle Änderungen verwerfen und wieder die Standard-Einstellungen benutzen?',
      load: 'Datei laden (.rnqs)',
      save: 'Als Datei speichern',
      loaded: n => 'Einstellungen aus „' + n + '“ übernommen.',
      bad: 'Das ist keine Einstellungsdatei des Randomizers (.rnqs).',
      version: 'Diese Datei stammt aus einer anderen Randomizer-Version. Hier geht nur 4.6.1.',
      random: 'Zufällig',
      starter: i => 'Starter ' + i,
      pokemon: n => '+' + n + ' Pokémon',
      unique: n => n + ' Pokémon',
      changedMark: 'weicht vom Standard ab'
    },
    en: {
      isDefault: 'Default – same as always',
      changed: n => 'Customized – ' + n + (n === 1 ? ' change' : ' changes'),
      customRaw: 'Customized',
      loading: 'Loading settings…',
      loadError: 'The settings could not be loaded. Are you online? Reload the page.',
      note: 'Your choice is saved on this device and used every time you roll. Greyed out options don\'t fit the rest of your choice. A dot at the edge marks what differs from the default.',
      reset: 'Restore default',
      resetConfirm: 'Discard all changes and go back to the default settings?',
      load: 'Load file (.rnqs)',
      save: 'Save as file',
      loaded: n => 'Settings from "' + n + '" applied.',
      bad: 'This is not a randomizer settings file (.rnqs).',
      version: 'This file comes from a different randomizer version. Only 4.6.1 works here.',
      random: 'Random',
      starter: i => 'Starter ' + i,
      pokemon: n => '+' + n + ' Pokémon',
      unique: n => n + ' Pokémon',
      changedMark: 'differs from the default'
    }
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const toB64 = bytes => { let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); }); return btoa(bin); };

  // Alle Optionen (auch Unter-Regler) nach Schlüssel
  const BY_KEY = {};
  O.ITEMS.forEach(it => { BY_KEY[it.k] = it; (it.subs || []).forEach(sub => { BY_KEY[sub.k] = sub; }); });

  /*
   * o.lang()  aktuelle Sprache ('de' | 'en')
   * o.ctx()   { english } – ob die geladene ROM englisch ist (manche Kniffe gibt es nur dort)
   */
  function create(o) {
    const $ = id => document.getElementById(id);
    const st = { base: null, data: stored(), tab: O.TABS[0].id, failed: false, msg: null };
    const L = () => I18N[o.lang()];
    const tr = t => t[o.lang()];

    function stored() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (s && s.b64) return R.parse(Uint8Array.from(atob(s.b64), c => c.charCodeAt(0)));
      } catch (e) { /* kaputt oder andere Version → Standard */ }
      return null;
    }
    function save() {
      try {
        if (st.base && same(st.data, st.base)) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, JSON.stringify({ b64: toB64(R.build(st.data)) }));
      } catch (e) { window.PokeHubStorageWarning?.(true); }   // gilt dann nur bis zum Schließen
    }

    let loading = null;
    function load() {
      if (!loading) {
        loading = fetch('settings.rnqs')
          .then(r => { if (!r.ok) throw new Error('http'); return r.arrayBuffer(); })
          .then(b => {
            st.base = R.parse(new Uint8Array(b));
            if (!st.data) st.data = st.base.slice();
            st.failed = false;
            render();
          })
          .catch(e => { loading = null; st.failed = true; render(); throw e; });
      }
      return loading;
    }

    // Fertige .rnqs-Datei fürs Würfeln
    function file() {
      return load().then(() => R.build(st.data), e => {
        if (st.data) return R.build(st.data);
        throw e;
      });
    }
    const isCustom = () => !!(st.data && st.base && !same(st.data, st.base));

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
      return selectHtml(sub.k, sub.opts.map(op => ({ v: op.v, l: tr(op.l) })), v, !on, sub.l ? tr(sub.l) : '');
    }

    function itemHtml(it, s, ch) {
      const on = O.enabled(it, s), l = L();
      const changed = it.type === 'starters' ? [0, 1, 2].some(i => (it.k + '.' + i) in ch)
        : (it.k in ch) || (it.subs || []).some(sub => sub.k in ch);
      const wrap = html => '<div class="rs-item' + (changed ? ' is-changed' : '') + '"' + (changed ? ' title="' + esc(l.changedMark) + '"' : '') + '>' + html + '</div>';

      if (it.type === 'radio') {
        return wrap('<div class="rs-radios" role="radiogroup">' + it.opts.map((op, i) =>
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
        const names = window.PT_DATA.text[o.lang()].species;
        const opts = [{ v: 0, l: l.random }].concat(names.slice(1, 494).map((n, i) => ({ v: i + 1, l: '#' + String(i + 1).padStart(3, '0') + ' ' + n })));
        return wrap('<div class="rs-starters">' + [0, 1, 2].map(i => selectHtml(it.k + '.' + i, opts, s[it.k + '.' + i], false, l.starter(i + 1))).join('') + '</div>');
      }
      return '';
    }

    function render() {
      const l = L();
      const custom = isCustom();
      const ch = st.data && st.base ? O.changes(st.data, st.base) : {};
      const count = Object.keys(ch).length;
      $('rs-status').textContent = !st.base ? (st.failed ? l.loadError : l.loading) : !custom ? l.isDefault : count ? l.changed(count) : l.customRaw;
      $('rs').classList.toggle('is-custom', custom);
      $('rs-reset').textContent = l.reset;
      $('rs-load').textContent = l.load;
      $('rs-save').textContent = l.save;
      $('rs-note').textContent = l.note;
      $('rs-reset').disabled = !custom;
      $('rs-save').disabled = !st.data;
      $('rs-msg').hidden = !st.msg;
      if (st.msg) {
        $('rs-msg').textContent = st.msg.text;
        $('rs-msg').classList.toggle('is-error', !!st.msg.error);
      }
      if (!st.base || !st.data) {
        $('rs-tabs').innerHTML = '';
        $('rs-panel').innerHTML = '';
        return;
      }

      const perTab = {};
      Object.keys(ch).forEach(k => { perTab[ch[k]] = (perTab[ch[k]] || 0) + 1; });
      $('rs-tabs').innerHTML = O.TABS.map(t => {
        const active = t.id === st.tab;
        return '<button type="button" role="tab" class="rs-tab' + (active ? ' is-active' : '') + '" data-tab="' + t.id + '" aria-selected="' + active + '">' +
          esc(tr(t.t)) + (perTab[t.id] ? '<span class="rs-count">' + perTab[t.id] + '</span>' : '') + '</button>';
      }).join('');

      const tab = O.TABS.find(t => t.id === st.tab), s = O.values(st.data), ctx = o.ctx();
      $('rs-panel').innerHTML = tab.groups.map(g => {
        const items = g.items.filter(it => O.visible(it, ctx)).map(it => itemHtml(it, s, ch)).join('');
        return items ? '<section class="rs-group"><h3>' + esc(tr(g.t)) + '</h3>' + (g.h ? '<p class="rs-hint">' + esc(tr(g.h)) + '</p>' : '') + items + '</section>' : '';
      }).join('');
    }

    /* ── Bedienung ───────────────────────────────────────────────── */
    // Wert eines Steuerelements → Feld in den Einstellungen
    function apply(el) {
      const k = el.dataset.k;
      if (/^customStarters\.\d$/.test(k)) {
        const it = BY_KEY.customStarters;
        R.set(st.data, it.fs[+k.split('.')[1]], +el.value);
        return;
      }
      const it = BY_KEY[k];
      if (el.type === 'radio') R.set(st.data, it.f, it.opts[+el.value].v);
      else if (el.type === 'checkbox') R.set(st.data, it.f, it.type === 'count' ? (el.checked ? 1 : 0) : el.checked);
      else if (el.type === 'range') R.set(st.data, it.f, +el.value);
      else if (el.tagName === 'SELECT') R.set(st.data, it.f, it.type === 'count' ? +el.value + 1 : it.opts[+el.value].v);
    }
    function changed(el) {
      const k = el.dataset.k, val = el.value;
      apply(el);
      O.normalize(st.data, o.ctx());
      st.msg = null;
      save();
      render();
      // Fokus zurück auf dasselbe Element (die Liste wurde neu gezeichnet)
      const again = [...$('rs-panel').querySelectorAll('[data-k]')].find(x => x.dataset.k === k && (x.type !== 'radio' || x.value === val));
      if (again && !again.disabled) again.focus({ preventScroll: true });
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
      if (!st.base || !window.confirm(L().resetConfirm)) return;
      st.data = st.base.slice();
      st.msg = null;
      save();
      render();
    });
    $('rs-save').addEventListener('click', () => {
      if (!st.data) return;
      const url = URL.createObjectURL(new Blob([R.build(st.data)], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Randomizer-Einstellungen.rnqs';
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
        st.data = R.parse(new Uint8Array(await f.arrayBuffer()));
        st.msg = { text: L().loaded(f.name) };
        save();
      } catch (err) {
        st.msg = { text: err && err.message === 'version' ? L().version : L().bad, error: true };
      }
      render();
    });

    return { load: load, render: render, file: file, isCustom: isCustom };
  }

  window.RandoEditor = { create: create };
})();

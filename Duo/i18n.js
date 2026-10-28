// ── i18n ─────────────────────────────────────────────────────────────────────
window.LANG = localStorage.getItem('hub-lang') || 'de';

const TRANSLATIONS = {
  de: {
    'subtitle':'Team-Builder für zwei Spieler – Typen, Stats und gemeinsame Analyse.',
    'nav-home':'Home', 'nav-run':'Run', 'nav-team':'Team', 'nav-duo':'Duo', 'nav-trio':'Trio',
    'nav-catch':'Fangrate', 'nav-damage':'Schaden', 'nav-types':'Typen',
    'player1':'Spieler 1', 'player2':'Spieler 2', 'box':'Gemeinsame Box',
    'info-title':'Pokémon-Info', 'info-placeholder':'Wähle ein Pokémon aus einem Team oder dem Info-Slot.',
    'info-gen-section':'Info-Generation', 'info-gen-label':'Generation',
    'info-slot-empty':'Info-Pokémon wählen', 'weakness-title':'Team-Typ-Analyse',
    'weakness-empty':'Füge Pokémon zu einem Team hinzu, um die Typ-Analyse zu sehen.',
    'modal-title':'Wähle ein Pokémon', 'gen-label':'Generation:', 'search-placeholder':'Suche...',
    'modal-close':'Schließen', 'modal-no-link':'Ohne Verknüpfung',
    'e4-divider':'Top Vier & Champion', 'weaknesses':'Schwächen', 'immunities':'Immunitäten',
    'variant-badge':'Var.', 'variant-note':'Team kann je nach Starter, Edition oder gewähltem Leiter variieren; gezeigt ist eine Beispielvariante.',
    'abilities':'Fähigkeiten', 'hidden-ability':'Versteckte Fähigkeit',
    'evolution':'Entwicklung', 'forms':'Formen', 'no-evolution':'Entwickelt sich nicht.',
    'no-evo-data':'Entwicklungsdaten nicht verfügbar.',
    'moves-gen': n => `Attacken in Generation ${n}`,
    'no-moves':'Keine Attacken für diese Generation gefunden.',
    'alert-weak': (n, total) => `${n} von ${total} schwach gegen`, 'alert-x4': n => `${n} davon 4×`,
    'alert-help':'Gut dagegen:', 'alert-covers': list => `Widersteht ${list}`,
    'stat-hp':'KP', 'stat-attack':'Angriff', 'stat-defense':'Verteidigung',
    'stat-sp-atk':'Spezial-Angriff', 'stat-sp-def':'Spezial-Verteidigung', 'stat-speed':'Initiative',
    'power':'Stärke', 'accuracy':'Genauigkeit', 'pp':'AP',
    'physical':'Physisch', 'special-class':'Speziell', 'status-class':'Status',
    'unknown':'Unbekannt', 'tm-hm':'TM / HM', 'egg':'Ei',
    'day':'Tags', 'night':'Nachts', 'in-rain':'Im Regen', 'upside-down':'Konsole umdrehen',
    'trade':'Tausch', 'trade-with-item': i => `Tausch + ${i}`, 'trade-with': p => `Tausch mit ${p}`,
    'shed':'Mausern', 'spin':'Drehen', 'damage':'Schaden', 'three-crits':'3× krit. Treffer',
    'special-evo':'Besonders', 'level-up':'Level-up',
    'type-suffix': t => `${t}-Typ`, 'knows-move': m => `Kennt ${m}`,
    'atk-gt-def':'Angriff > Verteidigung', 'def-gt-atk':'Verteidigung > Angriff', 'atk-eq-def':'Angriff = Verteidigung',
    'happiness': n => `Glück ≥${n}`, 'affection': n => `Zuneigung ≥${n}`,
    'saved':'Gespeichert!',
    'loading-pokemon':'Lade Pokémon...', 'no-pokemon-found':'Kein Pokémon gefunden.',
    'pick-pokemon': (pl, slot) => `Spieler ${pl} – Pokémon wählen (Slot ${slot})`,
    'link-pick': (pl, slot) => `Verknüpftes Pokémon für Spieler ${pl} – Slot ${slot}`,
    'link-pick-box': (pl, slot) => `Verknüpftes Box-Pokémon für Spieler ${pl} – Slot ${slot}`,
    'box-pick': (slot, pl) => `Gemeinsame Box – Slot ${slot} (Spieler ${pl})`,
    'link-label': (pl, slot) => `Spieler ${pl} – Slot ${slot}`,
    'pending': 'Ausstehend…',
    'sync-idle':'Nicht verbunden', 'sync-create':'Session erstellen', 'sync-join':'Beitreten',
    'sync-leave':'Session verlassen', 'sync-leave-short':'Verlassen', 'sync-code-ph':'Code eingeben', 'sync-copy-title':'Code kopieren',
    'sync-both':'Beide Spieler verbunden ✓', 'sync-waiting': (me, other) => `Spieler ${me} – warte auf Spieler ${other}…`,
    'sync-creating':'Erstelle Session…', 'sync-create-error':'Fehler beim Erstellen.', 'sync-connecting':'Verbinde…',
    'sync-not-found':'Session nicht gefunden.', 'sync-full':'Session ist bereits voll.', 'sync-connect-error':'Fehler beim Verbinden.', 'sync-offline':'Keine Verbindung – wird nachgeholt, sobald das Netz da ist.', 'save-failed':'Speichern fehlgeschlagen – Gerätespeicher voll?',
    'graveyard':'Friedhof', 'graveyard-empty':'Noch keine gefallenen Pokémon.', 'grave-player': pl => `Spieler ${pl}`, 'grave-blame-short': pl => `S${pl}`,
    'graveyard-hint':'Tippen: Schuld wechseln (S1 / S2 / ?) · Gedrückt halten: aus dem Friedhof löschen',
    'ctx-remove':'Entfernen', 'ctx-kill':'Gestorben',
  },
  en: {
    'subtitle':'Team builder for two players – types, stats and shared analysis.',
    'nav-home':'Home', 'nav-run':'Run', 'nav-team':'Team', 'nav-duo':'Duo', 'nav-trio':'Trio',
    'nav-catch':'Catch', 'nav-damage':'Damage', 'nav-types':'Types',
    'player1':'Player 1', 'player2':'Player 2', 'box':'Shared Box',
    'info-title':'Pokémon Info', 'info-placeholder':'Select a Pokémon from a team or the info slot.',
    'info-gen-section':'Info Generation', 'info-gen-label':'Generation',
    'info-slot-empty':'Select Info Pokémon', 'weakness-title':'Team Type Analysis',
    'weakness-empty':'Add Pokémon to a team to see the type analysis.',
    'modal-title':'Choose a Pokémon', 'gen-label':'Generation:', 'search-placeholder':'Search...',
    'modal-close':'Close', 'modal-no-link':'Without link',
    'e4-divider':'Elite Four & Champion', 'weaknesses':'Weaknesses', 'immunities':'Immunities',
    'variant-badge':'Var.', 'variant-note':'Team may vary by starter, version or chosen leader; this shows one example variant.',
    'abilities':'Abilities', 'hidden-ability':'Hidden Ability',
    'evolution':'Evolution', 'forms':'Forms', 'no-evolution':'Does not evolve.',
    'no-evo-data':'Evolution data not available.',
    'moves-gen': n => `Moves in Generation ${n}`,
    'no-moves':'No moves found for this generation.',
    'alert-weak': (n, total) => `${n} of ${total} weak to`, 'alert-x4': n => `${n} of them 4×`,
    'alert-help':'Good answers:', 'alert-covers': list => `Resists ${list}`,
    'stat-hp':'HP', 'stat-attack':'Attack', 'stat-defense':'Defense',
    'stat-sp-atk':'Sp. Attack', 'stat-sp-def':'Sp. Defense', 'stat-speed':'Speed',
    'power':'Power', 'accuracy':'Accuracy', 'pp':'PP',
    'physical':'Physical', 'special-class':'Special', 'status-class':'Status',
    'unknown':'Unknown', 'tm-hm':'TM / HM', 'egg':'Egg',
    'day':'Day', 'night':'Night', 'in-rain':'In rain', 'upside-down':'Turn console upside down',
    'trade':'Trade', 'trade-with-item': i => `Trade + ${i}`, 'trade-with': p => `Trade with ${p}`,
    'shed':'Shed', 'spin':'Spin', 'damage':'Damage', 'three-crits':'3× critical hits',
    'special-evo':'Special', 'level-up':'Level-up',
    'type-suffix': t => `${t}-type`, 'knows-move': m => `Knows ${m}`,
    'atk-gt-def':'Attack > Defense', 'def-gt-atk':'Defense > Attack', 'atk-eq-def':'Attack = Defense',
    'happiness': n => `Happiness ≥${n}`, 'affection': n => `Affection ≥${n}`,
    'saved':'Saved!',
    'loading-pokemon':'Loading Pokémon...', 'no-pokemon-found':'No Pokémon found.',
    'pick-pokemon': (pl, slot) => `Player ${pl} – Choose Pokémon (Slot ${slot})`,
    'link-pick': (pl, slot) => `Linked Pokémon for Player ${pl} – Slot ${slot}`,
    'link-pick-box': (pl, slot) => `Linked Box Pokémon for Player ${pl} – Slot ${slot}`,
    'box-pick': (slot, pl) => `Shared Box – Slot ${slot} (Player ${pl})`,
    'link-label': (pl, slot) => `Player ${pl} – Slot ${slot}`,
    'pending': 'Pending…',
    'sync-idle':'Not connected', 'sync-create':'Create session', 'sync-join':'Join',
    'sync-leave':'Leave session', 'sync-leave-short':'Leave', 'sync-code-ph':'Enter code', 'sync-copy-title':'Copy code',
    'sync-both':'Both players connected ✓', 'sync-waiting': (me, other) => `Player ${me} – waiting for player ${other}…`,
    'sync-creating':'Creating session…', 'sync-create-error':'Error creating the session.', 'sync-connecting':'Connecting…',
    'sync-not-found':'Session not found.', 'sync-full':'Session is already full.', 'sync-connect-error':'Error connecting.', 'sync-offline':'No connection – will catch up once you are online.', 'save-failed':'Saving failed – device storage full?',
    'graveyard':'Graveyard', 'graveyard-empty':'No fallen Pokémon yet.', 'grave-player': pl => `Player ${pl}`, 'grave-blame-short': pl => `P${pl}`,
    'graveyard-hint':'Tap: switch blame (P1 / P2 / ?) · Hold: remove from the graveyard',
    'ctx-remove':'Remove', 'ctx-kill':'Fainted',
  },
};

window.t = (key, ...args) => {
  const v = TRANSLATIONS[window.LANG]?.[key];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(...args) : v;
};

const TYPE_LABELS = {
  de: { normal:'Normal',fire:'Feuer',water:'Wasser',electric:'Elektro',grass:'Pflanze',ice:'Eis',fighting:'Kampf',poison:'Gift',ground:'Boden',flying:'Flug',psychic:'Psycho',bug:'Käfer',rock:'Gestein',ghost:'Geist',dragon:'Drache',dark:'Unlicht',steel:'Stahl',fairy:'Fee' },
  en: { normal:'Normal',fire:'Fire',water:'Water',electric:'Electric',grass:'Grass',ice:'Ice',fighting:'Fighting',poison:'Poison',ground:'Ground',flying:'Flying',psychic:'Psychic',bug:'Bug',rock:'Rock',ghost:'Ghost',dragon:'Dragon',dark:'Dark',steel:'Steel',fairy:'Fairy' },
};
window.typeLabel = type => TYPE_LABELS[window.LANG]?.[type] || type;

function applyLang() {
  document.documentElement.lang = window.LANG;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const attr = el.dataset.i18nAttr;
    const txt = window.t(key);
    if (attr) el.setAttribute(attr, txt);
    else el.textContent = txt;
  });
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = window.LANG.toUpperCase();
  const sel = document.getElementById('lcp-game-select');
  if (sel) { buildGameSelect(); renderLevelCaps(sel.value); }
  document.dispatchEvent(new CustomEvent('langchange'));
}

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = window.LANG;
  if (window.LANG === 'en') applyLang();
  document.getElementById('lang-toggle').addEventListener('click', () => {
    window.LANG = window.LANG === 'de' ? 'en' : 'de';
    localStorage.setItem('hub-lang', window.LANG);
    applyLang();
  });
});

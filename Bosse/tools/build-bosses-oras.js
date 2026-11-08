/*
 * Baut die Daten für den Boss-Planer in Omega Rubin / Alpha Saphir (Bosse/bosses-oras.json) aus der eigenen ROM.
 * Gleiches Format wie bosses.json (Platin, build-bosses.js), dazu ein paar Gen-6-Felder.
 *
 * Für jeden Trainer mit Namen das vollständige Team so, wie es in der ROM steht (Bosse/oras-rom.js):
 *  - Attacken: eigene aus den Trainerdaten oder – wie im Spiel – die letzten vier Level-Attacken
 *  - DVs: DV-Stufe · 31 / 255 für alle Werte, keine FP (EVs)
 *  - Fähigkeit: Platz aus den Trainerdaten (0 = beliebig → erste, 3 = versteckte)
 *  - Wesen: wie Gen 6 es für Trainer erzeugt, ist nicht dokumentiert → null (der Planer rechnet neutral)
 *  - Mega-Stein der eigenen Art → Mega-Form (Index 8 im Eintrag), wie im Kampf
 * Story-Reihenfolge, Orte und Rivalen-Zuordnung (nach Starter und Geschlecht des Spielers) stehen unten in STORY/POST –
 * die Trainernummern sind die der ROM. „v“ = nur in Omega Rubin („or“) bzw. Alpha Saphir („as“).
 * Kämpfe ohne festen Ort dort (Vorstände, Bosse, Rivale später …) bekommen ihn aus den Zonen-Skripten (battleLocs).
 *
 * Aufruf (Node 18+):  node build-bosses-oras.js <rom.3ds|.cxi> [ausgabe-ordner]
 */
const fs = require('fs');
const path = require('path');
const OrasRom = require('../oras-rom.js');

const ROM = process.argv[2];
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..'));
const HUB = path.join(__dirname, '..', '..');
if (!ROM) { console.error('Aufruf: node build-bosses-oras.js <rom.3ds> [ausgabe-ordner]'); process.exit(1); }

// Rivale: Brix (Spielerin) bzw. Maike (Spieler) mit dem Starter, der gegen deinen gewinnt; Nummer = Trainer mit Geckarbor-Linie,
// +1 Flemmli-Linie, +2 Hydropi-Linie. Schlüssel = dein Starter, „-f“ = du spielst als Mädchen (dann ist Brix der Rivale).
const rival = (brendan, may) => ({
  treecko: may + 1, torchic: may + 2, mudkip: may,
  'treecko-f': brendan + 1, 'torchic-f': brendan + 2, 'mudkip-f': brendan
});
// Ort-Nummern = Fangort-/Kartennamen der ROM (Textdatei 90)
const LOC = { route103: 208, rustboro: 190, dewford: 174, route110: 222, mauville: 188, chimney: 284, lavaridge: 176,
  petalburg: 184, route119: 240, fortree: 192, lilycove: 194, mossdeep: 196, sootopolis: 198, victoryRoad: 298, league: 202, skyPillar: 316 };
const STORY = [
  { key: 'RIVAL_ROUTE_103', ids: rival(1, 4), l: LOC.route103 },
  { key: 'LEADER_ROXANNE', id: 561, l: LOC.rustboro, a: 'Arena' },
  { key: 'LEADER_BRAWLY', id: 563, l: LOC.dewford, a: 'Arena' },
  { key: 'RIVAL_ROUTE_110', ids: rival(289, 295), l: LOC.route110 },
  { key: 'WALLY_MAUVILLE', id: 518, l: LOC.mauville },
  { key: 'LEADER_WATTSON', id: 567, l: LOC.mauville, a: 'Arena' },
  { key: 'ADMIN_TABITHA_1', id: 691, v: 'or' }, { key: 'ADMIN_SHELLY_1', id: 688, v: 'as' },
  { key: 'ADMIN_TABITHA_2', id: 692, v: 'or' }, { key: 'ADMIN_SHELLY_2', id: 689, v: 'as' },
  { key: 'RIVAL_3', ids: rival(674, 677) },
  { key: 'BOSS_MAXIE_1', id: 236, v: 'or', l: LOC.chimney }, { key: 'BOSS_ARCHIE_1', id: 231, v: 'as', l: LOC.chimney },
  { key: 'LEADER_FLANNERY', id: 569, l: LOC.lavaridge, a: 'Arena' },
  { key: 'LEADER_NORMAN', id: 570, l: LOC.petalburg, a: 'Arena' },
  { key: 'ADMIN_COURTNEY_1', id: 694, v: 'or' }, { key: 'ADMIN_MATT_1', id: 683, v: 'as' },
  { key: 'ADMIN_TABITHA_3', id: 693, v: 'or' }, { key: 'ADMIN_SHELLY_3', id: 690, v: 'as' },
  { key: 'RIVAL_ROUTE_119', ids: rival(292, 298), l: LOC.route119 },
  { key: 'LEADER_WINONA', id: 571, l: LOC.fortree, a: 'Arena' },
  { key: 'ADMIN_COURTNEY_2', id: 695, v: 'or' }, { key: 'ADMIN_MATT_2', id: 684, v: 'as' },
  { key: 'RIVAL_LILYCOVE', ids: rival(527, 530), l: LOC.lilycove },
  { key: 'ADMIN_COURTNEY_3', id: 696, v: 'or' }, { key: 'ADMIN_MATT_3', id: 685, v: 'as' },
  { key: 'BOSS_MAXIE_2', id: 235, v: 'or' }, { key: 'BOSS_ARCHIE_2', id: 178, v: 'as' },
  { key: 'LEADER_TATE_LIZA', id: 552, l: LOC.mossdeep, a: 'Arena' },
  { key: 'LEADER_WALLACE', id: 572, l: LOC.sootopolis, a: 'Arena' },
  { key: 'WALLY_VICTORY_ROAD', id: 583, l: LOC.victoryRoad },
  { key: 'ELITE_FOUR_SIDNEY', id: 553, l: LOC.league },
  { key: 'ELITE_FOUR_PHOEBE', id: 554, l: LOC.league },
  { key: 'ELITE_FOUR_GLACIA', id: 555, l: LOC.league },
  { key: 'ELITE_FOUR_DRAKE', id: 556, l: LOC.league },
  { key: 'CHAMPION_STEVEN', id: 557, l: LOC.league }
];
const POST = [
  { key: 'RIVAL_POSTGAME', ids: rival(699, 906) },
  { key: 'ADMIN_COURTNEY_4', id: 697, v: 'or' }, { key: 'ADMIN_MATT_4', id: 686, v: 'as' },
  { key: 'ADMIN_COURTNEY_5', id: 698, v: 'or' }, { key: 'ADMIN_MATT_5', id: 687, v: 'as' },
  { key: 'ZINNIA_1', id: 898 },
  { key: 'ZINNIA_SKY_PILLAR', id: 713, l: LOC.skyPillar },
  { key: 'WALLACE_POSTGAME', id: 943 },
  { key: 'STEVEN_POSTGAME', id: 942 },
  { key: 'WALLY_POSTGAME_1', id: 944 },
  { key: 'ELITE_FOUR_SIDNEY_REMATCH', id: 909, l: LOC.league },
  { key: 'ELITE_FOUR_PHOEBE_REMATCH', id: 910, l: LOC.league },
  { key: 'ELITE_FOUR_GLACIA_REMATCH', id: 911, l: LOC.league },
  { key: 'ELITE_FOUR_DRAKE_REMATCH', id: 912, l: LOC.league },
  { key: 'CHAMPION_STEVEN_REMATCH', id: 913, l: LOC.league },
  { key: 'WALLY_POSTGAME_2', id: 946 }
];
const BADGE_LEADERS = ['LEADER_ROXANNE', 'LEADER_BRAWLY', 'LEADER_WATTSON', 'LEADER_FLANNERY', 'LEADER_NORMAN', 'LEADER_WINONA', 'LEADER_TATE_LIZA', 'LEADER_WALLACE'];

// Gen-6-Skript (AMX): Kopf, dann die Befehle komprimiert (7 Bit je Byte, Bit 7 = es geht weiter, erstes Byte mit Vorzeichen)
function amxWords(raw) {
  const b = Buffer.from(raw), len = b.readUInt32LE(0), start = b.readUInt32LE(0x0C), n = (b.readUInt32LE(0x14) - start) / 4;
  const out = new Int32Array(n);
  for (let i = 0, j = 0, x = 0, f = start; i < n && f < len;) {
    const c = b[f++], v = c & 0x7f;
    x = ++j === 1 ? ((((v >> 6) === 0 ? 1 : 0) - 1) << 6) | v : (x << 7) | v;
    if (c & 0x80) continue;
    out[i++] = x; j = 0;
  }
  return out;
}
// Wo ein Trainer per Skript gekämpft wird: Zonendateien (a/0/1/3), Teil 2 = Skript der Zone. Ein Kampf ist der Aufruf einer
// Funktion, die (direkt oder bis zwei Ebenen tiefer) die Kampffunktion des Spiels aufruft – in der Native-Tabelle des
// Skripts der Name mit dem Hash 0x0B144EC1. Die Trainernummer steht als gepackter Push (Opcode 188, Wert in den oberen
// 16 Bit) unter den Argumenten davor. Dazu Trainer, die als Person in der Zone stehen (Skript 3000 + Nummer, Partner 5000 + …).
// → { Trainer: Set(Ort) }
function battleLocs(zoneFiles) {
  const u16 = (b, o) => b[o] | b[o + 1] << 8, u32 = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;
  const pack = b => { const n = u16(b, 2), o = []; for (let i = 0; i <= n; i++) o.push(u32(b, 4 + i * 4)); return o.slice(0, n).map((x, i) => b.subarray(x, o[i + 1])); };
  const zt = zoneFiles[zoneFiles.length - 2], out = {};
  for (let z = 0; z < zt.length / 56; z++) {
    const loc = u16(zt, z * 56 + 0x1C) & 0x1FF;
    try {
      const e = pack(zoneFiles[z])[1];
      for (let i = 0, o = 8 + e[4] * 0x14; i < e[5]; i++, o += 0x30) {
        const s = u16(e, o + 14), id = s >= 5000 && s < 6000 ? s - 5000 : s >= 3000 && s < 4000 ? s - 3000 : 0;
        if (id) (out[id] = out[id] || new Set()).add(loc);
      }
    } catch (err) { /* Zone ohne Personen */ }
    let raw, w;
    try { raw = Buffer.from(pack(zoneFiles[z])[2]); if (raw.readUInt32LE(4) !== 0x0A0AF1E0) continue; w = amxWords(raw); } catch (e) { continue; }
    let N = -1;
    for (let o = raw.readUInt32LE(0x24), k = 0; o + 8 <= raw.readUInt32LE(0x28); o += 8, k++) if (raw.readUInt32LE(o + 4) === 0x0B144EC1) N = k;
    if (N < 0) continue;
    const procs = []; for (let i = 0; i < w.length; i++) if (w[i] === 46) procs.push(i);   // 46 = PROC
    const procOf = i => { let lo = 0, hi = procs.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (procs[m] <= i) { r = procs[m]; lo = m + 1; } else hi = m - 1; } return r; };
    const fight = new Set();
    for (let i = 0; i + 1 < w.length; i++) if (w[i] === 135 && w[i + 1] === N) fight.add(procOf(i));   // 135 = SYSREQ.N
    for (let lvl = 0; lvl < 2; lvl++) for (let i = 0; i + 1 < w.length; i++) if (w[i] === 49 && fight.has((i * 4 + w[i + 1]) / 4)) fight.add(procOf(i));   // 49 = CALL
    for (let i = 0; i + 1 < w.length; i++) {
      if (w[i] !== 49 || !fight.has((i * 4 + w[i + 1]) / 4)) continue;
      for (let k = i - 1; k >= Math.max(0, i - 14) && w[k] !== 49 && w[k] !== 46; k--) {
        if ((w[k] & 0xffff) === 188 && (w[k] >>> 16) > 0) (out[w[k] >>> 16] = out[w[k] >>> 16] || new Set()).add(loc);
      }
    }
  }
  return out;
}

const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

(async () => {
  const rom = await OrasRom.openPath(ROM);
  if (!rom.game) throw new Error('Keine Omega-Rubin-/Alpha-Saphir-ROM');
  const [de, en, g] = await Promise.all([OrasRom.readTexts(rom, 'de'), OrasRom.readTexts(rom, 'en'), OrasRom.readGameData(rom)]);
  const ptBoss = JSON.parse(fs.readFileSync(path.join(HUB, 'Bosse', 'bosses.json'), 'utf8'));
  const fought = battleLocs(OrasRom._internal.garc(await rom.file('a/0/1/3'), true));

  // Alle Trainer mit Namen und Team (Platzhalter ohne Namen fallen weg)
  const trainers = {};
  g.trainers.forEach((t, id) => {
    if (!t || !t.party.length || !de.trainerNames[id]) return;
    trainers[id] = {
      k: 'T' + id, nd: de.trainerNames[id], ne: en.trainerNames[id], cd: de.trainerClasses[t.cls], ce: en.trainerClasses[t.cls], cls: t.cls,
      d: t.kind === 1 ? 1 : 0, it: t.items,
      p: OrasRom.bossTeam(t, g.personal, g.learnsets, g.megas)
    };
  });

  // Orte (de/en, Kennung für den Link zur Karte)
  const locs = [], locIndex = {};
  const locOf = id => {
    if (id == null) return undefined;
    if (!(id in locIndex)) { locIndex[id] = locs.length; locs.push({ de: de.maps[id], en: en.maps[id], slug: slug(en.maps[id]), id }); }
    return locIndex[id];
  };
  const group = (list) => list.map(s => {
    const ids = s.ids || { all: s.id };
    // ohne festen Ort: der eine Ort, an dem die Skripte diese Trainer kämpfen lassen
    if (s.l == null) {
      const at = new Set(); Object.values(ids).forEach(id => (fought[id] || []).forEach(l => at.add(l)));
      if (at.size === 1) s = { ...s, l: [...at][0] };
    }
    Object.values(ids).forEach(id => {
      const t = trainers[id];
      if (!t) throw new Error('Trainer fehlt: ' + s.key + ' ' + id);
      if (s.l != null) t.l = locOf(s.l);
      if (s.a) t.a = s.a;
      t.k = s.key + (s.ids ? '_' + Object.keys(ids).find(k => ids[k] === id).toUpperCase() : '');
    });
    const out = { key: s.key, ids };
    if (s.v) out.v = s.v;
    return out;
  });
  const story = group(STORY), post = group(POST);

  // Zusatzwerte der Attacken: [Priorität, Wirkung, Kontakt, Schlag]. Wirkung wie bei Platin (pret-Namen); neue Attacken
  // (ab Gen 5) bekommen sie aus den Gen-6-Daten (Mehrfachtreffer, Rückstoß, Volltreffer) oder aus SPECIAL.
  const SPECIAL = {
    492: 'USE_TARGET_ATTACK',                                  // Schmarotzer (Foul Play)
    473: 'SPECIAL_VS_DEFENSE', 540: 'SPECIAL_VS_DEFENSE', 548: 'SPECIAL_VS_DEFENSE',   // Psychoschock, Psychostoß, Mystoschwert
    484: 'WEIGHT_RATIO', 535: 'WEIGHT_RATIO',                  // Rammboss, Brandstempel
    486: 'SPEED_RATIO',                                        // Elektroball
    512: 'DOUBLE_POWER_WITHOUT_ITEM',                          // Akrobatik
    500: 'INCREASE_POWER_WITH_MORE_STAT_UP',                   // Kraftvorrat
    506: 'DOUBLE_POWER_WHEN_STATUSED', 474: 'DOUBLE_POWER_WHEN_STATUSED',   // Bürde, Giftschock
    515: 'SET_HP_EQUAL_TO_USER',                               // Wagemut – lässt sich nicht vorab rechnen
    524: 'ALWAYS_CRIT', 480: 'ALWAYS_CRIT'                     // Eisesodem, Sturmwurf
  };
  const moveExtra = {};
  g.moves.forEach((m, i) => {
    if (!m || !i) return;
    const pt = ptBoss.moveExtra[i];
    let eff = pt ? pt[1] : SPECIAL[i];
    if (!eff) {
      if (m.cat === 0) eff = 'STATUS';
      else if (m.hits[1] > 1) eff = m.hits[0] === m.hits[1] ? (m.hits[0] === 2 ? 'HIT_TWICE' : 'MULTI_HIT') : 'MULTI_HIT';
      else if (m.recoil < 0) eff = m.recoil <= -50 ? 'RECOIL_HALF' : m.recoil <= -33 ? 'RECOIL_THIRD' : 'RECOIL_QUARTER';
      else if (m.crit >= 6) eff = 'ALWAYS_CRIT';
      else if (m.crit) eff = 'HIGH_CRITICAL';
      else eff = 'HIT';
    }
    moveExtra[i] = [m.prio, eff, m.flags & 1 ? 1 : 0, m.flags & 0x80 ? 1 : 0, m.secondary ? 1 : 0];
  });

  // Level-Attacken je Basiswert-Eintrag (für randomisierte ROMs ohne eigene Liste): flach [Level, Attacke, …]
  const learn = g.learnsets.map(l => l.flat());
  const weight = {};
  g.personal.forEach((p, i) => { if (i && p.weight) weight[i] = p.weight; });

  const data = {
    version: 1, game: 'oras', gen: 6, source: 'ROM (Omega Rubin), gelesen mit Bosse/oras-rom.js',
    starters: g.starters, badgeLeaders: BADGE_LEADERS,
    locs, story, post, trainers, moveExtra, weight, areaEn: { Arena: 'Gym' }, fem: [], megas: g.megas, learn
  };
  const file = path.join(OUT, 'bosses-oras.json');
  fs.writeFileSync(file, JSON.stringify(data));
  console.log('bosses-oras.json', (fs.statSync(file).size / 1024).toFixed(0), 'KB ·', Object.keys(trainers).length, 'Trainer ·', story.length, 'Story ·', post.length, 'danach');
})().catch(e => { console.error(e); process.exit(1); });

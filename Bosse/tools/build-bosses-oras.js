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

const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

(async () => {
  const rom = await OrasRom.openPath(ROM);
  if (!rom.game) throw new Error('Keine Omega-Rubin-/Alpha-Saphir-ROM');
  const [de, en, g] = await Promise.all([OrasRom.readTexts(rom, 'de'), OrasRom.readTexts(rom, 'en'), OrasRom.readGameData(rom)]);
  const ptBoss = JSON.parse(fs.readFileSync(path.join(HUB, 'Bosse', 'bosses.json'), 'utf8'));

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

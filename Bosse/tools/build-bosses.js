/*
 * Baut die Daten für den Boss-Planer (Bosse/bosses.json) aus pret/pokeplatinum.
 *
 * Für jeden Trainer, der auch auf der Karte vorkommt, das vollständige Team so, wie das Spiel es erzeugt:
 *  - Attacken: eigene aus den Trainerdaten oder – wie im Spiel – die letzten vier Level-Attacken
 *  - DVs: iv_scale · 31 / 255 für alle Werte, keine FP (EVs)
 *  - Wesen und Fähigkeit aus der PID: Startwert = DV-Stufe + Level + Art + Trainer-Nummer, dann so viele
 *    LCRNG-Schritte wie die Trainerklassen-Nummer, PID = (Zufall << 8) + 120 (weibliche Klasse) bzw. 136
 *    (src/trainer_data.c: TrainerData_BuildParty). Wesen = PID mod 25, Fähigkeit = Bit 0 der PID.
 * Dazu Zusatzwerte aller Attacken (Priorität, Effekt) und das Gewicht jeder Art (für Fußkick/Strauchler).
 *
 * Basiswerte, Typen und Namen kommen zur Laufzeit aus SaveViewer/data-pt.js, die Orte aus Karte/platin.json.
 *
 * Aufruf (Node 18+):  node build-bosses.js [ausgabe-ordner] [cache-ordner]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const CACHE = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'platin-bosse-cache'));
const RAW = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/';
const HUB = path.join(__dirname, '..', '..');
fs.mkdirSync(CACHE, { recursive: true });

async function get(p, { optional = false } = {}) {
  const file = path.join(CACHE, p.replace(/[^\w.-]+/g, '_'));
  if (fs.existsSync(file)) {
    const t = fs.readFileSync(file, 'utf8');
    return t === '' && optional ? null : t;
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(RAW + p);
      if (r.status === 404 && optional) { fs.writeFileSync(file, ''); return null; }
      if (!r.ok) throw new Error(`${r.status} ${p}`);
      const t = await r.text();
      fs.writeFileSync(file, t);
      return t;
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise(res => setTimeout(res, 800 * attempt));
    }
  }
}
const getJSON = async (p, opt) => { const t = await get(p, opt); return t == null ? null : JSON.parse(t); };
const list = async p => (await get(p)).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
}

// LCRNG des Spiels
function lcrng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 0x41c64e6d) + 0x6073) >>> 0; return s >>> 16; };
}

(async () => {
  console.log('Lade Listen …');
  const TRAINERS = await list('generated/trainers.txt');
  const CLASSES = await list('generated/trainer_classes.txt');
  const SPECIES = await list('generated/species.txt');
  const MOVES = await list('generated/moves.txt');
  const ITEMS = await list('generated/items.txt');
  const idOf = arr => new Map(arr.map((n, i) => [n, i]));
  const trainerId = idOf(TRAINERS), classId = idOf(CLASSES), speciesId = idOf(SPECIES), moveId = idOf(MOVES), itemId = idOf(ITEMS);
  const genders = await get('include/data/trainer_class_genders.h');
  const female = new Set([...genders.matchAll(/\[(TRAINER_CLASS_\w+)\]\s*=\s*GENDER_FEMALE/g)].map(m => m[1]));

  // Basiswerte und Fähigkeiten wie im Save-Viewer
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(HUB, 'SaveViewer', 'data-pt.js'), 'utf8'), ctx);
  const PT = ctx.window.PT_DATA;

  // Trainer auf der Karte: Ort, Bereich und Innenkarte
  const MAP = JSON.parse(fs.readFileSync(path.join(HUB, 'Karte', 'platin.json'), 'utf8'));
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const locs = MAP.locations.map(l => ({ de: l.de, en: l.en, slug: slug(l.en) }));
  const where = new Map();
  MAP.locations.forEach((l, li) => l.trainers.forEach(t => { if (!where.has(t.id)) where.set(t.id, { l: li, a: t.area || '', m: t.map || '' }); }));

  // Standard-Attacken: Level-Attacken der Reihe nach, bei vier bekannten fliegt die älteste raus
  const learnsets = new Map();
  async function defaultMoves(species, level) {
    if (!learnsets.has(species)) {
      const d = await getJSON(`res/pokemon/${species.replace(/^SPECIES_/, '').toLowerCase()}/data.json`, { optional: true });
      learnsets.set(species, d?.learnset?.by_level || null);
    }
    const ls = learnsets.get(species);
    if (!ls) return null;
    const known = [];
    for (const [lv, mv] of ls) {
      if (lv > level || known.includes(mv)) continue;
      if (known.length === 4) known.shift();
      known.push(mv);
    }
    return known;
  }

  // ── Trainer ──
  console.log(`Lade ${where.size} Trainer …`);
  const trainers = {};
  const missing = [];
  await pool([...where.keys()], 8, async key => {
    const id = trainerId.get(key);
    const d = id != null ? await getJSON(`res/trainers/data/${key.replace(/^TRAINER_/, '').toLowerCase()}.json`, { optional: true }) : null;
    if (!d) { missing.push(key); return; }
    const cls = classId.get(d.class) ?? 0;
    const genderMod = female.has(d.class) ? 120 : 136;
    const party = [];
    for (const p of d.party) {
      const sp = speciesId.get(p.species) ?? 0;
      // PID wie im Spiel
      let rnd = (p.iv_scale + p.level + sp + id) >>> 0;
      const next = lcrng(rnd);
      for (let j = 0; j < cls; j++) rnd = next();
      const pid = ((rnd << 8) + genderMod) >>> 0;
      const per = PT.personal[sp] || [];
      const ability = (pid & 1) && per[11] ? per[11] : per[10] || 0;
      const moves = (p.moves && p.moves.length ? p.moves : await defaultMoves(p.species, p.level)) || [];
      party.push([sp, p.form || 0, p.level, itemId.get(p.item) || 0, moves.map(m => moveId.get(m) || 0).filter(Boolean),
        pid % 25, ability, Math.floor(p.iv_scale * 31 / 255)]);
    }
    const w = where.get(key);
    trainers[id] = {
      k: key.replace(/^TRAINER_/, ''), n: d.name, c: d.class.replace(/^TRAINER_CLASS_/, ''), d: d.double_battle ? 1 : 0,
      it: (d.items || []).map(i => itemId.get(i) || 0).filter(Boolean), l: w.l, a: w.a, m: w.m, p: party,
    };
  });

  // ── Bosse: Story bis zum Champ und Kämpfe danach, jeweils nach höchstem Level sortiert ──
  const STORY = /^(LEADER_[A-Z]+|RIVAL_(ROUTE_20[139]|PASTORIA_CITY|CANALAVE_CITY|POKEMON_LEAGUE)_[A-Z]+|COMMANDER_[A-Z]+_(VALLEY_WINDWORKS|TEAM_GALACTIC_ETERNA_BUILDING|VALOR_CAVERN|LAKE_VERITY|GALACTIC_HQ|SPEAR_PILLAR)|GALACTIC_BOSS_CYRUS_[A-Z_]+|ELITE_FOUR_[A-Z]+|CHAMPION_CYNTHIA)$/;
  const POST = /^(RIVAL_(SURVIVAL_AREA_[12]|FIGHT_AREA)_[A-Z]+|[A-Z_]+_REMATCH|LEADER_VOLKNER_FIGHT_AREA|ELITE_FOUR_FLINT_FIGHT_AREA|COMMANDER_[A-Z]+_STARK_MOUNTAIN)$/;
  // Gemeinsame Kämpfe zweier Gegner (du mit Partner gegen beide)
  const TAG = { COMMANDER_MARS_SPEAR_PILLAR: 'COMMANDER_JUPITER_SPEAR_PILLAR', COMMANDER_JUPITER_SPEAR_PILLAR: 'COMMANDER_MARS_SPEAR_PILLAR',
    COMMANDER_MARS_STARK_MOUNTAIN: 'COMMANDER_JUPITER_STARK_MOUNTAIN', COMMANDER_JUPITER_STARK_MOUNTAIN: 'COMMANDER_MARS_STARK_MOUNTAIN' };
  const maxLv = id => Math.max(...trainers[id].p.map(p => p[2]));
  function group(re) {
    const out = new Map();
    for (const [id, t] of Object.entries(trainers)) {
      if (POST.test(t.k) && re === STORY) continue;
      if (!re.test(t.k)) continue;
      // Rivale: eine Gruppe je Kampf, Varianten nach dem Starter des Spielers
      const rival = t.k.match(/^(RIVAL_.+)_(TURTWIG|CHIMCHAR|PIPLUP)$/);
      const key = rival ? rival[1] : t.k;
      if (!out.has(key)) out.set(key, { key, ids: {} });
      out.get(key).ids[rival ? rival[2].toLowerCase() : 'all'] = +id;
      if (TAG[t.k]) t.tag = trainerId.get(`TRAINER_${TAG[t.k]}`);
    }
    return [...out.values()]
      .map(g => ({ ...g, lv: Math.max(...Object.values(g.ids).map(maxLv)), first: Math.min(...Object.values(g.ids)) }))
      .sort((a, b) => a.lv - b.lv || a.first - b.first)
      .map(g => ({ key: g.key, ids: g.ids }));
  }
  const story = group(STORY), post = group(POST);

  // ── Attacken: Priorität und Effekt (Typ, Stärke, Genauigkeit, Klasse stehen in data-pt.js) ──
  console.log('Lade Attacken …');
  const moveExtra = {};
  const effects = new Set();
  await pool(MOVES.slice(1), 8, async (mv, i) => {
    const d = await getJSON(`res/moves/${mv.replace(/^MOVE_/, '').toLowerCase()}/data.json`, { optional: true });
    if (!d) return;
    const eff = String(d.effect?.type || '').replace(/^BATTLE_EFFECT_/, '');
    const contact = (d.flags || []).includes('MOVE_FLAG_MAKES_CONTACT') ? 1 : 0;
    if (d.class !== 'CLASS_STATUS') effects.add(eff);
    moveExtra[i + 1] = [d.priority || 0, eff, contact];
  });

  // ── Gewicht in 0,1 kg (für Fußkick und Strauchler) ──
  const weight = new Array(SPECIES.length).fill(0);
  await pool(SPECIES.slice(1, 494), 8, async (sp, i) => {
    const d = await getJSON(`res/pokemon/${sp.replace(/^SPECIES_/, '').toLowerCase()}/data.json`, { optional: true });
    const lb = d?.pokedex_data?.weight_pounds;
    if (lb != null) weight[i + 1] = Math.round(lb * 4.5359237);
  });

  // Englische Bereichsnamen (nur die, die bei Trainern vorkommen)
  const usedAreas = new Set(Object.values(trainers).map(t => t.a).filter(Boolean));
  const areaEn = Object.fromEntries(Object.entries(MAP.areaEn || {}).filter(([de]) => usedAreas.has(de)));
  const data = { version: 1, source: 'pret/pokeplatinum', locs, story, post, trainers, moveExtra, weight, areaEn };
  fs.mkdirSync(OUT, { recursive: true });
  const json = JSON.stringify(data);
  fs.writeFileSync(path.join(OUT, 'bosses.json'), json);
  console.log(`Fertig: ${Object.keys(trainers).length} Trainer, ${story.length} Story-Kämpfe, ${post.length} nach der Liga – bosses.json ${Math.round(json.length / 1024)} KB`);
  if (missing.length) console.log('  Ohne Trainerdaten:', missing.join(', '));
  const noMoves = Object.values(trainers).flatMap(t => t.p.filter(p => !p[4].length).map(p => `${t.k}:${SPECIES[p[0]]}`));
  if (noMoves.length) console.log('  Ohne Attacken:', noMoves.slice(0, 20).join(', '));
  if (process.env.SHOW_EFFECTS) console.log('  Effekte:', [...effects].sort().join(' '));
})().catch(e => { console.error(e); process.exit(1); });

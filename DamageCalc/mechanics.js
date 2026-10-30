/*
 * Spielmechanik für den Schadens-Rechner: Typentabellen, Statuswerte und Schadensformeln Gen 1–9.
 * Nur Rechnen, kein DOM – app.js greift über das globale Objekt DMG darauf zu.
 *
 * Reihenfolge und Rundung der Rechenschritte folgen den Spielen bzw. dem Smogon-Rechner (damage-calc):
 *   Gen 1–2  Basis → (Gen 2: Volltreffer ×2) → max. 997, +2 → Wetter → STAB → Typ je Typ → Zufall 217–255/255
 *   Gen 3    Basis → Verbrennung → Schild → Wetter → +2 → Volltreffer ×2 → STAB → Typ → Zufall 85–100 %
 *   Gen 4    Basis → Verbrennung → Schild → Wetter → +2 → Volltreffer ×2 → Zufall → STAB → Typ
 *   Gen 5+   Basis +2 → Wetter → Volltreffer (×2, ab Gen 6 ×1,5) → Zufall → STAB → Typ → Verbrennung → Schild
 */
(function (root) {
  'use strict';

  // ── Typentabellen ──────────────────────────────────────────────────────────
  // Ab Gen 6. Nicht aufgeführte Paarungen sind neutral (1×).
  const CHART_6 = {
    normal:   { rock:.5, ghost:0, steel:.5 },
    fire:     { fire:.5, water:.5, grass:2, ice:2, bug:2, rock:.5, dragon:.5, steel:2 },
    water:    { fire:2, water:.5, grass:.5, ground:2, rock:2, dragon:.5 },
    electric: { water:2, electric:.5, grass:.5, ground:0, flying:2, dragon:.5 },
    grass:    { fire:.5, water:2, grass:.5, poison:.5, ground:2, flying:.5, bug:.5, rock:2, dragon:.5, steel:.5 },
    ice:      { fire:.5, water:.5, grass:2, ice:.5, ground:2, flying:2, dragon:2, steel:.5 },
    fighting: { normal:2, ice:2, poison:.5, flying:.5, psychic:.5, bug:.5, rock:2, ghost:0, dark:2, steel:2, fairy:.5 },
    poison:   { grass:2, poison:.5, ground:.5, rock:.5, ghost:.5, steel:0, fairy:2 },
    ground:   { fire:2, electric:2, grass:.5, poison:2, flying:0, bug:.5, rock:2, steel:2 },
    flying:   { electric:.5, grass:2, fighting:2, bug:2, rock:.5, steel:.5 },
    psychic:  { fighting:2, poison:2, psychic:.5, dark:0, steel:.5 },
    bug:      { fire:.5, grass:2, fighting:.5, poison:.5, flying:.5, psychic:2, ghost:.5, dark:2, steel:.5, fairy:.5 },
    rock:     { fire:2, ice:2, fighting:.5, ground:.5, flying:2, bug:2, steel:.5 },
    ghost:    { normal:0, psychic:2, ghost:2, dark:.5 },
    dragon:   { dragon:2, steel:.5, fairy:0 },
    dark:     { fighting:.5, psychic:2, ghost:2, dark:.5, fairy:.5 },
    steel:    { fire:.5, water:.5, electric:.5, ice:2, rock:2, steel:.5, fairy:2 },
    fairy:    { fire:.5, fighting:2, poison:.5, dragon:2, dark:2, steel:.5 },
  };

  const chartCache = new Map();
  // Gen 2–5: keine Fee, Stahl widersteht Geist und Unlicht.
  // Gen 1: zusätzlich kein Unlicht/Stahl; Käfer ↔ Gift 2×, Geist → Psycho 0× (Programmfehler), Eis → Feuer 1×.
  function chartFor(gen) {
    if (gen >= 6) return CHART_6;
    if (chartCache.has(gen)) return chartCache.get(gen);
    const gone = gen === 1 ? ['fairy', 'dark', 'steel'] : ['fairy'];
    const chart = {};
    for (const [atk, row] of Object.entries(CHART_6)) {
      if (gone.includes(atk)) continue;
      chart[atk] = {};
      for (const [def, mult] of Object.entries(row)) if (!gone.includes(def)) chart[atk][def] = mult;
    }
    if (gen === 1) {
      chart.bug.poison = 2;
      chart.poison.bug = 2;
      chart.ghost.psychic = 0;
      delete chart.ice.fire;
    } else {
      chart.ghost.steel = .5;
      chart.dark.steel = .5;
    }
    chartCache.set(gen, chart);
    return chart;
  }

  // Gen 2–4 gehen zwei Typen in der Reihenfolge der Typentabelle im Spiel durch (nicht in Typ-1/Typ-2-Reihenfolge).
  // Wichtig nur für Gen 3–4, die nach jedem Typ abrunden.
  const TABLE_ORDER = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel'];

  // Wirkung je Verteidiger-Typ
  function typeEffs(moveType, defTypes, gen) {
    const row = chartFor(gen)[moveType] || {};
    let types = defTypes.filter((t, i) => defTypes.indexOf(t) === i);
    if (gen >= 2 && gen <= 4 && types.length === 2 && TABLE_ORDER.indexOf(types[0]) > TABLE_ORDER.indexOf(types[1])) {
      types = [types[1], types[0]];
    }
    return types.map(t => row[t] ?? 1);
  }
  const product = list => list.reduce((a, b) => a * b, 1);

  // Gen 1–3: physisch oder speziell hängt am Typ, nicht an der Attacke
  const PHYSICAL_TYPES = new Set(['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel']);
  function damageClassFor(gen, moveType, apiClass) {
    if (!apiClass || apiClass === 'status') return apiClass || null;
    if (gen <= 3) return PHYSICAL_TYPES.has(moveType) ? 'physical' : 'special';
    return apiClass;
  }

  // ── Statuswerte ────────────────────────────────────────────────────────────
  // Gen 1–2 kennen keine IV/EV/Wesen: DV = IV ÷ 2 (31 → 15), Statuspunkte-Bonus = EV ÷ 4 (252 → 63 = Maximum).
  function calcStat(gen, base, iv, ev, level, natureSign) {
    if (gen <= 2) {
      return Math.floor(((base + Math.floor(iv / 2)) * 2 + Math.floor(ev / 4)) * level / 100) + 5;
    }
    const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
    if (natureSign > 0) return Math.floor(raw * 110 / 100);
    if (natureSign < 0) return Math.floor(raw * 90 / 100);
    return raw;
  }
  function calcHP(gen, base, iv, ev, level) {
    if (base === 1) return 1; // Ninjatom hat immer 1 KP
    if (gen <= 2) {
      return Math.floor(((base + Math.floor(iv / 2)) * 2 + Math.floor(ev / 4)) * level / 100) + level + 10;
    }
    return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
  }

  // ── Statuswert-Stufen (−6 … +6) ──────────────────────────────────────────────
  // Gen 1–2: Faktor aus der Tabelle des Spiels in Hundertsteln, danach 1 … 999.
  // Ab Gen 3: (2 + Stufe) / 2 bzw. 2 / (2 − Stufe), abgerundet (gleiche Werte wie die Tabelle in Gen 3/4).
  const STAGE_GEN12 = [25, 28, 33, 40, 50, 66, 100, 150, 200, 250, 300, 350, 400];
  function applyStage(stat, stage, gen) {
    const s = Math.max(-6, Math.min(6, Math.trunc(stage) || 0));
    if (!s) return stat;
    if (gen <= 2) return Math.min(999, Math.max(1, Math.floor(stat * STAGE_GEN12[s + 6] / 100)));
    return s > 0 ? Math.floor(stat * (2 + s) / 2) : Math.floor(stat * 2 / (2 - s));
  }
  // Welche Stufen bei einem Volltreffer zählen:
  //   Gen 1 – keine; Gen 2 – keine, wenn die Angriffs-Stufe nicht höher ist als die Verteidigungs-Stufe, sonst beide;
  //   ab Gen 3 – die für den Angreifer guten (Angriff nur ab 0 aufwärts, Verteidigung nur ab 0 abwärts).
  function critStages(atkStage, defStage, gen) {
    if (gen === 1) return { atk: 0, def: 0 };
    if (gen === 2) return atkStage <= defStage ? { atk: 0, def: 0 } : { atk: atkStage, def: defStage };
    return { atk: Math.max(0, atkStage), def: Math.min(0, defStage) };
  }

  // ── Modifikatoren (Fähigkeiten, Items) ─────────────────────────────────────
  // Bis Gen 4 nacheinander abgerundet; ab Gen 5 als Kette in 4096steln, am Ende gerundet wie im Spiel.
  function chainMods(mods) {
    let M = 4096;
    for (const m of mods) M = (M * Math.round(m * 4096) + 2048) >> 12;
    return M;
  }
  function applyMods(value, mods, gen) {
    if (!mods || !mods.length) return value;
    if (gen <= 4) return Math.max(1, mods.reduce((v, m) => Math.floor(v * m), value));
    return Math.max(1, pokeRound(value * chainMods(mods) / 4096));
  }

  // ── Initiative ─────────────────────────────────────────────────────────────
  // o = { stage, scarf (Wahlschal), double (Wassertempo/Chlorophyll bei passendem Wetter), paralyzed }
  // Paralyse: ×¼ bis Gen 6, ab Gen 7 ×½
  function speedOf(raw, o, gen) {
    let s = applyStage(raw, o.stage || 0, gen);
    if (o.scarf) s = Math.floor(s * 1.5);
    if (o.double) s *= 2;
    if (o.paralyzed) s = Math.floor(s * (gen >= 7 ? 0.5 : 0.25));
    return Math.max(1, s);
  }

  // ── Schaden ────────────────────────────────────────────────────────────────
  const rollCount = gen => (gen <= 2 ? 39 : 16);

  // Rundung der Spiele ab Gen 5: x,5 wird abgerundet
  const pokeRound = x => (x % 1 > 0.5 ? Math.ceil(x) : Math.floor(x));

  function weatherFactor(p) {
    if (!p.weather || p.gen < 2) return 1;
    if ((p.weather === 'sun' && p.moveType === 'fire') || (p.weather === 'rain' && p.moveType === 'water')) return 1.5;
    if ((p.weather === 'sun' && p.moveType === 'water') || (p.weather === 'rain' && p.moveType === 'fire')) return 0.5;
    return 1;
  }

  /*
   * p = { gen, level, power, atk, def, physical, stab, effs:[…], crit, burn, screens,
   *       weather:'sun'|'rain'|null, moveType, explosion,
   *       stabMod (1,5 bzw. 2 mit Anpassung), lifeOrb (nur Gen 4), finalMods:[…] (Gen 4+, z. B. Filter 0,75) }
   * atk/def/power sind die fertigen Werte (mit Wesen, Stufen, Fähigkeiten, Items), ohne Verbrennung und Schild.
   * Ergebnis: alle möglichen Schadenswerte, aufsteigend (Gen 1–2: 39, ab Gen 3: 16).
   */
  function damageRolls(p) {
    if (p.effs.some(e => e === 0)) return new Array(rollCount(p.gen)).fill(0);
    if (p.gen <= 2) return rollsGen12(p);
    if (p.gen === 3) return rollsGen3(p);
    if (p.gen === 4) return rollsGen4(p);
    return rollsGen5(p);
  }

  function rollsGen12(p) {
    let at = p.atk, df = p.def, lv = p.level;
    // Volltreffer nimmt die unveränderten Werte: Verbrennung und Reflektor/Lichtschild zählen nicht
    if (!p.crit && p.burn && p.physical) at = Math.floor(at / 2);
    if (p.explosion) df = Math.floor(df / 2);
    if (!p.crit && p.screens) df *= 2;
    if (p.gen === 1 && p.crit) lv *= 2;
    // Werte über 255 passen nicht in ein Byte: beide werden geviertelt
    if (at > 255 || df > 255) {
      at = Math.floor(at / 4) % 256;
      df = Math.floor(df / 4) % 256;
    }
    let d = Math.floor(Math.floor((Math.floor(2 * lv / 5) + 2) * Math.max(1, at) * p.power / Math.max(1, df)) / 50);
    if (p.gen === 2 && p.crit) d *= 2;
    d = Math.min(997, d) + 2;
    const w = weatherFactor(p);
    if (w !== 1) d = Math.floor(d * w);
    if (p.stab) d = Math.floor(d * 1.5);
    // Gen 1 rundet nach jedem Typ ab, Gen 2 rechnet die Typen zusammen
    if (p.gen === 1) for (const e of p.effs) d = Math.floor(d * e);
    else d = Math.floor(d * product(p.effs));
    const rolls = [];
    for (let r = 217; r <= 255; r++) {
      if (p.gen === 1) rolls.push(d === 1 ? 1 : Math.floor(d * r / 255));
      else rolls.push(Math.max(1, Math.floor(d * r / 255)));
    }
    return rolls;
  }

  function rollsGen3(p) {
    const df = p.explosion ? Math.floor(p.def / 2) : p.def;
    let d = Math.floor(Math.floor(Math.floor(2 * p.level / 5 + 2) * p.atk * p.power / df) / 50);
    if (p.burn && p.physical) d = Math.floor(d / 2);
    if (p.screens && !p.crit) d = Math.floor(d / 2);
    const w = weatherFactor(p);
    if (w !== 1) d = Math.floor(d * w);
    if (p.physical) d = Math.max(1, d);
    d += 2;
    if (p.crit) d *= 2;
    if (p.stab) d = Math.floor(d * 1.5);
    for (const e of p.effs) d = Math.floor(d * e);
    const rolls = [];
    for (let r = 85; r <= 100; r++) rolls.push(Math.max(1, Math.floor(d * r / 100)));
    return rolls;
  }

  function rollsGen4(p) {
    const df = p.explosion ? Math.floor(p.def / 2) : p.def;
    let d = Math.floor(Math.floor(Math.floor(2 * p.level / 5 + 2) * p.power * p.atk / 50) / df);
    if (p.burn && p.physical) d = Math.floor(d / 2);
    if (p.screens && !p.crit) d = Math.floor(d / 2);
    const w = weatherFactor(p);
    if (w !== 1) d = Math.floor(d * w);
    d += 2;
    if (p.crit) d *= 2;
    if (p.lifeOrb) d = Math.floor(d * 1.3);
    const rolls = [];
    for (let r = 85; r <= 100; r++) {
      let x = Math.floor(d * r / 100);
      if (p.stab) x = Math.floor(x * (p.stabMod || 1.5));
      for (const e of p.effs) x = Math.floor(x * e);
      for (const m of p.finalMods || []) x = Math.floor(x * m);
      rolls.push(Math.max(1, x));
    }
    return rolls;
  }

  function rollsGen5(p) {
    let d = Math.floor(Math.floor(Math.floor(2 * p.level / 5 + 2) * p.power * p.atk / p.def) / 50) + 2;
    const w = weatherFactor(p);
    if (w !== 1) d = pokeRound(d * w);
    if (p.crit) d = Math.floor(d * (p.gen >= 6 ? 1.5 : 2));
    const eff = product(p.effs);
    const final = chainMods([...(p.screens && !p.crit ? [0.5] : []), ...(p.finalMods || [])]);
    const rolls = [];
    for (let r = 85; r <= 100; r++) {
      let x = Math.floor(d * r / 100);
      if (p.stab) x = pokeRound(x * (p.stabMod || 1.5));
      x = Math.floor(x * eff);
      if (p.burn && p.physical) x = Math.floor(x / 2);
      x = final === 4096 ? Math.max(1, x) : Math.max(1, pokeRound(x * final / 4096));
      rolls.push(x);
    }
    return rolls;
  }

  // ── KO-Chance ──────────────────────────────────────────────────────────────
  // Jeder Treffer würfelt neu. Gesucht: kleinste Trefferzahl mit KO-Chance > 0 und deren Wahrscheinlichkeit.
  // first = Schadenswerte des ersten Treffers, falls anders (Resistenz-Beere, Multischuppe wirken nur einmal)
  function koChance(rolls, hp, maxHits = 8, first = rolls) {
    if (!hp || !rolls.length || Math.max(rolls[rolls.length - 1], first[first.length - 1]) <= 0) return null;
    let dist = new Map([[0, 1]]);
    for (let hits = 1; hits <= maxHits; hits++) {
      const list = hits === 1 ? first : rolls;
      if (first[0] + rolls[0] * (hits - 1) >= hp) return { hits, chance: 1 };
      const n = list.length;
      const next = new Map();
      for (const [sum, pr] of dist) {
        for (const r of list) {
          const s = Math.min(hp, sum + r);
          next.set(s, (next.get(s) || 0) + pr / n);
        }
      }
      dist = next;
      const ko = dist.get(hp) || 0;
      if (ko > 0) return { hits, chance: Math.min(1, ko) };
    }
    return null;
  }
  // Ab wie vielen Treffern der KO sicher ist (auch mit dem niedrigsten Wurf)
  function sureHits(rolls, hp, first = rolls) {
    if (!hp || !rolls.length || rolls[0] <= 0) return null;
    if (first[0] >= hp) return 1;
    return 1 + Math.ceil((hp - first[0]) / rolls[0]);
  }

  const DMG = {
    chartFor, typeEffs, product, damageClassFor,
    calcStat, calcHP, applyStage, critStages, chainMods, applyMods, speedOf, rollCount, damageRolls, koChance, sureHits,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DMG;
  else root.DMG = DMG;
})(typeof window !== 'undefined' ? window : globalThis);

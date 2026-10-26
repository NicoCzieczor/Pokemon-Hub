// Erzeugt pokemon-names.js: deutsche und englische Namen aller Pokémon-Arten und ihrer Formen.
// Damit brauchen die Seiten für die Auswahllisten keine ~1000 Einzelanfragen an PokeAPI mehr
// (vorher je Pokémon eine), und die Namen sind sofort und auch offline da.
//
// Quelle: die Datentabellen von PokeAPI (github.com/PokeAPI/pokeapi, data/v2/csv).
// Wann nötig: wenn neue Pokémon erscheinen.  Aufruf (Node 18+):  node tools/build-pokemon-names.js
const fs = require('fs');
const path = require('path');
const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const DE = '6', EN = '9';   // Sprach-Nummern in den PokeAPI-Tabellen

// Kleiner CSV-Leser (Felder dürfen in Anführungszeichen stehen und Kommas enthalten)
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0]) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...rest] = rows;
  return rest.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
async function table(name) {
  const res = await fetch(CSV + name + '.csv');
  if (!res.ok) throw new Error(name + ': HTTP ' + res.status);
  return parseCsv(await res.text());
}

(async () => {
  const [speciesNames, pokemon, forms, formNames] = await Promise.all(
    ['pokemon_species_names', 'pokemon', 'pokemon_forms', 'pokemon_form_names'].map(table));

  // Artnamen je Pokédex-Nummer
  const de = [], en = [];
  for (const r of speciesNames) {
    const id = +r.pokemon_species_id;
    if (r.local_language_id === DE) de[id] = r.name;
    if (r.local_language_id === EN) en[id] = r.name;
  }
  const max = Math.max(de.length, en.length) - 1;
  for (let i = 1; i <= max; i++) { de[i] = de[i] || en[i] || ''; en[i] = en[i] || de[i] || ''; }

  // Formen: alle Pokémon, die nicht die Standardform ihrer Art sind (Ur-Giratina, Alola-Formen, Megas …).
  // Name: der offizielle volle Name der Form, sonst „Art (Formname)“.
  const defaultFormOf = {};
  for (const f of forms) if (f.is_default === '1') defaultFormOf[f.pokemon_id] = f.id;
  const fnames = {};
  for (const r of formNames) if (r.local_language_id === DE || r.local_language_id === EN) fnames[r.pokemon_form_id + ':' + r.local_language_id] = r;
  const alt = {};
  for (const p of pokemon) {
    if (p.is_default === '1') continue;
    const sid = +p.species_id, fid = defaultFormOf[p.id];
    const name = lang => {
      const r = fnames[fid + ':' + lang];
      const base = (lang === DE ? de : en)[sid];
      if (r && r.pokemon_name) return r.pokemon_name;
      if (r && r.form_name) return `${base} (${r.form_name})`;
      return base;
    };
    alt[p.identifier] = [sid, name(DE), name(EN)];
  }

  // Nidoran♀/♂: Geschlechtszeichen als Text darstellen (sonst zeichnet das iPhone ein Emoji)
  const txt = s => s.replace(/([♀♂])(?!︎)/g, '$1︎');
  for (let i = 1; i <= max; i++) { de[i] = txt(de[i]); en[i] = txt(en[i]); }
  for (const k in alt) { alt[k][1] = txt(alt[k][1]); alt[k][2] = txt(alt[k][2]); }

  const out =
`/* Pokémon-Namen (Deutsch/Englisch) für die Auswahllisten aller Seiten.
 * Automatisch erzeugt von tools/build-pokemon-names.js aus den PokeAPI-Tabellen – nicht von Hand bearbeiten.
 *
 *   pokemonName(id, pokeapiName, lang)  → Anzeigename, z. B. pokemonName(487, 'giratina-altered', 'de') = 'Giratina'
 *                                          (Standardform = Artname; andere Formen: 'giratina-origin' = 'Ur-Giratina')
 */
window.POKEMON_NAMES = {
  // Artnamen, Index = Pokédex-Nummer
  de: ${JSON.stringify(de.map(x => x || ''))},
  en: ${JSON.stringify(en.map(x => x || ''))},
  // Formen (PokeAPI-Name → [Art, Name deutsch, Name englisch])
  forms: ${JSON.stringify(alt)}
};
window.pokemonName = function (id, slug, lang) {
  var N = window.POKEMON_NAMES, en = (lang || window.LANG) === 'en';
  var f = slug && N.forms[slug];
  if (f) return en ? f[2] : f[1];
  id = +id;
  if (id > 0 && id < N.de.length) return (en ? N.en : N.de)[id] || null;
  return null;
};
`;
  const file = path.join(__dirname, '..', 'pokemon-names.js');
  fs.writeFileSync(file, out);
  console.log(`${path.relative(process.cwd(), file)}: ${max} Arten, ${Object.keys(alt).length} Formen, ${(out.length / 1024).toFixed(0)} KB`);
})().catch(e => { console.error(e); process.exit(1); });

// Berechnet die Werte der Themes „Papier“ und „Graphit“ aus den Klassik-Bausteinen in theme.css
// und schreibt sie zwischen die Marker /* @@themes-start */ … /* @@themes-end */.
//
// Wann nötig: wenn in theme.css unter :root (Klassik) ein Baustein dazukommt oder sich ändert.
// Feste Farben der beiden Themes stehen unten in P.fixed bzw. G.fixed, der Rest wird berechnet:
//  - Papier: dunkle Flächen → fast weiß, helle Grautöne → dunkle Grautöne, bunte Schrift so weit
//    abgedunkelt, dass sie auf dem Papier-Hintergrund mindestens 4,6 : 1 Kontrast hat.
//  - Graphit: Flächen neutral statt blau, Grautöne warm, bunte Schrift etwas ruhiger.
// Aufruf (Node 18+):  node tools/build-theme-values.js [theme.css]
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'theme.css');
let css = fs.readFileSync(file, 'utf8');
const classicBlock = css.match(/:root \{([\s\S]*?)\n\}/)[1];
const tokens = [...classicBlock.matchAll(/--(t-[\w-]+):\s*(\d+),\s*(\d+),\s*(\d+);/g)].map(m => ({ name: m[1], rgb: [+m[2], +m[3], +m[4]] }));

// ── Farbhelfer ───────────────────────────────────────────────────────────────
function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
function toRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map(v => Math.round((v + m) * 255));
}
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Farbigkeit als Abstand der Kanäle – bei sehr hellen Farben aussagekräftiger als die HSL-Sättigung
const chroma = rgb => Math.max(...rgb) - Math.min(...rgb);
// Variante mit gleichem Farbton, die auf `bg` mindestens `min` Kontrast hat (so hell wie möglich)
function readableOn(rgb, bg, min, maxSat = 0.78) {
  const [h, s0, l0] = toHsl(rgb);
  const s = Math.min(s0, maxSat);
  for (let l = Math.min(l0, 0.62); l >= 0.08; l -= 0.004) {
    const c = toRgb([h, s, l]);
    if (contrast(c, bg) >= min) return c;
  }
  return toRgb([h, s, 0.08]);
}

// ── Papier (hell, warm, gedämpft) ────────────────────────────────────────────
// Sandfarbener Grund statt Weiß (blendet nicht), Rot als einzige Signalfarbe, Sepia statt Blau
const P = {
  bg: [228, 222, 211],
  fixed: {
    't-acc': [176, 48, 36], 't-acc2': [104, 80, 58],
    't-acc-glow': [228, 222, 211], 't-acc2-glow': [228, 222, 211],
    't-hl': [255, 255, 255], 't-ink': [52, 42, 30], 't-white': [36, 31, 25],
    't-shade': [92, 76, 56], 't-on-acc': [250, 246, 238],
    // Hintergrund hinter Dialogen: hell abgedeckt statt dunkel
    't-n-050614': [214, 207, 194], 't-n-080a1e': [214, 207, 194],
    // Seitenhintergrund und dunkle Schrift auf hellen Knöpfen
    't-n-0d0f2b': [228, 222, 211], 't-n-0b0c18': [222, 215, 203],
    't-n-0f172a': [244, 240, 232], 't-n-101322': [244, 240, 232],
    // Randlinien
    't-n-303258': [201, 192, 176], 't-n-262952': [236, 231, 222],
  },
};
function paper(t) {
  if (P.fixed[t.name]) return P.fixed[t.name];
  const [, , l] = toHsl(t.rgb);
  if (t.name.startsWith('t-n-')) return toRgb([40, 0.3, clamp(0.925 + (l - 0.13) * 0.35, 0.905, 0.945)]); // Flächen → helles Creme
  if (t.name.startsWith('t-g-')) {
    if (chroma(t.rgb) >= 35) return readableOn(t.rgb, P.bg, 4.6);                                          // getönte Schrift
    return toRgb([35, 0.07, clamp(0.14 + (0.98 - l) * 1.25, 0.14, 0.42)]);                                 // Grau → dunkles Grau
  }
  if (t.name.startsWith('t-c-')) return readableOn(t.rgb, P.bg, 4.6);
  return t.rgb;
}

// ── Graphit (dunkel, neutral) ────────────────────────────────────────────────
const G = {
  bg: [23, 23, 22],
  fixed: {
    't-acc': [226, 170, 72], 't-acc2': [150, 178, 204],
    't-acc-glow': [23, 23, 22], 't-acc2-glow': [23, 23, 22],
    't-hl': [255, 255, 255], 't-ink': [250, 246, 238], 't-white': [238, 235, 228],
    't-shade': [0, 0, 0], 't-on-acc': [28, 24, 18],
    't-n-0f172a': [28, 24, 18], 't-n-101322': [28, 24, 18],
  },
};
function graphite(t) {
  if (G.fixed[t.name]) return G.fixed[t.name];
  const [h, s, l] = toHsl(t.rgb);
  if (t.name.startsWith('t-n-')) return toRgb([40, 0.04, clamp(0.09 + (l - 0.11) * 0.7, 0.03, 0.4)]);
  if (t.name.startsWith('t-g-')) return chroma(t.rgb) >= 35 ? toRgb([h, s * 0.55, l]) : toRgb([40, 0.06, l]);
  if (t.name.startsWith('t-c-')) return toRgb([h, s * 0.72, l]);
  return t.rgb;
}

// ── Ausgabe ──────────────────────────────────────────────────────────────────
const fmt = c => c.join(', ');
const block = (sel, fn, title) => `/* ── ${title} ${'─'.repeat(Math.max(3, 74 - title.length))} */\n${sel} {\n${tokens.map(t => `  --${t.name}: ${fmt(fn(t))};`).join('\n')}\n}\n`;
const generated = '/* @@themes-start – erzeugt aus den Klassik-Werten, siehe Kommentar oben */\n'
  + block('html[data-theme="paper"]', paper, 'Papier (hell)') + '\n'
  + block('html[data-theme="graphite"]', graphite, 'Graphit (dunkel, neutral)')
  + '/* @@themes-end */';
if (/\/\* @@themes-start[\s\S]*?@@themes-end \*\//.test(css)) css = css.replace(/\/\* @@themes-start[\s\S]*?@@themes-end \*\//, generated);
else css = css.replace(/(:root \{[\s\S]*?\n\}\n)/, `$1\n${generated}\n`);
fs.writeFileSync(file, css);

// Kontrolle: Kontrast der Schriftfarben im Papier-Theme
const weak = tokens.filter(t => /^t-(c|g)-/.test(t.name)).map(t => [t.name, contrast(paper(t), P.bg)]).filter(([, c]) => c < 3);
console.log(`${tokens.length} Bausteine je Theme geschrieben.`);
console.log('Papier, Schrift mit Kontrast < 3:1:', weak.map(([n, c]) => `${n} ${c.toFixed(1)}`).join(', ') || 'keine');
console.log('Papier Akzent 1:', contrast(P.fixed['t-acc'], P.bg).toFixed(2), '| Akzent 2:', contrast(P.fixed['t-acc2'], P.bg).toFixed(2), '| Schrift:', contrast(P.fixed['t-white'], P.bg).toFixed(2));
console.log('Graphit Akzent 1:', contrast(G.fixed['t-acc'], G.bg).toFixed(2), '| Akzent 2:', contrast(G.fixed['t-acc2'], G.bg).toFixed(2), '| Schrift:', contrast(G.fixed['t-white'], G.bg).toFixed(2));

/*
 * Ganze, spielbare .cxi aus der Original-ROM und dem gewürfelten Mod (Omega Rubin / Alpha Saphir).
 *
 * Der Randomizer liefert nur die geänderten Teile (LayeredFS: romfs/… und code.bin). Hier wird daraus wieder ein ganzes
 * Spiel: die Spiel-Partition (NCCH) der ROM, darin die ExeFS mit dem neuen code.bin und die RomFS mit den neuen Dateien.
 * Die Datei entsteht nicht im Speicher: build() liefert eine Liste von Teilen – neue Bytes (Kopf, Tabellen, Mod-Dateien)
 * und Bereiche der Original-ROM ({ start, end }). Im Browser wird daraus ein Blob aus Stücken der ROM-Datei
 * (new Blob(parts) mit file.slice – nichts wird kopiert), in Node schreibt man die Teile nacheinander.
 *
 * Aufbau nach 3dbrew (NCCH, ExeFS, RomFS/IVFC). Citra/Azahar prüft keine Prüfsummen und liest die RomFS-Ebene 3 fest bei
 * RomFS + 0x1000. Die Hashes von Exheader, ExeFS und RomFS-Kopf werden trotzdem richtig gesetzt, die IVFC-Hash-Ebenen
 * (rund 15 MB, über die ganzen 1,9 GB gerechnet) bleiben leer.
 *
 * build(read, mods) → Promise<{ parts, size }>
 *   read(start, end) → Promise<Uint8Array>: Bytes der ROM-Datei (.3ds oder .cxi, entschlüsselt)
 *   mods: { code: Uint8Array | null, files: { 'a/0/1/3': Uint8Array, 'DllField.cro': …, … } } (Pfade ab romfs/)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CxiBuild = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var u16 = function (b, o) { return b[o] | (b[o + 1] << 8); };
  var u32 = function (b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; };
  var u64 = function (b, o) { return u32(b, o) + u32(b, o + 4) * 4294967296; };
  var put32 = function (b, o, v) { b[o] = v & 255; b[o + 1] = (v >>> 8) & 255; b[o + 2] = (v >>> 16) & 255; b[o + 3] = (v >>> 24) & 255; };
  var put64 = function (b, o, v) { put32(b, o, v % 4294967296); put32(b, o + 4, Math.floor(v / 4294967296)); };
  var magic = function (b, o) { return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]); };
  var align = function (v, a) { return Math.ceil(v / a) * a; };
  var fail = function (m) { return new Error(m); };
  function sha256(data) {
    var c = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto : require('crypto').webcrypto;
    return c.subtle.digest('SHA-256', data).then(function (h) { return new Uint8Array(h); });
  }

  // Dateien der RomFS (Ebene 3): Pfad → Eintrag in der Dateitabelle (Lage im Tabellen-Puffer, Datenlage, Größe)
  function romfsFiles(dmeta, fmeta) {
    var out = [], budget = 200000;
    var name = function (b, o, n) { var s = ''; for (var i = 0; i < n; i += 2) s += String.fromCharCode(u16(b, o + i)); return s; };
    (function walk(off, path, depth) {
      if (depth > 32 || off + 24 > dmeta.length) return;
      var here = off ? path + name(dmeta, off + 24, u32(dmeta, off + 20)) + '/' : '';
      for (var fo = u32(dmeta, off + 12); fo !== 0xFFFFFFFF && fo + 32 <= fmeta.length; fo = u32(fmeta, fo + 4)) {
        if (--budget < 0) throw fail('romfs');
        out.push({ path: here + name(fmeta, fo + 32, u32(fmeta, fo + 28)), entry: fo, off: u64(fmeta, fo + 8), size: u64(fmeta, fo + 16) });
      }
      for (var c = u32(dmeta, off + 8); c !== 0xFFFFFFFF; c = u32(dmeta, c + 4)) {
        if (--budget < 0) throw fail('romfs');
        walk(c, here, depth + 1);
      }
    })(0, '', 0);
    return out;
  }

  function build(read, mods) {
    mods = mods || {};
    var files = mods.files || {};
    var base = 0, H, mu, EX, exefsOff, exefsHdr, romfsOff, ivfc, l3, l3hdr, meta;
    return read(0, 0x200).then(function (h) {
      if (magic(h, 0x100) === 'NCSD') { base = u32(h, 0x120) * 0x200; return read(base, base + 0x200); }
      return h;
    }).then(function (h) {
      if (magic(h, 0x100) !== 'NCCH') throw fail('notRom');
      if (!(h[0x18F] & 4)) throw fail('encrypted');
      H = new Uint8Array(h);
      mu = 0x200 << H[0x18E];                                   // Mediengröße
      exefsOff = u32(H, 0x1A0) * mu; romfsOff = u32(H, 0x1B0) * mu;
      if (!u32(H, 0x1A4) || !u32(H, 0x1B4)) throw fail('notRom');
      return Promise.all([read(base + 0x200, base + 0x200 + 0x800), read(base + exefsOff, base + exefsOff + 0x200), read(base + romfsOff, base + romfsOff + 0x60)]);
    }).then(function (r) {
      EX = new Uint8Array(r[0]); exefsHdr = r[1]; ivfc = r[2];
      if (magic(ivfc, 0) !== 'IVFC') throw fail('notRom');
      var bs3 = Math.pow(2, u32(ivfc, 0x4C));
      l3 = romfsOff + align(0x60 + u32(ivfc, 8), bs3);
      return read(base + l3, base + l3 + 0x28);
    }).then(function (h3) {
      l3hdr = h3;
      return read(base + l3, base + l3 + u32(h3, 0x24));          // Kopf und Tabellen bis zum Datenbereich
    }).then(function (m) {
      meta = new Uint8Array(m);
      // ── ExeFS: alle Dateien (klein), .code ersetzt ──
      var ex = [];
      for (var i = 0; i < 10; i++) {
        var o = i * 16, nm = '';
        for (var k = 0; k < 8 && exefsHdr[o + k]; k++) nm += String.fromCharCode(exefsHdr[o + k]);
        if (!nm) continue;
        ex.push({ slot: i, name: nm, off: u32(exefsHdr, o + 8), size: u32(exefsHdr, o + 12) });
      }
      return Promise.all(ex.map(function (e) {
        if (e.name === '.code' && mods.code) return Promise.resolve(mods.code);
        var s = base + exefsOff + 0x200 + e.off;
        return read(s, s + e.size);
      })).then(function (data) { return { ex: ex, data: data }; });
    }).then(function (X) {
      var parts = [], size = 0;
      var push = function (p) { parts.push(p); size += p instanceof Uint8Array ? p.length : p.end - p.start; };
      var zeros = function (n) { if (n > 0) push(new Uint8Array(n)); };

      // ── ExeFS neu: Kopf (Namen, Lage, Größe, SHA-256 je Datei), Dateien je auf 0x200 ausgerichtet ──
      var exHead = new Uint8Array(0x200), exBody = [], cur = 0;
      var codeReplaced = !!mods.code;
      var hashJobs = X.ex.map(function (e, n) {
        var d = X.data[n];
        for (var k = 0; k < 8; k++) exHead[e.slot * 16 + k] = k < e.name.length ? e.name.charCodeAt(k) : 0;
        put32(exHead, e.slot * 16 + 8, cur); put32(exHead, e.slot * 16 + 12, d.length);
        exBody.push({ at: cur, data: d });
        cur = align(cur + d.length, 0x200);
        return sha256(d).then(function (hh) { exHead.set(hh, 0xC0 + (9 - e.slot) * 0x20); });
      });
      var exSize = align(0x200 + cur, mu);

      // ── RomFS: Dateien in ihrer Reihenfolge im Datenbereich, je auf 0x10, neue Lage in der Dateitabelle ──
      var dmeta = meta.subarray(u32(l3hdr, 0x0C), u32(l3hdr, 0x0C) + u32(l3hdr, 0x10));
      var fmOff = u32(l3hdr, 0x1C), fmeta = meta.subarray(fmOff, fmOff + u32(l3hdr, 0x20));
      var list = romfsFiles(dmeta, fmeta).sort(function (a, b) { return a.off - b.off; });
      var known = {};
      list.forEach(function (f) { known[f.path] = f; });
      Object.keys(files).forEach(function (p) { if (!known[p]) throw fail('newFile:' + p); });
      var dataOff = u32(l3hdr, 0x24), pos = 0, layout = [];
      list.forEach(function (f) {
        pos = align(pos, 0x10);
        var mod = files[f.path], len = mod ? mod.length : f.size;
        layout.push({ f: f, at: pos, len: len, mod: mod });
        put64(fmeta, f.entry + 8, pos); put64(fmeta, f.entry + 16, len);
        pos += len;
      });
      var s3 = dataOff + pos;
      // IVFC: Ebene 2 hasht Ebene 3, Ebene 1 Ebene 2, der Master-Hash Ebene 1 (je 32 Byte pro Block)
      var b1 = u32(ivfc, 0x1C), b2 = u32(ivfc, 0x34), b3 = u32(ivfc, 0x4C), B1 = Math.pow(2, b1), B2 = Math.pow(2, b2), B3 = Math.pow(2, b3);
      var s2 = Math.ceil(s3 / B3) * 32, s1 = Math.ceil(s2 / B2) * 32, sm = Math.ceil(s1 / B1) * 32;
      var l3phys = align(0x60 + sm, B3);
      if (l3phys !== 0x1000) throw fail('ivfc');                   // so liest Citra die RomFS (fest bei + 0x1000)
      var ivHead = new Uint8Array(l3phys);
      ivHead.set(ivfc.subarray(0, 0x60));
      put32(ivHead, 8, sm);
      var o1 = 0, o2 = align(o1 + s1, B2), o3 = align(o2 + s2, B3);
      [[o1, s1], [o2, s2], [o3, s3]].forEach(function (lv, i) { put64(ivHead, 0x0C + i * 0x18, lv[0]); put64(ivHead, 0x14 + i * 0x18, lv[1]); });
      var romSize = l3phys + align(s3, B3) + align(s1, B1) + align(s2, B2);
      var romHashRegion = align(0x60 + sm, mu) / mu;

      // ── NCCH-Kopf und Exheader ──
      if (codeReplaced) EX[0x0D] &= ~1;                             // code.bin ist entpackt
      var newRomfsOff = align(exefsOff + exSize, 0x1000);
      return Promise.all(hashJobs).then(function () {
        return Promise.all([sha256(EX.subarray(0, 0x400)), sha256(exHead.subarray(0, u32(H, 0x1A8) * mu || 0x200)), sha256(ivHead.subarray(0, romHashRegion * mu))]);
      }).then(function (hs) {
        var total = newRomfsOff + align(romSize, mu);
        put32(H, 0x104, total / mu);
        H.set(hs[0], 0x160);
        put32(H, 0x1A4, exSize / mu);
        H.set(hs[1], 0x1C0);
        put32(H, 0x1B0, newRomfsOff / mu); put32(H, 0x1B4, align(romSize, mu) / mu); put32(H, 0x1B8, romHashRegion);
        H.set(hs[2], 0x1E0);

        push(H); push(EX);
        // Logo, Plain Region …: unverändert bis zur ExeFS
        if (exefsOff > 0xA00) push({ start: base + 0xA00, end: base + exefsOff });
        push(exHead);
        var at = 0;
        exBody.forEach(function (e) { zeros(e.at - at); push(e.data); at = e.at + e.data.length; });
        zeros(exSize - 0x200 - at);
        zeros(newRomfsOff - exefsOff - exSize);
        // RomFS: IVFC-Kopf, Ebene 3 (Kopf + Tabellen + Dateien), leere Hash-Ebenen 1 und 2
        push(ivHead);
        push(meta);
        var p3 = 0;
        layout.forEach(function (x) {
          zeros(x.at - p3);
          if (x.mod) push(x.mod);
          else if (x.len) push({ start: base + l3 + dataOff + x.f.off, end: base + l3 + dataOff + x.f.off + x.len });
          p3 = x.at + x.len;
        });
        zeros(align(s3, B3) - s3);
        var z = align(s1, B1) + align(s2, B2) + (align(romSize, mu) - romSize), chunk = 8 << 20;
        while (z > 0) { zeros(Math.min(chunk, z)); z -= chunk; }
        if (size !== total) throw fail('size');
        return { parts: parts, size: size };
      });
    });
  }

  return { build: build, _internal: { romfsFiles: romfsFiles } };
});

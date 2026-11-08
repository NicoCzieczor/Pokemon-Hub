/*
 * Extrahiert ausgewählte RomFS-Dateien stückweise aus einer entschlüsselten
 * 3DS/CXI-Datei. Gedacht für sehr große Gen-7-Archive, die nicht komplett in
 * den Arbeitsspeicher geladen werden sollen.
 *
 * Aufruf: node extract-romfs.js <rom.3ds|main.cxi> <ziel> <a/0/8/2> [...]
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Rom = require('../../Bosse/oras-rom.js');

const [romPath, out, ...files] = process.argv.slice(2);
if (!romPath || !out || !files.length) {
  console.error('Aufruf: node extract-romfs.js <rom> <ziel> <romfs-pfad> [...]');
  process.exit(1);
}

const CHUNK = 16 * 1024 * 1024;

(async () => {
  const rom = await Rom.openPath(romPath);
  for (const file of files) {
    const info = rom.stat && rom.stat(file);
    if (!info) throw new Error(`RomFS-Datei fehlt: ${file}`);
    const target = path.join(out, 'romfs', ...file.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const fd = fs.openSync(target, 'w');
    try {
      for (let start = 0; start < info.size; start += CHUNK) {
        const bytes = await rom.range(file, start, Math.min(info.size, start + CHUNK));
        fs.writeSync(fd, bytes);
      }
    } finally {
      fs.closeSync(fd);
    }
    console.log(file, `${(info.size / 1024 / 1024).toFixed(1)} MB`);
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});

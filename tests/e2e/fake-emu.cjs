// Nachgebauter „Emulator“ für live-bridge.mjs: ein Prozess, der Team und Boxen eines Spielstands so im Speicher hält,
// wie es die Spiele tun – das laufende Team (Abstand je Spiel), eine zweite Kopie wie im Speicherblock (ändert sich
// nur beim Speichern), die Boxen und – wie jeder Emulator – die ganze Spielstand-Datei (bei Platin samt der älteren Hälfte
// mit dem vorletzten Team). Der Test ändert den Speicher über Nachrichten; das Hilfsprogramm
// (LiveTest/bridge/PokeHub-Live.cmd) liest ihn von außen.
//   node fake-emu.cjs <Spielstand>      Nachrichten: { write: { where: 'live'|'stale'|'box', off, b64 } }, { zero: { where, off, len } }
const fs = require('node:fs');
const path = require('node:path');
const PtSave = require(path.join(__dirname, '../../SaveViewer/pt-save.js'));

const file = fs.readFileSync(process.argv[2]);
const oras = file.length === 0x76000;
// stored = Box-Teil, stats = wo im Eintrag die Kampfwerte beginnen (ORAS: 344, am echten Azahar nachgemessen)
let party, psize, stored, stride, stats, boxAt, boxLen;
if (oras) { party = 0x14200; psize = 260; stored = 232; stride = 484; stats = 344; boxAt = 0x33000; boxLen = 31 * 30 * 232; }
else {
  const bytes = new Uint8Array(file);
  party = PtSave.generalBlock(bytes).offset + 0xA0; psize = 236; stored = 136; stride = 236; stats = 136;
  boxAt = PtSave.storageBlock(bytes).offset + 4; boxLen = 18 * 30 * 136;
}
const ram = Buffer.alloc(96 * 1024 * 1024);
const AT = { live: 0x2345678, stale: 0x0456780, box: 0x3000010, file: 0x4000000 };
for (let i = 0; i < 6; i++) {
  file.copy(ram, AT.live + i * stride, party + i * psize, party + i * psize + stored);
  file.copy(ram, AT.live + i * stride + stats, party + i * psize + stored, party + (i + 1) * psize);
}
file.copy(ram, AT.stale, party, party + 6 * psize);
file.copy(ram, AT.box, boxAt, boxAt + boxLen);
file.copy(ram, AT.file);
file.fill(0);                                   // nur die Kopien oben sollen im Speicher stehen

process.on('message', m => {
  if (m.write) Buffer.from(m.write.b64, 'base64').copy(ram, AT[m.write.where] + m.write.off);
  if (m.zero) ram.fill(0, AT[m.zero.where] + m.zero.off, AT[m.zero.where] + m.zero.off + m.zero.len);
  process.send({ done: true });
});
process.send({ ready: true, pid: process.pid, stride, psize, stored, stats });
setInterval(() => {}, 1000);

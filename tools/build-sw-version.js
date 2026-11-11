#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SW = path.join(ROOT, 'sw.js');
const SKIP = /^(\.git|\.gitignore|tests\/|tools\/|supabase\/|sw\.js$|Karte\/tiles\/(\d+|in)\/)|\.(md|jar)$|node_modules\//;

function slash(value) {
  return value.split(path.sep).join('/');
}

function walk(folder, files = []) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const absolute = path.join(folder, entry.name);
    const relative = slash(path.relative(ROOT, absolute));
    if (SKIP.test(relative + (entry.isDirectory() ? '/' : ''))) continue;
    if (entry.isDirectory()) walk(absolute, files);
    else if (!SKIP.test(relative)) files.push(relative);
  }
  return files;
}

function contentFiles() {
  try {
    return execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).split('\0').filter(Boolean).filter(file => !SKIP.test(file))
      .filter(file => fs.existsSync(path.join(ROOT, file))).sort();   // gelöscht, aber noch nicht committet: nicht mitzählen
  } catch (_error) {
    return walk(ROOT).sort();
  }
}

function contentHash() {
  const hash = crypto.createHash('sha256');
  for (const file of contentFiles()) {
    hash.update(file, 'utf8');
    hash.update(Buffer.from([0]));
    hash.update(fs.readFileSync(path.join(ROOT, file)));
    hash.update(Buffer.from([0]));
  }
  return hash.digest('hex').slice(0, 10);
}

function storedHash() {
  const match = /^const CONTENT = '([0-9a-f]{10})';/m.exec(fs.readFileSync(SW, 'utf8'));
  if (!match) throw new Error('CONTENT fehlt in sw.js');
  return match[1];
}

function update() {
  let source = fs.readFileSync(SW, 'utf8');
  const version = /^const VERSION = '(\d+)\.(\d+)\.(\d+)';/m.exec(source);
  if (!version) throw new Error('VERSION fehlt in sw.js');
  const next = `${version[1]}.${version[2]}.${Number(version[3]) + 1}`;
  const hash = contentHash();
  source = source
    .replace(/^const VERSION = '[^']+';/m, `const VERSION = '${next}';`)
    .replace(/^const CONTENT = '[0-9a-f]+';/m, `const CONTENT = '${hash}';`);
  fs.writeFileSync(SW, source, 'utf8');
  console.log(`Service Worker ${next} (${hash})`);
}

module.exports = { contentHash, storedHash };
if (require.main === module) update();

// Static site check: every local href/src/srcset resolves to a file, and every
// top-level page (not odyssey) has a title, description, canonical and one <h1>.
// Usage: node scripts/check-site.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';

import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'docs', 'scripts']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

function urlsIn(html) {
  const urls = [];
  for (const m of html.matchAll(/\s(?:href|src)\s*=\s*"([^"]*)"/g)) urls.push(m[1]);
  for (const m of html.matchAll(/\s(?:srcset|imagesrcset)\s*=\s*"([^"]*)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.push(u);
    }
  }
  // url(...) inside inline styles
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) urls.push(m[1]);
  return urls;
}

function isLocal(u) {
  return u && !/^(https?:|mailto:|tel:|data:|#|javascript:|\/\/)/i.test(u);
}

function resolveLocal(file, u) {
  const clean = u.split('#')[0].split('?')[0];
  if (!clean) return null;
  let p = clean.startsWith('/') ? join(ROOT, clean) : join(dirname(file), clean);
  if (clean.endsWith('/')) p = join(p, 'index.html');
  return p;
}

const failures = [];
const files = walk(ROOT);
for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  for (const u of urlsIn(html)) {
    if (!isLocal(u)) continue;
    const p = resolveLocal(file, u);
    if (p && !existsSync(p)) failures.push(`${rel}: missing ${u}`);
  }
  if (rel.startsWith('odyssey/')) continue;
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${rel}: no <title>`);
  if (!/<meta\s+name="description"/.test(html)) failures.push(`${rel}: no meta description`);
  if (!/<link\s+rel="canonical"/.test(html)) failures.push(`${rel}: no canonical`);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) failures.push(`${rel}: ${h1s} <h1> elements`);
}

if (failures.length) {
  console.error(`FAIL (${failures.length})\n` + failures.map((f) => '  ' + f).join('\n'));
  process.exit(1);
}
console.log(`PASS: ${files.length} pages checked`);

// Konvertuje companies.json (APR registar, ključ = matični broj) u SQL za uvoz
// u tabelu company_registry. Transliteruje NazivOpstine iz ćirilice u latinicu.
//
// Upotreba:
//   node scripts/import-companies.mjs /Users/vace/Biznis/infinityplay/companies.json database/company_registry_data.sql
//
// Rezultujući SQL uvezi:
//   • lokalno:  mysql infinityplay_local < database/company_registry_data.sql
//   • Loopia:   phpMyAdmin -> Import (po potrebi gzip: gzip database/company_registry_data.sql)

import { readFileSync, writeFileSync } from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('Upotreba: node scripts/import-companies.mjs <companies.json> <out.sql>');
  process.exit(1);
}

// Srpska ćirilica -> latinica (uklj. digrafe Љ, Њ, Џ i velika slova).
const CYR = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Ђ: 'Đ', Е: 'E', Ж: 'Ž', З: 'Z', И: 'I',
  Ј: 'J', К: 'K', Л: 'L', Љ: 'Lj', М: 'M', Н: 'N', Њ: 'Nj', О: 'O', П: 'P', Р: 'R',
  С: 'S', Т: 'T', Ћ: 'Ć', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'Č', Џ: 'Dž', Ш: 'Š',
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i',
  ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
};

function toLatin(s) {
  let out = '';
  for (const ch of String(s ?? '')) out += CYR[ch] ?? ch;
  return out;
}

// Pretvori "НОВИ БЕОГРАД" -> "Novi Beograd" (transliteruj pa Title Case).
// Prvo slovo svake reči (posle početka, razmaka ili "(") u veliko — bez oslanjanja
// na \b koji ne radi ispravno sa ne-ASCII slovima (č, ž, š…).
function opstinaLatin(s) {
  const lat = toLatin(s).toLowerCase().trim();
  return lat.replace(/(^|[\s(\-\/])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

// Bezbedno za jednorednu SQL string literal vrednost: ukloni kontrolne znakove
// (novi red/tab bi pokvarili red), pa escape-uj backslash i navodnik.
function esc(s) {
  return String(s ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

console.error('Čitam ' + inPath + ' …');
const raw = readFileSync(inPath, 'utf8');
const json = JSON.parse(raw);
const podaci = json.Podaci || {};
const keys = Object.keys(podaci);
console.error(keys.length + ' firmi. Generišem SQL …');

const parts = [];
parts.push('-- Auto-generisano iz companies.json (' + (json.DatumPreseka || '') + ')');
parts.push('SET NAMES utf8mb4;');
parts.push('TRUNCATE TABLE company_registry;');

const BATCH = 1000;
let batch = [];
let count = 0;

function flush() {
  if (!batch.length) return;
  parts.push(
    'INSERT INTO company_registry (maticni_broj, naziv, opstina, status, pravna_forma) VALUES\n' +
      batch.join(',\n') + ';'
  );
  batch = [];
}

for (const mb of keys) {
  // Ključ mora biti 8 cifara; normalizuj (poneki mogu imati vodeće nule izostavljene).
  const mbNorm = String(mb).replace(/\D/g, '').padStart(8, '0');
  if (mbNorm.length !== 8) continue;
  const c = podaci[mb];
  batch.push(
    "('" + mbNorm + "','" + esc(c.PoslovnoIme) + "','" + esc(opstinaLatin(c.NazivOpstine)) +
      "','" + esc(toLatin(c.NazivStatus)) + "','" + esc(toLatin(c.NazivPravneForme)) + "')"
  );
  count++;
  if (batch.length >= BATCH) flush();
}
flush();

writeFileSync(outPath, parts.join('\n') + '\n', 'utf8');
console.error('Upisano ' + count + ' redova u ' + outPath);

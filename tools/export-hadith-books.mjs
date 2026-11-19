#!/usr/bin/env node
/**
 * Writes data/hadith-books.json, the books on the home page's Hadith section,
 * from the app's own list (src/lib/hadithBooksData.ts in the hayya repo, built
 * there from sunnah.com's chapter pages). Run it whenever the app's list changes.
 *
 *   node tools/export-hadith-books.mjs [path-to-hayya-repo]
 *
 * Only what the section shows: each book's name, size and first chapter, with the
 * first few hadiths of it. Node reads the app's TypeScript file directly (Node 22.6
 * or later strips the types).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = resolve(process.argv[2] ?? join(root, '..', 'hayya'));
const { HADITH_CHAPTERS } = await import(pathToFileURL(join(app, 'src/lib/hadithBooksData.ts')).href);

/** The app's names for each book (lib/hadith.ts) and its cover's leather (components/HadithCover.tsx), in the order it shelves them. */
const BOOKS = [
  ['nawawi40', '40 Hadith an-Nawawi', 'الأربعون النووية', 'Gathered by Imam an-Nawawi', '#7a4a1f'],
  ['qudsi40', '40 Hadith Qudsi', 'الأحاديث القدسية', 'Sayings of the Prophet ﷺ that he reported from Allah', '#2c2a62'],
  ['shahwaliullah40', '40 Hadith of Shah Waliullah', 'الأربعون لولي الله الدهلوي', 'Gathered by Shah Waliullah ad-Dihlawi', '#5c2a3a'],
  ['bukhari', 'Sahih al-Bukhari', 'صحيح البخاري', 'Gathered by Imam al-Bukhari', '#6e1d25'],
  ['muslim', 'Sahih Muslim', 'صحيح مسلم', 'Gathered by Imam Muslim', '#1b3158'],
  ['abudawud', 'Sunan Abi Dawud', 'سنن أبي داود', 'Gathered by Imam Abu Dawud', '#1d4b37'],
  ['tirmidhi', 'Jamiʿ at-Tirmidhi', 'جامع الترمذي', 'Gathered by Imam at-Tirmidhi', '#58361c'],
  ['nasai', 'Sunan an-Nasaʾi', 'سنن النسائي', 'Gathered by Imam an-Nasaʾi', '#4b2347'],
  ['ibnmajah', 'Sunan Ibn Majah', 'سنن ابن ماجه', 'Gathered by Imam Ibn Majah', '#1f4a55'],
  ['riyadussalihin', 'Riyad as-Salihin', 'رياض الصالحين', 'Gathered by Imam an-Nawawi', '#3f4d1d'],
  ['adab', 'Al-Adab al-Mufrad', 'الأدب المفرد', 'Gathered by Imam al-Bukhari', '#2f4f4a'],
  ['shamail', 'Ash-Shamaʾil al-Muhammadiyah', 'الشمائل المحمدية', 'Gathered by Imam at-Tirmidhi', '#6a4a14'],
  ['bulugh', 'Bulugh al-Maram', 'بلوغ المرام', 'Gathered by Ibn Hajar al-ʿAsqalani', '#343b5c'],
  ['mishkat', 'Mishkat al-Masabih', 'مشكاة المصابيح', 'Gathered by al-Khatib at-Tabrizi', '#4a1f2c'],
];

/** How many hadiths of the first chapter the section lists to tick. */
const SHOWN = 7;

/** "1-7,9,11a-c,4/1-3" back into one entry per hadith, as lib/hadith's expandRefs does. */
function expand(code) {
  const out = [];
  for (const part of code.split(',')) {
    const letters = /^(\d+)([a-z])-([a-z])$/.exec(part);
    const run = /^((?:[0-9a-z]+\/)?)(\d+)-(\d+)$/.exec(part);
    if (letters) for (let c = letters[2].charCodeAt(0); c <= letters[3].charCodeAt(0); c++) out.push(letters[1] + String.fromCharCode(c));
    else if (run) for (let n = +run[2]; n <= +run[3]; n++) out.push(run[1] + n);
    else if (part) out.push(part);
  }
  return out;
}

/** A hadith's page on sunnah.com and the number it goes by, as lib/hadith's hadithUrl and hadithLabel. */
function hadith(id, ref) {
  const urn = /^u(\d+)=(\d+)$/.exec(ref);
  if (urn) return { n: urn[2], url: `https://sunnah.com/urn/${urn[1]}` };
  if (ref.includes('/')) return { n: ref.slice(ref.lastIndexOf('/') + 1), url: `https://sunnah.com/${id}/${ref}` };
  return { n: ref, url: `https://sunnah.com/${id}:${ref}` };
}

const books = BOOKS.map(([id, title, arabic, by, leather]) => {
  const chapters = HADITH_CHAPTERS[id];
  if (!chapters) throw new Error(`The app has no book ${id}`);
  const [path, en, ar, code] = chapters[0];
  const refs = expand(code);
  return {
    id,
    title,
    arabic,
    by,
    leather,
    hadiths: chapters.reduce((n, c) => n + expand(c[3]).length, 0),
    chapters: chapters.length,
    first: {
      label: path === 'introduction' ? 'Introduction' : path ? `Chapter ${path}` : '',
      en,
      ar,
      size: refs.length,
      shown: refs.slice(0, SHOWN).map((ref) => hadith(id, ref)),
    },
  };
});

writeFileSync(join(root, 'data', 'hadith-books.json'), JSON.stringify({ from: 'hayya src/lib/hadithBooksData.ts', books }, null, 1) + '\n');
console.log(books.map((b) => `${b.id}: ${b.hadiths} hadiths, ${b.chapters} chapters`).join('\n'));

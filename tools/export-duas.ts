/**
 * Writes data/duas.json from the app's own dua library, so the home page lists
 * exactly the duʿās the app holds, word for word, plus the order of each
 * adhkār list for the checklist.
 *
 * Run through the app repo's TypeScript, which is checked out beside this one:
 *
 *   tools/sync-duas.sh [path-to-hayya-repo]
 *
 * The app's source lines join a reference and a remark with a long dash
 * ("Bukhārī 6306 — the best way of asking forgiveness"). The page shows them as
 * two lines, so they are split here rather than shown with the dash.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appRepo = resolve(process.argv[2] ?? `${__dirname}/../../hayya`);
const out = resolve(`${__dirname}/../data/duas.json`);

function splitSource(source: string): { source: string; remark?: string } {
  const at = source.indexOf(' — ');
  if (at < 0) return { source };
  const remark = source.slice(at + 3).trim();
  return { source: source.slice(0, at).trim(), remark: remark.charAt(0).toUpperCase() + remark.slice(1) };
}

async function main() {
  const { duaLibrary, placeLabel } = await import(`${appRepo}/src/lib/duaLibrary`);
  const { adhkarFor } = await import(`${appRepo}/src/lib/adhkarList`);
  const rows = duaLibrary().map(({ dhikr, places }: { dhikr: any; places: string[] }) => ({
    id: dhikr.id,
    title: dhikr.title,
    arabic: dhikr.arabic,
    transliteration: dhikr.transliteration,
    english: dhikr.english,
    repeat: dhikr.repeat,
    ...splitSource(dhikr.source),
    places: places.map((id) => ({ id, label: placeLabel(id) })),
    keywords: dhikr.keywords ?? [],
  }));
  // Each adhkār list in the order the app shows it, for the checklist on the
  // home page. The library above is in the order of the day, which is not the
  // order of any one list.
  const lists = Object.fromEntries(
    (['morning', 'evening', 'night'] as const).map((slot) => [slot, adhkarFor(slot).map((d: { id: string }) => d.id)]),
  );
  writeFileSync(out, `${JSON.stringify({ lists, duas: rows }, null, 1)}\n`);
  console.log(`${rows.length} duas -> ${out}`);
}

main();

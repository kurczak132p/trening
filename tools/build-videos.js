// Łączy tools/videos-*.json w js/videos.js i sprawdza każdy film w YouTube (oEmbed).
// node tools/build-videos.js
const fs = require('fs');
const path = require('path');
const { EXERCISES } = require('../js/exercises.js');

const dir = __dirname;
const all = {};
for (const f of fs.readdirSync(dir).filter(f => /^videos-.*\.json$/.test(f))) {
  Object.assign(all, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

async function check(id) {
  const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
  if (r.status !== 200) return { ok: false, status: r.status };
  const j = await r.json();
  return { ok: true, title: j.title, author: j.author_name };
}

(async () => {
  const problems = [];
  const out = {};
  const needed = [...Object.keys(EXERCISES), 'warmup_general'];
  for (const id of needed) {
    const v = all[id];
    if (!v) { problems.push(`${id}: BRAK FILMU`); continue; }
    const main = await check(v.yt);
    if (!main.ok) { problems.push(`${id}: film ${v.yt} niedostępny (HTTP ${main.status})`); continue; }
    if (main.title !== v.title) problems.push(`${id}: tytuł się różni: "${main.title}"`);
    const entry = { yt: v.yt, channel: main.author.trim(), lang: v.lang, seconds: v.seconds || null, start: v.start || 0 };
    if (v.backup) {
      const b = await check(v.backup.yt);
      if (b.ok) entry.backup = { yt: v.backup.yt, lang: v.backup.lang || null };
      else problems.push(`${id}: zapasowy ${v.backup.yt} niedostępny (pominięty)`);
    }
    out[id] = entry;
    console.log('✓', id.padEnd(22), v.lang, main.author, '–', main.title.slice(0, 60));
  }
  const extra = Object.keys(all).filter(k => !needed.includes(k));
  if (extra.length) problems.push('Nadmiarowe wpisy: ' + extra.join(', '));
  fs.writeFileSync(path.join(dir, '..', 'js', 'videos.js'),
    '// Wygenerowane przez tools/build-videos.js – filmy sprawdzone w YouTube.\nconst VIDEOS = ' + JSON.stringify(out, null, 1) + ';\n');
  console.log(`\nZapisano ${Object.keys(out).length}/${needed.length} filmów.`);
  if (problems.length) { console.log('\nUWAGI:\n' + problems.join('\n')); process.exitCode = 1; }
})();

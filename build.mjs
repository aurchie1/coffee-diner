import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const read = p => readFileSync(p, 'utf8');
const esc = s => s.replace(/<\/(script|style)/gi, '<\\/$1');
const sharedJs = readdirSync('src/shared').filter(f => f.endsWith('.js')).sort();
const built = [];

mkdirSync('dist', { recursive: true });
for (const game of readdirSync('src/games')) {
  const dir = join('src/games', game);
  const { id, title, scripts, wip } = JSON.parse(read(join(dir, 'manifest.json')));

  const css = read('src/shared/shared.css') + '\n' + read(join(dir, 'styles.css'));
  const js = [
    `'use strict';\nconst GAME_ID = ${JSON.stringify(id)};`,
    ...sharedJs.map(f => read(join('src/shared', f))),
    ...scripts.map(f => read(join(dir, f)))
  ].join(';\n');

  // function replacers: JS contains "$&" and "${" which break string replacements
  const html = read(join(dir, 'index.html'))
    .replace(/[ \t]*<link[^>]*rel="stylesheet"[^>]*>\n?/g, '')
    .replace(/[ \t]*<script[^>]*\bsrc=[^>]*><\/script>\n?/g, '')
    .replace('</head>', () => `<style>${esc(css)}</style>\n</head>`)
    .replace('</body>', () => `<script>${esc(js)}</script>\n</body>`);

  if (/\bsrc="(?!data:)|href="https?:|<link[^>]*stylesheet/.test(html)) {
    throw new Error(`${game}: external reference left in output`);
  }

  writeFileSync(join('dist', `${game}.html`), html);
  if (!wip) built.push({ id: game, title: title || game });
  console.log(`${game}.html  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB${wip ? ' (hidden WIP)' : ''}`);
}

const h = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const hub = JSON.parse(read('src/hub.json'));
const cards = [
  ...built.map(({ id, title }) => `<a class="card" href="${h(id)}.html"><span class="tag play">Play</span><h2>${h(title)}</h2><p>${h(hub.blurbs?.[id] ?? '')}</p></a>`),
  ...(hub.wip ?? []).map(({ title, blurb }) => `<div class="card wip"><span class="tag">WIP</span><h2>${h(title)}</h2><p>${h(blurb)}</p></div>`)
].join('\n');

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(hub.title)}</title>
<style>
body{margin:0;padding:24px;background:#302238;color:#fff0cc;font:16px/1.4 system-ui,sans-serif}
h1{margin:0 0 4px}
.sub{color:#ffcf78;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.card{display:block;padding:18px;border-radius:14px;background:#674557;border:3px solid #b8816d;color:inherit;text-decoration:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
a.card:active{transform:translateY(3px)}
.card h2{margin:10px 0 6px}
.card p{margin:0}
.card.wip{opacity:.6;border-style:dashed}
.tag{display:inline-block;padding:2px 10px;border-radius:99px;background:#382835;font-size:13px}
.tag.play{background:#aee0a1;color:#302238}
</style>
</head>
<body>
<h1>${h(hub.title)}</h1>
<p class="sub">Pick an experience. WIP titles are still being built.</p>
<div class="grid">
${cards}
</div>
</body>
</html>
`;

writeFileSync(join('dist', 'index.html'), page);
console.log(`index.html  hub, ${built.length} playable, ${(hub.wip ?? []).length} WIP`);

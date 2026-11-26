import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const read = p => readFileSync(p, 'utf8');
const esc = s => s.replace(/<\/(script|style)/gi, '<\\/$1');
const sharedJs = readdirSync('src/shared').filter(f => f.endsWith('.js')).sort();

mkdirSync('dist', { recursive: true });
for (const game of readdirSync('src/games')) {
  const dir = join('src/games', game);
  const { id, scripts } = JSON.parse(read(join(dir, 'manifest.json')));

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
  console.log(`${game}.html  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
}

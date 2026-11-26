# Coffee Diner

Original, asset-free JavaScript time-management game with diner and barista modes, drag-and-drop, difficulty sliders, endless mode, and local saves.

## Play locally
Open `index.html` (redirects to `src/games/coffee/index.html`) in a modern browser. No install needed.

## Build single-file games
```bash
node build.mjs
```
Writes one self-contained, offline `.html` file per game to `dist/` (for example `dist/coffee.html`). These are the files to share or email.

## Layout
```text
src/shared/            shared CSS and JS, loaded before each game
src/games/<game>/      index.html (dev), styles.css, scripts, manifest.json
build.mjs              inlines CSS and JS into dist/<game>.html
.github/workflows/     build on push, release on v*.*.* tags
```
A game's `manifest.json` lists its script load order. Scripts share one global scope, so keep that order.

## Release
```bash
git tag v1.0.0
git push origin v1.0.0
```
The workflow builds `dist/*.html` and attaches them to a GitHub Release.

## Saves
All progress, settings, and the active shift are stored under one `localStorage` key, `coffee-diner-save`. Saves are browser-local.

## Status
Not yet browser-playtested. Test both modes, drag-and-drop, resume, endless mode, and `dist/coffee.html` opened directly from disk.

// Tea Garden scaffold. TODO: garden plots, real-time growth, harvest, blending, selling.
const KEY = 'save:' + GAME_ID;
const S = { leaves: 0 };

function load() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  S.leaves = num(r && r.leaves, 0, 1e12, 0);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}

load();

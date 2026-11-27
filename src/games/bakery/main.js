// Bakery Rush scaffold. TODO: orders, oven timers, decorating, shift loop, upgrades.
const KEY = 'save:' + GAME_ID;
const S = { coins: 0 };

function load() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  S.coins = num(r && r.coins, 0, 1e12, 0);
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}

load();

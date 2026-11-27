const GENS = [
  { id: 'grinder', name: 'Grinder', base: 15, rate: 1 },
  { id: 'roaster', name: 'Roaster', base: 100, rate: 8 },
  { id: 'cafe', name: 'Cafe', base: 1100, rate: 47 }
];
const KEY = 'save:' + GAME_ID;
const S = { beans: 0, power: 1, owned: {} };
let last = Date.now();

function load() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  r = r && typeof r === 'object' ? r : {};
  S.beans = num(r.beans, 0, 1e300, 0);
  S.power = num(r.power, 1, 1e9, 1);
  for (const g of GENS) S.owned[g.id] = num(r.owned && r.owned[g.id], 0, 1e6, 0);
  const away = num((Date.now() - num(r.t, 0, Date.now(), Date.now())) / 1000, 0, 28800, 0);
  const gain = away * rate();
  if (gain >= 1) {
    S.beans += gain;
    $('notice').textContent = 'Welcome back! You earned ' + fmt(gain) + ' beans while away.';
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ beans: S.beans, power: S.power, owned: S.owned, t: Date.now() })); } catch (e) {}
}
function rate() { return GENS.reduce((a, g) => a + S.owned[g.id] * g.rate, 0); }
function cost(g) { return Math.ceil(g.base * Math.pow(1.15, S.owned[g.id])); }
function powerCost() { return Math.ceil(50 * Math.pow(2.5, S.power - 1)); }
function fmt(n) {
  if (n < 1000) return String(Math.floor(n));
  const u = ['K', 'M', 'B', 'T'];
  let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + u[i];
}

function buildShop() {
  const shop = $('shop');
  shop.innerHTML = '';
  const p = document.createElement('button');
  p.dataset.buy = 'power';
  shop.appendChild(p);
  for (const g of GENS) {
    const b = document.createElement('button');
    b.dataset.buy = g.id;
    shop.appendChild(b);
  }
}
function render() {
  $('beans').textContent = fmt(S.beans);
  $('rate').textContent = fmt(rate());
  $('power').textContent = fmt(S.power);
  for (const b of $('shop').children) {
    if (b.dataset.buy === 'power') {
      b.textContent = 'Better scoop (+1 per tap) — ' + fmt(powerCost()) + ' beans';
      b.disabled = S.beans < powerCost();
    } else {
      const g = GENS.find(x => x.id === b.dataset.buy);
      b.textContent = g.name + ' x' + S.owned[g.id] + ' (+' + g.rate + '/sec) — ' + fmt(cost(g)) + ' beans';
      b.disabled = S.beans < cost(g);
    }
  }
}

$('tap').addEventListener('click', () => { S.beans += S.power; render(); });
$('shop').addEventListener('click', e => {
  const id = e.target.dataset && e.target.dataset.buy;
  if (!id) return;
  if (id === 'power') {
    if (S.beans >= powerCost()) { S.beans -= powerCost(); S.power++; }
  } else {
    const g = GENS.find(x => x.id === id);
    if (g && S.beans >= cost(g)) { S.beans -= cost(g); S.owned[id]++; }
  }
  save();
  render();
});
$('reset').addEventListener('click', () => {
  if (!confirm('Reset all Bean Counter progress?')) return;
  try { localStorage.removeItem(KEY); } catch (e) {}
  S.beans = 0;
  S.power = 1;
  for (const g of GENS) S.owned[g.id] = 0;
  $('notice').textContent = '';
  render();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

load();
buildShop();
render();
setInterval(() => {
  const now = Date.now();
  S.beans += rate() * Math.min((now - last) / 1000, 5);
  last = now;
  render();
}, 200);
setInterval(save, 5000);

const UPS = [
  { id: 'handle', name: 'Longer handle', desc: '+1 coin per turn', base: 10, g: 1.6 },
  { id: 'gears', name: 'Gear ratio', desc: '+25% coins per turn', base: 40, g: 1.8 },
  { id: 'wheel', name: 'Water wheel', desc: '+0.2 auto turns/sec', base: 25, g: 1.35 },
  { id: 'steam', name: 'Steam engine', desc: '+1 auto turn/sec', base: 300, g: 1.4 },
  { id: 'belt', name: 'Conveyor belt', desc: '+50% coins per turn', base: 1000, g: 2 }
];
const KEY = 'save:' + GAME_ID;
const TAU = Math.PI * 2;
const S = { coins: 0, turns: 0, owned: {} };
const cv = $('machine');
const cx = cv.getContext('2d');
let ang = 0, drag = false, lastA = 0, last = performance.now();

function lvl(id) { return S.owned[id] || 0; }
function cpt() { return (1 + lvl('handle')) * (1 + 0.25 * lvl('gears')) * (1 + 0.5 * lvl('belt')); }
function autoRate() { return 0.2 * lvl('wheel') + lvl('steam'); }
function cost(u) { return Math.ceil(u.base * Math.pow(u.g, lvl(u.id))); }
function addTurns(t) { S.turns += t; S.coins += t * cpt(); }
function fmt(n) {
  if (n < 1000) return n < 10 ? n.toFixed(1) : String(Math.floor(n));
  const u = ['K', 'M', 'B', 'T'];
  let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return n.toFixed(2) + u[i];
}

function load() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  r = r && typeof r === 'object' ? r : {};
  S.coins = num(r.coins, 0, 1e300, 0);
  S.turns = num(r.turns, 0, 1e300, 0);
  for (const u of UPS) S.owned[u.id] = num(r.owned && r.owned[u.id], 0, 1e4, 0);
  const away = num((Date.now() - num(r.t, 0, Date.now(), Date.now())) / 1000, 0, 14400, 0);
  const t = away * autoRate();
  if (t * cpt() >= 1) {
    addTurns(t);
    $('notice').textContent = 'Welcome back! The machine earned ' + fmt(t * cpt()) + ' coins while you were away.';
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ coins: S.coins, turns: S.turns, owned: S.owned, t: Date.now() })); } catch (e) {}
}

function buildShop() {
  const shop = $('shop');
  shop.innerHTML = '';
  for (const u of UPS) {
    const b = document.createElement('button');
    b.dataset.buy = u.id;
    shop.appendChild(b);
  }
}
function renderText() {
  $('coins').textContent = fmt(S.coins);
  $('cpt').textContent = fmt(cpt());
  $('auto').textContent = autoRate().toFixed(1);
  $('sweets').textContent = fmt(Math.floor(S.turns));
  for (const b of $('shop').children) {
    const u = UPS.find(x => x.id === b.dataset.buy);
    b.textContent = u.name + ' (lv ' + lvl(u.id) + ', ' + u.desc + ') — ' + fmt(cost(u)) + ' coins';
    b.disabled = S.coins < cost(u);
  }
}

function draw() {
  cx.clearRect(0, 0, 320, 320);
  const w = Math.min(lvl('wheel'), 6), s = Math.min(lvl('steam'), 4), bl = Math.min(lvl('belt'), 6);
  for (let i = 0; i < w; i++) {
    cx.strokeStyle = '#7fc4ff'; cx.lineWidth = 3;
    cx.beginPath(); cx.arc(30 + i * 30, 290, 12, 0, TAU); cx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = ang * 2 + k * TAU / 4;
      cx.beginPath(); cx.moveTo(30 + i * 30, 290); cx.lineTo(30 + i * 30 + Math.cos(a) * 12, 290 + Math.sin(a) * 12); cx.stroke();
    }
  }
  for (let i = 0; i < s; i++) {
    cx.fillStyle = '#9aa3ad'; cx.fillRect(220 + i * 22, 250 - (i % 2) * 6, 18, 36);
    cx.fillStyle = '#e8e8e8'; cx.beginPath(); cx.arc(229 + i * 22, 244 - (i % 2) * 6 - (Math.sin(ang * 3 + i) + 1) * 5, 5, 0, TAU); cx.fill();
  }
  for (let i = 0; i < bl; i++) {
    cx.fillStyle = '#674557'; cx.fillRect(20, 30 + i * 8, 80, 5);
    cx.fillStyle = '#ffcf78'; cx.fillRect(20 + ((ang * 20 + i * 17) % 76), 30 + i * 8, 4, 5);
  }
  cx.save();
  cx.translate(160, 150);
  cx.rotate(ang);
  cx.fillStyle = '#b8816d';
  cx.beginPath(); cx.arc(0, 0, 62, 0, TAU); cx.fill();
  cx.fillStyle = '#674557';
  for (let k = 0; k < 10; k++) { cx.save(); cx.rotate(k * TAU / 10); cx.fillRect(-7, -76, 14, 18); cx.restore(); }
  cx.fillStyle = '#382835'; cx.beginPath(); cx.arc(0, 0, 14, 0, TAU); cx.fill();
  const hl = 62 + lvl('handle') * 2;
  cx.strokeStyle = '#ffcf78'; cx.lineWidth = 8; cx.lineCap = 'round';
  cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(Math.min(hl, 100), 0); cx.stroke();
  cx.fillStyle = '#ff7a7a'; cx.beginPath(); cx.arc(Math.min(hl, 100), 0, 11, 0, TAU); cx.fill();
  cx.restore();
}

function pt(e) {
  const r = cv.getBoundingClientRect();
  return Math.atan2((e.clientY - r.top) / r.height * 320 - 150, (e.clientX - r.left) / r.width * 320 - 160);
}
cv.addEventListener('pointerdown', e => { drag = true; lastA = pt(e); try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const a = pt(e);
  let d = a - lastA;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  lastA = a;
  ang += Math.abs(d);
  addTurns(Math.abs(d) / TAU);
});
for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => { drag = false; });
$('turn').addEventListener('click', () => { ang += TAU / 4; addTurns(0.25); });
$('shop').addEventListener('click', e => {
  const u = UPS.find(x => x.id === (e.target.dataset && e.target.dataset.buy));
  if (!u || S.coins < cost(u)) return;
  S.coins -= cost(u);
  S.owned[u.id] = lvl(u.id) + 1;
  save();
});
$('reset').addEventListener('click', () => {
  if (!confirm('Reset all Wonder Works progress?')) return;
  try { localStorage.removeItem(KEY); } catch (e) {}
  S.coins = 0; S.turns = 0;
  for (const u of UPS) S.owned[u.id] = 0;
  $('notice').textContent = '';
});
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

load();
buildShop();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1);
  last = now;
  const a = autoRate() * dt;
  if (a > 0) { ang += a * TAU; addTurns(a); }
  renderText();
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(save, 5000);

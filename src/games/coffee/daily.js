'use strict';

(() => {
  const BONUS = 20;
  const today = () => { const n = new Date(); return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`; };
  const goalFor = () => Math.min(40, 8 + save.day * 2);
  const valid = d => d && typeof d.date === 'string' && Number.isFinite(d.served) && d.served >= 0 && Number.isFinite(d.goal) && d.goal > 0;

  function ensure() {
    const date = today();
    if (!valid(bundle.daily) || bundle.daily.date !== date) {
      bundle.daily = { date, served: 0, goal: goalFor(), paid: false };
      writeBundle();
    }
    return bundle.daily;
  }

  const menuLine = document.createElement('p');
  const playLine = document.createElement('p');
  playLine.className = 'muted';
  $('career').after(menuLine);
  $('stats').after(playLine);

  let shown = '';
  function show() {
    const d = ensure();
    const text = d.served >= d.goal
      ? `Daily goal complete: ${d.served}/${d.goal} guests served today ✓`
      : `Daily goal: ${d.served}/${d.goal} guests served today`;
    if (text !== shown) { shown = text; menuLine.textContent = text; playLine.textContent = text; }
  }

  let seenG = null;
  let seen = 0;
  function sync() {
    if (g !== seenG) { seenG = g; seen = g ? g.served : 0; }
    if (!g) { show(); return; }
    const gain = g.served - seen;
    if (gain > 0) {
      seen = g.served;
      const d = ensure();
      const before = d.served;
      d.served += gain;
      if (before < d.goal && d.served >= d.goal && !d.paid) {
        d.paid = true;
        g.money += BONUS;
        say(`Daily goal reached! +$${BONUS} bonus`);
        writeBundle();
      }
    }
    show();
  }

  const baseTick = tick;
  tick = function (dt) { sync(); baseTick(dt); sync(); };
  sync();
})();

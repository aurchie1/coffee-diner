'use strict';

(() => {
  const BASE = { name: 'Waiter', role: 'waiter', reaction: 1.5, accuracy: 0.9, threshold: 0.5, cut: 0, fee: 0 };
  const PRIORITY = { pay: 0, ready: 1, dirty: 2, ordered: 3, seated: 4 };

  class AIWaiter {
    constructor(cfg = {}) {
      Object.assign(this, BASE, cfg);
      this.cool = this.reaction;
      this.score = 0;
      this.handled = 0;
    }

    update(game, dt) {
      this.cool -= dt;
      if (this.cool > 0) return;
      this.cool = this.reaction * (0.8 + Math.random() * 0.4);
      const job = this.nextJob(game);
      if (!job) return;
      if (Math.random() > this.accuracy) { job.customer.p -= 2; return; }
      job.run();
    }

    nextJob(game) {
      let best = null;
      game.tables.forEach((c, i) => {
        if (!c || c.owner !== 'waiter' || !(c.state in PRIORITY)) return;
        const rank = PRIORITY[c.state] * 1000 + c.p;
        if (!best || rank < best.rank) best = { rank, customer: c, run: () => this.advance(game, c, i) };
      });
      if (best) return best;
      const free = game.tables.indexOf(null);
      if (free < 0) return null;
      const pick = game.wait
        .filter(c => c.p < this.threshold * (c.maxP || 60))
        .sort((a, b) => a.p - b.p)[0];
      if (!pick) return null;
      return {
        customer: pick,
        run: () => {
          const at = game.wait.indexOf(pick);
          if (at < 0 || game.tables[free]) return;
          game.wait.splice(at, 1);
          pick.state = 'seated';
          pick.owner = 'waiter';
          game.tables[free] = pick;
          this.handled++;
        }
      };
    }

    advance(game, c, i) {
      if (c.state === 'seated') {
        c.state = 'ordered';
        c.food = foods[Math.floor(Math.random() * foods.length)];
      } else if (c.state === 'ordered') {
        c.state = 'cooking';
        c.cook = Math.max(1.5, 5 - save.level * 0.65);
      } else if (c.state === 'ready') {
        c.state = 'eating';
        c.eat = 4;
      } else if (c.state === 'pay') {
        const pay = 12 + Math.max(0, Math.ceil(c.p / 6));
        c.state = 'dirty';
        this.onPaid(game, pay);
      } else if (c.state === 'dirty') {
        game.tables[i] = null;
      }
    }

    onPaid(game, pay) {
      const mine = Math.round(pay * (1 - this.cut));
      game.money += mine;
      if (mine > 0) game.served++;
      this.score += pay - mine;
    }

    status() { return `${this.name}: ${this.handled} guests, $${this.score}`; }
  }

  class HelperWaiter extends AIWaiter {
    constructor(cfg = {}) {
      super({ name: 'Sam', role: 'helper', reaction: 1.6, accuracy: 0.9, threshold: 0.5, cut: 0.25, fee: 10, ...cfg });
    }
    status() { return `Helper ${this.name}: ${this.handled} guests, kept $${this.score}`; }
  }

  class RivalWaiter extends AIWaiter {
    constructor(cfg = {}) {
      super({ name: 'Dot', role: 'rival', reaction: 1.2, accuracy: 0.95, threshold: 0.7, cut: 1, fee: 0, ...cfg });
    }
    status() { return `Rival ${this.name}: ${this.handled} guests, earned $${this.score}`; }
  }

  const makeWaiter = kind => kind === 'helper' ? new HelperWaiter() : kind === 'rival' ? new RivalWaiter() : null;
  let aiWaiter = null;

  const baseStart = start;
  start = function (mode) {
    baseStart(mode);
    aiWaiter = g && mode === 'diner' ? makeWaiter(settings.waiter) : null;
  };

  const baseTick = tick;
  tick = function (dt) {
    baseTick(dt);
    if (g && !g.paused && aiWaiter && g.mode === 'diner') aiWaiter.update(g, dt);
  };

  const baseRender = render;
  render = function () {
    baseRender();
    if (!g || !aiWaiter) return;
    const el = $('stats');
    el.textContent = el.textContent.split(' \u2016 ')[0] + ' \u2016 ' + aiWaiter.status();
  };

  const baseFinish = finish;
  finish = function () {
    const had = !!g;
    const w = aiWaiter;
    baseFinish();
    if (!had || !w) return;
    aiWaiter = null;
    save.bank = Math.max(0, save.bank - w.fee);
    persist();
    $('resultText').textContent += ` ${w.status()}.` + (w.fee ? ` Fee paid: $${w.fee}.` : '');
  };
  $('end').onclick = finish;

  const label = document.createElement('label');
  label.textContent = 'Diner waiter: ';
  const select = document.createElement('select');
  for (const [value, text] of [['none', 'None'], ['helper', 'Helper (Sam)'], ['rival', 'Rival (Dot)']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  settings.waiter = ['none', 'helper', 'rival'].includes(bundle.settings?.waiter) ? bundle.settings.waiter : 'none';
  select.value = settings.waiter;
  select.onchange = () => { settings.waiter = select.value; persist(); };
  label.append(select);
  $('menu').querySelector('.row').before(label);
})();

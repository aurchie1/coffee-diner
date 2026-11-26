'use strict';

(() => {
  let drag = null;
  let blockClickUntil = 0;
  const resume = document.createElement('button');
  resume.textContent = 'Resume saved shift';
  $('menu').querySelector('.row').append(resume);
  const status = document.createElement('p');
  status.className = 'muted';
  $('menu').append(status);
  const help = document.createElement('p');
  help.textContent = 'Drag guests to empty tables, ready meals to their matching tables, ingredients into the cup, and the cup to a coffee guest. Click controls also work. Shifts autosave locally every second.';
  $('play').prepend(help);
  const waiting = document.createElement('div');
  waiting.className = 'row';
  $('waiting').after(waiting);
  const style = document.createElement('style');
  style.textContent = '[data-drag],#cup{touch-action:none;user-select:none;cursor:grab}.drag-ghost{position:fixed;z-index:1000;pointer-events:none;background:#ffcf78;color:#302238;padding:12px;border-radius:12px;opacity:.9}.drop-target{outline:4px dashed #ffcf78!important}';
  document.head.append(style);

  function read() {
    try {
      if (!bundle.shift) return null;
      const state = structuredClone(bundle.shift);
      const number = value => Number.isFinite(value) && value >= 0;
      state.endless = state.endless === true;
      if (!number(state.maxLost)) state.maxLost = 5;
      if (!['diner', 'coffee'].includes(state.mode) || !number(state.time) || state.time > 3600
          || (!state.endless && (state.time <= 0 || state.time > 300))) return null;
      if (!['money', 'served', 'lost', 'target', 'spawn'].every(field => number(state[field]))) return null;
      if (!Array.isArray(state.tables) || state.tables.length !== 6 || !Array.isArray(state.wait) || state.wait.length > 5 || !Array.isArray(state.queue) || state.queue.length > 5) return null;
      if (!Array.isArray(state.mix) || state.mix.length > 6 || !state.mix.every(item => ['Espresso','Water','Milk','Foam','Chocolate','Vanilla'].includes(item))) return null;
      const people = [...state.wait, ...state.queue, ...state.tables.filter(Boolean)];
      const ids = new Set();
      for (const customer of people) {
        if (!customer || !Number.isSafeInteger(customer.id) || customer.id < 1 || ids.has(customer.id) || !Number.isFinite(customer.p) || !colors.includes(customer.skin)) return null;
        ids.add(customer.id);
        const recipe = recipes.find(recipe => recipe.name === customer.recipe?.name);
        if (!recipe) return null;
        customer.recipe = recipe;
      }
      for (const customer of state.tables.filter(Boolean)) {
        if (!['seated','ordered','cooking','ready','eating','pay','dirty'].includes(customer.state)) return null;
        if (customer.state !== 'seated' && customer.state !== 'dirty' && !foods.includes(customer.food)) return null;
        if (customer.state === 'cooking' && !Number.isFinite(customer.cook)) return null;
        if (customer.state === 'eating' && !Number.isFinite(customer.eat)) return null;
      }
      state.selected = state.queue.some(customer => customer.id === state.selected) ? state.selected : state.queue[0]?.id ?? null;
      return state;
    } catch { return null; }
  }

  function checkpoint() {
    bundle.shift = g;
    status.textContent = writeBundle()
      ? 'Progress saved locally in this browser.'
      : 'Browser storage unavailable: progress cannot be saved.';
    resume.disabled = !read();
  }

  resume.disabled = !read();
  status.textContent = 'Saves stay in this browser; clearing browser data removes them.';
  resume.onclick = () => {
    const state = read();
    if (!state) { resume.disabled = true; return; }
    start(state.mode);
    g = state;
    g.paused = true;
    uid = Math.max(uid, ...[...g.wait, ...g.queue, ...g.tables.filter(Boolean)].map(customer => customer.id));
    $('pause').textContent = 'Resume';
    render();
    say('Saved shift restored and paused. Press Resume.');
  };

  const originalRender = render;
  render = function () {
    if (drag) return;
    originalRender();
    if (!g) return;
    waiting.innerHTML = '';
    for (const customer of g.wait) {
      const button = document.createElement('button');
      button.textContent = `Guest ${customer.id}`;
      button.dataset.drag = 'guest';
      button.dataset.id = customer.id;
      button.disabled = g.paused;
      waiting.append(button);
    }
    for (const [index, customer] of g.tables.entries()) {
      if (customer?.state !== 'ready') continue;
      const button = document.createElement('button');
      button.textContent = `Ready: ${customer.food} · Table ${index + 1}`;
      button.dataset.drag = 'meal';
      button.dataset.id = index;
      button.disabled = g.paused;
      button.onclick = () => table(index);
      $('kitchen').append(button);
    }
    $('ingredients').querySelectorAll('button').forEach(button => {
      button.dataset.drag = 'ingredient';
      button.dataset.id = button.textContent;
    });
  };
  const originalTick = tick;
  tick = function (dt) { if (!drag) originalTick(dt); };
  const originalFinish = finish;
  finish = function () { originalFinish(); checkpoint(); };
  $('end').onclick = finish;

  function targetAt(x, y) {
    const element = document.elementFromPoint(x, y);
    if (!element || !g || g.paused) return null;
    if (drag.kind === 'guest' || drag.kind === 'meal') {
      const target = element.closest('[data-table]');
      if (!target) return null;
      const index = Number(target.dataset.table);
      if (drag.kind === 'guest' && !g.tables[index] && g.wait.some(customer => customer.id === Number(drag.id))) return target;
      if (drag.kind === 'meal' && index === Number(drag.id) && g.tables[index]?.state === 'ready') return target;
    }
    if (drag.kind === 'ingredient' && g.mix.length < 6) return element.closest('#cup');
    if (drag.kind === 'cup' && g.mix.length) return element.closest('[data-customer]');
    return null;
  }

  function cancel() {
    if (!drag) return;
    drag.target?.classList.remove('drop-target');
    drag.ghost?.remove();
    if (drag.active) blockClickUntil = performance.now() + 500;
    drag = null;
    render();
  }

  document.addEventListener('pointerdown', event => {
    if (drag || !g || g.paused || !event.isPrimary || event.button !== 0) return;
    const source = event.target.closest('[data-drag],#cup');
    if (!source || source.disabled) return;
    drag = { kind: source.dataset.drag || 'cup', id: source.dataset.id, pointer: event.pointerId, x: event.clientX, y: event.clientY, label: source.id === 'cup' ? 'Coffee cup' : source.textContent, active: false };
  });
  document.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!drag.active && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
    drag.active = true;
    event.preventDefault();
    if (!drag.ghost) {
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'drag-ghost';
      drag.ghost.textContent = drag.label;
      document.body.append(drag.ghost);
    }
    drag.ghost.style.left = event.clientX + 12 + 'px';
    drag.ghost.style.top = event.clientY + 12 + 'px';
    drag.target?.classList.remove('drop-target');
    drag.target = targetAt(event.clientX, event.clientY);
    drag.target?.classList.add('drop-target');
  }, { passive: false });
  document.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const active = drag.active;
    const target = active ? targetAt(event.clientX, event.clientY) : null;
    const { kind, id } = drag;
    cancel();
    if (!target || !g || g.paused) return;
    if (kind === 'guest') {
      const position = g.wait.findIndex(customer => customer.id === Number(id));
      if (position >= 0) { g.wait.unshift(g.wait.splice(position, 1)[0]); table(Number(target.dataset.table)); }
    } else if (kind === 'meal') table(Number(id));
    else if (kind === 'ingredient') { g.mix.push(id); render(); }
    else if (kind === 'cup') { g.selected = Number(target.dataset.customer); serve(); }
    checkpoint();
  });
  document.addEventListener('pointercancel', cancel);
  window.addEventListener('blur', cancel);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
  document.addEventListener('click', event => {
    if (performance.now() < blockClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancel(); checkpoint(); } });
  window.addEventListener('pagehide', checkpoint);
  setInterval(checkpoint, 1000);
})();

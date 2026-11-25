'use strict';

const $ = id => document.getElementById(id);
let save = { day: 1, bank: 0, level: 0, best: 0 };
try {
  const stored = JSON.parse(localStorage.getItem('coffee-diner-v1'));
  if (stored && typeof stored === 'object') {
    for (const key of Object.keys(save)) {
      if (Number.isFinite(stored[key]) && stored[key] >= 0) save[key] = Math.floor(stored[key]);
    }
  }
  save.day = Math.max(1, save.day);
  save.level = Math.min(5, save.level);
} catch {}

const recipes = [
  { name: 'Espresso', parts: ['Espresso'] },
  { name: 'Americano', parts: ['Espresso', 'Water'] },
  { name: 'Latte', parts: ['Espresso', 'Milk'] },
  { name: 'Cappuccino', parts: ['Espresso', 'Milk', 'Foam'] },
  { name: 'Mocha', parts: ['Espresso', 'Milk', 'Chocolate'] },
  { name: 'Vanilla latte', parts: ['Espresso', 'Milk', 'Vanilla'] }
];
const foods = ['Pancakes', 'Burger', 'Pie', 'Grilled cheese'];
const colors = ['#dfab83', '#9f6347', '#f4c6a0', '#ba815b'];
let g = null;
let uid = 0;
let last = performance.now();
let paint = 0;
let audio = null;
let sound = false;

function persist() {
  try { localStorage.setItem('coffee-diner-v1', JSON.stringify(save)); } catch {}
}

function home() {
  g = null;
  $('menu').hidden = false;
  $('play').hidden = true;
  $('result').hidden = true;
  $('career').innerHTML = `<p>Day ${save.day} · Wallet $${save.bank} · Best shift $${save.best} · Equipment ${save.level}/5</p>`;
  $('upgrade').textContent = save.level === 5 ? 'Equipment maxed' : `Upgrade equipment: $${cost()}`;
  $('upgrade').disabled = save.level === 5 || save.bank < cost();
}

function cost() { return 60 + save.level * 40; }

function beep(good = true) {
  if (!sound || !audio) return;
  try {
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.frequency.value = good ? 660 : 180;
    volume.gain.setValueAtTime(.04, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .12);
    oscillator.start();
    oscillator.stop(audio.currentTime + .13);
  } catch {}
}

function say(text, good = true) {
  $('notice').textContent = text;
  beep(good);
}

function person() {
  return {
    id: ++uid,
    p: Math.max(22, 43 - Math.min(save.day, 15)) + save.level * 3,
    skin: colors[Math.floor(Math.random() * colors.length)],
    recipe: recipes[Math.floor(Math.random() * recipes.length)]
  };
}

function start(mode) {
  g = {
    mode, time: 90, money: 0, served: 0, lost: 0,
    target: 80 + save.day * 20, paused: false, spawn: 1,
    wait: [], tables: Array(6).fill(null), queue: [], selected: null, mix: []
  };
  $('menu').hidden = true;
  $('result').hidden = true;
  $('play').hidden = false;
  $('diner').hidden = mode !== 'diner';
  $('coffee').hidden = mode !== 'coffee';
  $('modeTitle').textContent = mode === 'diner' ? 'Diner shift' : 'Coffee bar shift';
  $('pause').textContent = 'Pause';
  $('notice').textContent = 'Doors open!';
  last = performance.now();
  arrive();
  arrive();
  render();
}

function arrive() {
  const customer = person();
  if (g.mode === 'diner') {
    if (g.wait.length < 5) g.wait.push(customer);
    else g.lost++;
  } else if (g.queue.length < 5) {
    g.queue.push(customer);
    if (g.selected === null) g.selected = customer.id;
  } else g.lost++;
}

function finish() {
  if (!g) return;
  const won = g.money >= g.target;
  save.bank += g.money;
  save.best = Math.max(save.best, g.money);
  if (won) save.day++;
  persist();
  $('play').hidden = true;
  $('result').hidden = false;
  $('resultTitle').textContent = won ? 'Shift target reached!' : 'Shift complete — try again';
  $('resultText').textContent = `Earned $${g.money} / $${g.target} target. Served ${g.served} guests; ${g.lost} left. Earnings added to your wallet.`;
  g = null;
}

function face(customer) {
  return `<span class="face" style="--skin:${customer.skin}" aria-hidden="true"></span>`;
}

function meter(customer) {
  const percent = Math.max(0, Math.min(100, customer.p / 60 * 100));
  const color = customer.p < 12 ? '#ff817a' : '#aee0a1';
  return `<div class="meter" aria-label="Patience ${Math.ceil(customer.p)}"><i style="--p:${percent}%;background:${color}"></i></div>`;
}

function render() {
  if (!g) return;
  $('stats').textContent = `Time ${Math.ceil(g.time)}s  |  Earned $${g.money} / $${g.target}  |  Served ${g.served}  |  Lost ${g.lost}`;
  if (g.mode === 'diner') renderDiner();
  else renderCoffee();
}

function renderDiner() {
  $('waiting').textContent = `Waiting guests: ${g.wait.length}/5`;
  $('tables').innerHTML = g.tables.map((customer, index) => {
    let content = `Table ${index + 1}<small>Seat waiting guest</small>`;
    if (customer) {
      const labels = {
        seated: 'Take order',
        ordered: `${customer.food} — cook below`,
        cooking: `Cooking: ${Math.ceil(customer.cook)}s`,
        ready: `Serve ${customer.food}`,
        eating: `Eating: ${Math.ceil(customer.eat)}s`,
        pay: 'Collect payment',
        dirty: 'Clear table'
      };
      content = `${face(customer)}Table ${index + 1}<small>${labels[customer.state]}</small>`;
      if (customer.state !== 'dirty') content += meter(customer);
    }
    return `<button class="table" data-table="${index}" ${g.paused ? 'disabled' : ''}>${content}</button>`;
  }).join('');
  $('kitchen').innerHTML = g.tables.map((customer, index) => {
    if (!customer || customer.state !== 'ordered') return '';
    return `<button data-cook="${index}" ${g.paused ? 'disabled' : ''}>Cook ${customer.food} · Table ${index + 1}</button>`;
  }).join('') || '<span class="muted">No unstarted tickets.</span>';
}

function renderCoffee() {
  $('queue').innerHTML = g.queue.map(customer =>
    `<button class="ticket ${customer.id === g.selected ? 'selected' : ''}" data-customer="${customer.id}" ${g.paused ? 'disabled' : ''}>${face(customer)}${customer.recipe.name}${meter(customer)}</button>`
  ).join('') || 'Waiting for guests…';
  const customer = g.queue.find(customer => customer.id === g.selected);
  $('recipe').textContent = customer ? `${customer.recipe.name}: ${customer.recipe.parts.join(' + ')}` : 'Select a guest to see their recipe.';
  $('mix').textContent = `In cup: ${g.mix.join(' + ') || 'empty'}`;
  $('cup').style.setProperty('--fill', Math.min(95, g.mix.length * 24) + '%');
  $('serve').disabled = g.paused || !customer;
  $('clear').disabled = g.paused;
  $('ingredients').querySelectorAll('button').forEach(button => { button.disabled = g.paused; });
}

function table(index) {
  if (!g || g.paused) return;
  let customer = g.tables[index];
  if (!customer) {
    if (!g.wait.length) { say('No guests waiting.', false); return; }
    customer = g.wait.shift();
    customer.state = 'seated';
    g.tables[index] = customer;
    say('Guest seated. Click to take their order.');
  } else if (customer.state === 'seated') {
    customer.state = 'ordered';
    customer.food = foods[Math.floor(Math.random() * foods.length)];
    say('Order sent to kitchen. Start cooking below.');
  } else if (customer.state === 'ready') {
    customer.state = 'eating';
    customer.eat = 4;
    say('Food served!');
  } else if (customer.state === 'pay') {
    const tip = Math.max(0, Math.ceil(customer.p / 6));
    g.money += 12 + tip;
    g.served++;
    customer.state = 'dirty';
    say(`Collected $${12 + tip}. Clear the table.`);
  } else if (customer.state === 'dirty') {
    g.tables[index] = null;
    say('Table ready.');
  }
  render();
}

function cook(index) {
  if (!g || g.paused) return;
  const customer = g.tables[index];
  if (customer && customer.state === 'ordered') {
    customer.state = 'cooking';
    customer.cook = Math.max(1.5, 5 - save.level * .65);
    say(`Cooking ${customer.food}…`);
    render();
  }
}

function serve() {
  if (!g || g.paused) return;
  const customer = g.queue.find(customer => customer.id === g.selected);
  if (!customer) return;
  const same = [...g.mix].sort().join('|') === [...customer.recipe.parts].sort().join('|');
  if (same) {
    const amount = 10 + Math.ceil(customer.p / 8);
    g.money += amount;
    g.served++;
    g.queue = g.queue.filter(other => other.id !== customer.id);
    g.selected = g.queue[0]?.id ?? null;
    say(`Perfect ${customer.recipe.name}! +$${amount}`);
  } else {
    customer.p -= 7;
    say('Wrong recipe — cup emptied, guest patience reduced.', false);
  }
  g.mix = [];
  render();
}

function tick(dt) {
  if (!g || g.paused) return;
  g.time = Math.max(0, g.time - dt);
  g.spawn -= dt;
  if (g.spawn <= 0) {
    arrive();
    g.spawn = Math.max(2.8, 6 - save.day * .2) + Math.random() * 2;
  }
  if (g.mode === 'diner') tickDiner(dt);
  else tickCoffee(dt);
  if (g.time <= 0) finish();
}

function tickDiner(dt) {
  for (let index = g.wait.length - 1; index >= 0; index--) {
    g.wait[index].p -= dt;
    if (g.wait[index].p <= 0) { g.wait.splice(index, 1); g.lost++; }
  }
  g.tables.forEach(customer => {
    if (!customer) return;
    if (customer.state === 'cooking') {
      customer.cook -= dt;
      if (customer.cook <= 0) customer.state = 'ready';
    }
    if (customer.state === 'eating') {
      customer.eat -= dt;
      if (customer.eat <= 0) customer.state = 'pay';
    }
    if (!['dirty', 'eating'].includes(customer.state)) {
      customer.p -= dt;
      if (customer.p <= 0) {
        g.lost++;
        customer.state = 'dirty';
        say('A guest left. Clear their table.', false);
      }
    }
  });
}

function tickCoffee(dt) {
  for (let index = g.queue.length - 1; index >= 0; index--) {
    const customer = g.queue[index];
    customer.p -= dt;
    if (customer.p <= 0) {
      g.queue.splice(index, 1);
      g.lost++;
      if (g.selected === customer.id) {
        g.selected = g.queue[0]?.id ?? null;
        g.mix = [];
      }
      say('A coffee guest left.', false);
    }
  }
}

function pause() {
  if (!g) return;
  g.paused = !g.paused;
  $('pause').textContent = g.paused ? 'Resume' : 'Pause';
  render();
}

$('dinerStart').onclick = () => start('diner');
$('coffeeStart').onclick = () => start('coffee');
$('back').onclick = home;
$('end').onclick = finish;
$('pause').onclick = pause;
$('upgrade').onclick = () => {
  if (save.level < 5 && save.bank >= cost()) {
    save.bank -= cost();
    save.level++;
    persist();
    home();
  }
};
$('tables').onclick = event => {
  const button = event.target.closest('[data-table]');
  if (button) table(Number(button.dataset.table));
};
$('kitchen').onclick = event => {
  const button = event.target.closest('[data-cook]');
  if (button) cook(Number(button.dataset.cook));
};
$('queue').onclick = event => {
  const button = event.target.closest('[data-customer]');
  if (button && g && !g.paused) {
    g.selected = Number(button.dataset.customer);
    render();
  }
};
for (const ingredient of ['Espresso', 'Water', 'Milk', 'Foam', 'Chocolate', 'Vanilla']) {
  const button = document.createElement('button');
  button.textContent = ingredient;
  button.className = 'secondary';
  button.onclick = () => {
    if (g && !g.paused && g.mix.length < 6) { g.mix.push(ingredient); render(); }
  };
  $('ingredients').append(button);
}
$('serve').onclick = serve;
$('clear').onclick = () => {
  if (g && !g.paused) { g.mix = []; render(); }
};
$('sound').onclick = () => {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    sound = !sound;
    $('sound').textContent = 'Sound: ' + (sound ? 'on' : 'off');
    beep();
  } catch { $('sound').textContent = 'Sound unavailable'; }
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden && g && !g.paused) pause();
});

function frame(now) {
  const dt = Math.min((now - last) / 1000, .1);
  last = now;
  tick(dt);
  paint += dt;
  if (paint > .2) { render(); paint = 0; }
  requestAnimationFrame(frame);
}
home();
requestAnimationFrame(frame);

'use strict';

(() => {
  let hold = 0;
  const baseRender = render;
  render = function () {
    if (performance.now() < hold) return;
    baseRender();
  };
  const press = () => { hold = performance.now() + 1500; };
  const release = () => { hold = 0; };
  document.addEventListener('pointerdown', press, true);
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
  window.addEventListener('blur', release);
})();

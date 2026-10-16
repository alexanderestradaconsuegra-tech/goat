/* GOAT LEAGUE · demostración del sorteo
   Solo ilustra la mecánica (6 equipos de ejemplo en 2 grupos de 3). El sorteo oficial se hace en vivo. */
(function () {
  const pool = document.getElementById('demo-pool');
  const btn = document.getElementById('demo-btn');
  const note = document.getElementById('demo-note');
  if (!pool || !btn) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const names = ['Equipo 1', 'Equipo 2', 'Equipo 3', 'Equipo 4', 'Equipo 5', 'Equipo 6'];
  const A = [...document.querySelectorAll('#demo-a li')];
  const B = [...document.querySelectorAll('#demo-b li')];
  const slots = [...A, ...B];
  const labels = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'];

  function fill() { pool.innerHTML = names.map((n) => '<span class="chip">' + n + '</span>').join(''); }
  function rnd(n) {
    if (window.crypto && crypto.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
    return Math.floor(Math.random() * n);
  }
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function reset() { slots.forEach((s) => { s.textContent = ''; s.classList.remove('on'); }); fill(); }

  let busy = false;
  btn.addEventListener('click', () => {
    if (busy) return;
    busy = true; btn.disabled = true;
    reset();
    const order = shuffle(names);
    const chips = [...pool.children];
    order.forEach((name, i) => {
      setTimeout(() => {
        const chip = chips.find((c) => c.textContent === name);
        if (chip) chip.classList.add('gone');
        slots[i].textContent = labels[i] + ' · ' + name;
        slots[i].classList.add('on');
        if (i === order.length - 1) {
          note.textContent = 'Resultado de la demostración: ' + order.map((n, k) => labels[k] + ' ' + n).join(', ') + '. El sorteo oficial se hace en vivo.';
          btn.disabled = false; btn.textContent = 'Sortear otra vez'; busy = false;
        }
      }, reduce ? 0 : 420 * (i + 1));
    });
  });
  fill();
})();

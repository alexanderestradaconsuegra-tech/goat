/* GOAT ADMIN · sorteo de grupos
   Herramienta para el sorteo en vivo. Usa los equipos confirmados (state.teams, definido en app.js).
   No escribe en la base de datos: el resultado se copia o descarga. */
(function () {
  const sel = document.getElementById('draw-category');
  if (!sel) return;
  const run = document.getElementById('draw-run');
  const feedback = document.getElementById('draw-feedback');
  const teamsBox = document.getElementById('draw-teams');
  const listA = document.getElementById('stage-a');
  const listB = document.getElementById('stage-b');
  const title = document.getElementById('stage-title');
  const meta = document.getElementById('stage-meta');
  const hashEl = document.getElementById('stage-hash');
  const copyBtn = document.getElementById('draw-copy');
  const csvBtn = document.getElementById('draw-csv');
  const fullBtn = document.getElementById('draw-full');
  const stage = document.getElementById('draw-stage');
  const history = document.getElementById('draw-history');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = null;
  let busy = false;
  const runs = [];

  function teamsOf(category) { return state.teams.filter((t) => t.category === category); }
  function rnd(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
  function shuffle(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function slotsFor(n) { const a = Math.ceil(n / 2); return { a, b: n - a }; }

  window.renderDraw = function () {
    const list = teamsOf(sel.value);
    const n = list.length;
    teamsBox.innerHTML = n
      ? '<ol>' + list.map((t) => '<li>' + esc(t.name) + '</li>').join('') + '</ol>'
      : '<p class="form-hint">No hay equipos confirmados en esta categoría. Agrégalos en la sección Equipos.</p>';
    const ok = n >= 4 && n <= 8;
    run.disabled = !ok || busy;
    feedback.className = 'feedback' + (ok ? (n === 6 ? ' success' : '') : ' error');
    feedback.textContent = !n ? '' : n === 6 ? '6 equipos confirmados: dos grupos de 3.' : ok ? n + ' equipos confirmados. El formato habitual es de 6 (grupos de 3); se repartirán ' + slotsFor(n).a + ' y ' + slotsFor(n).b + '.' : 'Hay ' + n + ' equipos. El sorteo necesita entre 4 y 8.';
    renderHistory();
  };

  async function sha(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16).toUpperCase();
    } catch { return 'no disponible'; }
  }

  function resultText(r) {
    return ['SORTEO GOAT LEAGUE · ' + r.category + ' · ' + r.when,
      'Grupo A: ' + r.a.map((n, i) => 'A' + (i + 1) + ' ' + n).join(', '),
      'Grupo B: ' + r.b.map((n, i) => 'B' + (i + 1) + ' ' + n).join(', '),
      'Huella de verificación: ' + r.hash].join('\n');
  }

  function renderHistory() {
    history.innerHTML = runs.length ? runs.map((r) => '<div class="list-row"><div><strong>' + esc(r.category) + '</strong><small>' + esc(r.when) + ' · huella ' + esc(r.hash) + '</small></div><span class="tag tag-ok">Sorteado</span></div>').join('') : '<p class="empty-state">Los sorteos que hagas en esta sesión aparecerán aquí.</p>';
  }

  run.addEventListener('click', async () => {
    const list = teamsOf(sel.value);
    if (busy || list.length < 4 || list.length > 8) return;
    if (runs.some((r) => r.category === sel.value) && !confirm('Ya sorteaste ' + sel.value + ' en esta sesión. ¿Quieres repetir el sorteo?')) return;
    busy = true; run.disabled = true; copyBtn.disabled = true; csvBtn.disabled = true;
    const order = shuffle(list.map((t) => t.name));
    const { a } = slotsFor(order.length);
    const A = order.slice(0, a), B = order.slice(a);
    const when = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date());
    const hash = await sha(JSON.stringify({ c: sel.value, A, B, t: Date.now() }));
    last = { category: sel.value, a: A, b: B, when, hash };
    title.textContent = sel.value; meta.textContent = when; hashEl.textContent = '';
    listA.innerHTML = ''; listB.innerHTML = '';
    const seq = [...A.map((n, i) => ['A', i, n]), ...B.map((n, i) => ['B', i, n])];
    seq.forEach(([g, i, n], k) => {
      const li = document.createElement('li'); li.innerHTML = '<span>' + g + (i + 1) + '</span><b></b>'; li.querySelector('b').textContent = '…';
      (g === 'A' ? listA : listB).appendChild(li);
      setTimeout(() => { li.querySelector('b').textContent = n; li.classList.add('on'); }, reduce ? 0 : 900 * (k + 1));
    });
    setTimeout(() => {
      hashEl.textContent = 'Huella de verificación: ' + hash;
      runs.unshift(last); renderHistory();
      copyBtn.disabled = false; csvBtn.disabled = false; busy = false; window.renderDraw();
    }, reduce ? 0 : 900 * (seq.length + 1));
  });

  copyBtn.addEventListener('click', async () => {
    if (!last) return;
    try { await navigator.clipboard.writeText(resultText(last)); copyBtn.textContent = 'Copiado'; }
    catch { copyBtn.textContent = 'No se pudo copiar'; }
    setTimeout(() => { copyBtn.textContent = 'Copiar resultado'; }, 1800);
  });
  csvBtn.addEventListener('click', () => {
    if (!last) return;
    const rows = [['Categoría', 'Grupo', 'Posición', 'Equipo']]
      .concat(last.a.map((n, i) => [last.category, 'A', 'A' + (i + 1), n]), last.b.map((n, i) => [last.category, 'B', 'B' + (i + 1), n]));
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'sorteo-' + last.category.replace(/\s+/g, '').toLowerCase() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  });
  fullBtn.addEventListener('click', () => { if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {}); });
  sel.addEventListener('change', window.renderDraw);
})();

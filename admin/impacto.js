/* GOAT ADMIN · capa de impacto
   Solo presentación. No toca sesión, datos ni llamadas a Supabase (app.js). */
(function () {
  const d = document;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* Luz que sigue el cursor: panel de marca del acceso y tarjetas */
  const brand = $('.login-brand');
  if (brand && fine && !reduce) {
    brand.addEventListener('pointermove', (e) => {
      const r = brand.getBoundingClientRect();
      brand.style.setProperty('--lx', e.clientX - r.left + 'px');
      brand.style.setProperty('--ly', e.clientY - r.top + 'px');
    });
  }
  if (fine) {
    d.addEventListener('pointermove', (e) => {
      const s = e.target.closest && e.target.closest('.surface');
      if (!s) return;
      const r = s.getBoundingClientRect();
      s.style.setProperty('--mx', e.clientX - r.left + 'px');
      s.style.setProperty('--my', e.clientY - r.top + 'px');
    });
  }

  /* Contadores en las métricas (números y montos en CLP) */
  const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  function countUp(el) {
    const text = el.textContent.trim();
    if (!/^\$?\s?[\d.]+$/.test(text)) return;
    const to = parseInt(text.replace(/\D/g, ''), 10);
    if (!Number.isFinite(to) || to === 0) return;
    const money = text.indexOf('$') > -1;
    let t0 = null;
    requestAnimationFrame(function step(t) {
      if (!t0) t0 = t;
      const p = Math.min((t - t0) / 1100, 1);
      const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = money ? clp.format(v) : String(v);
      if (p < 1) requestAnimationFrame(step);
    });
  }
  const metrics = $('#overview-metrics');
  if (metrics && !reduce) {
    new MutationObserver(() => $$('.metric strong', metrics).forEach(countUp)).observe(metrics, { childList: true });
  }

  /* Pista de scroll en tablas anchas */
  function hints() {
    $$('.data-table-wrap').forEach((w) => w.classList.toggle('more', w.scrollWidth - w.clientWidth - w.scrollLeft > 4));
  }
  const workspace = $('.workspace');
  if (workspace) {
    new MutationObserver(hints).observe(workspace, { childList: true, subtree: true });
    workspace.addEventListener('scroll', hints, true);
    addEventListener('resize', hints);
  }

  /* Menú móvil: telón que cierra al tocar fuera */
  const sidebar = $('#sidebar');
  if (sidebar) {
    const scrim = d.createElement('div');
    scrim.className = 'scrim';
    scrim.setAttribute('aria-hidden', 'true');
    d.body.appendChild(scrim);
    const sync = () => scrim.classList.toggle('show', sidebar.classList.contains('open'));
    new MutationObserver(sync).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    scrim.addEventListener('click', () => sidebar.classList.remove('open'));
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') sidebar.classList.remove('open'); });
  }
})();

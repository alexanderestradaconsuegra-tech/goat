/* GOAT UI KIT · kit.js
   Efectos por atributos HTML. Usa Motion si está cargado (motion.js); si no, funciona igual con CSS.
   data-k-reveal      aparece al entrar en pantalla (escalonado entre hermanos)
   data-k-magnetic    el botón sigue levemente al cursor y vuelve con rebote
   data-k-tilt="6"    inclinación 3D según el cursor (grados máximos)
   data-k-spotlight   reflejo de luz que sigue al cursor (úsalo con .k-glass)
   data-k-count="180" contador animado
   <div class="k-progress"></div>   barra de progreso de scroll */
(function () {
  const d = document;
  const $$ = (s) => [...d.querySelectorAll(s)];
  const M = window.Motion || {};
  const mini = M.mini;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const spring = { type: 'spring', stiffness: 260, damping: 18 };
  d.documentElement.classList.add('k-js');

  /* reveal */
  const groups = new Map();
  $$('[data-k-reveal]').forEach((el) => {
    const g = groups.get(el.parentElement) || [];
    g.push(el); groups.set(el.parentElement, g);
  });
  groups.forEach((list) => list.forEach((el, i) => el.style.setProperty('--k-delay', Math.min(i, 6) * 90 + 'ms')));
  function show(el) {
    if (mini && !reduce) {
      mini(el, { opacity: [0, 1], transform: ['translateY(26px)', 'translateY(0px)'] }, { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: (parseFloat(el.style.getPropertyValue('--k-delay')) || 0) / 1000 });
      el.classList.add('k-in'); el.setAttribute('data-k-done', '');
    } else { el.classList.add('k-in'); }
  }
  if (M.inView) { $$('[data-k-reveal]').forEach((el) => M.inView(el, () => { show(el); }, { amount: 0.2 })); }
  else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: 0.2 });
    $$('[data-k-reveal]').forEach((el) => io.observe(el));
  } else { $$('[data-k-reveal]').forEach(show); }

  /* magnético */
  if (fine && !reduce) $$('[data-k-magnetic]').forEach((b) => {
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * 0.16 + 'px,' + (e.clientY - r.top - r.height / 2) * 0.26 + 'px)'; });
    b.addEventListener('pointerleave', () => { if (mini) mini(b, { transform: 'translate(0px,0px)' }, spring).finished.then(() => { b.style.transform = ''; }); else b.style.transform = ''; });
  });

  /* inclinación */
  if (fine && !reduce) $$('[data-k-tilt]').forEach((el) => {
    const max = parseFloat(el.dataset.kTilt) || 6;
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5; el.style.transition = 'transform .12s linear'; el.style.transform = 'perspective(900px) rotateX(' + -py * max + 'deg) rotateY(' + px * max + 'deg) translateY(-4px)'; });
    el.addEventListener('pointerleave', () => { if (mini) mini(el, { transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)' }, spring).finished.then(() => { el.style.transition = ''; el.style.transform = ''; }); else { el.style.transition = ''; el.style.transform = ''; } });
  });

  /* reflejo de luz */
  if (fine) $$('[data-k-spotlight]').forEach((el) => el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', e.clientX - r.left + 'px'); el.style.setProperty('--my', e.clientY - r.top + 'px'); }));

  /* contadores */
  function count(el) {
    const to = +el.dataset.kCount; let t0 = null;
    requestAnimationFrame(function step(t) { if (!t0) t0 = t; const p = Math.min((t - t0) / 1400, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); });
  }
  if (!reduce && 'IntersectionObserver' in window) {
    const co = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { count(e.target); co.unobserve(e.target); } }), { threshold: 0.6 });
    $$('[data-k-count]').forEach((el) => co.observe(el));
  }

  /* progreso de scroll */
  const bar = d.querySelector('.k-progress');
  if (bar) {
    if (M.scroll && mini && !reduce) M.scroll(mini(bar, { transform: ['scaleX(0)', 'scaleX(1)'] }, { ease: 'linear' }));
    else addEventListener('scroll', () => { const max = d.documentElement.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')'; }, { passive: true });
  }
})();

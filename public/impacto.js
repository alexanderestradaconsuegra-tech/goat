/* GOAT LEAGUE · capa de impacto
   Solo presentación e interacción. La lógica de inscripción y competencia sigue en app.js. */
(function () {
  const d = document;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* Titulares: una máscara por línea para la entrada animada */
  const headings = $$('h1, h2');
  headings.forEach((h) => {
    const parts = h.innerHTML.split(/<br\s*\/?>/i);
    const probe = d.createElement('div');
    probe.innerHTML = parts.join(' ');
    h.setAttribute('aria-label', probe.textContent.replace(/\s+/g, ' ').trim());
    h.innerHTML = parts.map((p, i) => '<span class="ln" style="--i:' + i + '" aria-hidden="true"><span>' + p + '</span></span>').join('');
  });
  d.documentElement.classList.add('ready');
  const M = window.Motion;
  const mini = M && M.mini;
  const spr = { type: 'spring', stiffness: 260, damping: 18 };
  function revealHeading(h) {
    const lines = $$('.ln > span', h);
    if (!mini || reduce) { lines.forEach((l) => { l.style.transform = 'none'; }); return; }
    mini(lines, { transform: ['translateY(115%)', 'translateY(0%)'] }, { duration: 1.05, ease: [0.16, 1, 0.3, 1], delay: M.stagger(0.11) });
    lines.forEach((l) => { l.style.transform = 'none'; });
  }
  if (M && M.inView) {
    headings.forEach((h) => M.inView(h, () => { revealHeading(h); }, { amount: 0.35 }));
  } else {
    headings.forEach((h) => revealHeading(h));
  }

  /* Escalonado de las tarjetas que se revelan juntas */
  const groups = new Map();
  $$('.reveal').forEach((el) => {
    const p = el.parentElement;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(el);
  });
  groups.forEach((list) => {
    if (list.length < 2) return;
    list.forEach((el, i) => { el.style.transitionDelay = Math.min(i, 5) * 80 + 'ms'; });
  });

  /* Progreso de scroll, header fijo, paralaje del GOAT gigante, enlace activo */
  const bar = $('.progress');
  const cta = $('.floating-cta');
  const reg = $('#inscripcion');
  const giant = $('.hero-giant');
  const header = $('.site-header');
  const navLinks = $$('.nav > a[href^="#"]:not(.nav-cta)');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const useScrollAnim = !!(M && M.scroll && mini && !reduce);
  if (useScrollAnim) {
    M.scroll(mini(bar, { transform: ['scaleX(0)', 'scaleX(1)'] }, { ease: 'linear' }));
    const heroEl = $('.hero');
    if (giant && heroEl) {
      M.scroll(mini(giant, { translate: ['0px 0px', '0px 190px'] }, { ease: 'linear' }), { target: heroEl, offset: ['start start', 'end start'] });
    }
  }
  function onScroll() {
    const max = d.documentElement.scrollHeight - innerHeight;
    if (!useScrollAnim) bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    header.classList.toggle('stuck', scrollY > 160);
    if (cta && reg) {
      const rr = reg.getBoundingClientRect();
      cta.classList.toggle('away', rr.top < innerHeight * 0.7 && rr.bottom > 140);
    }
    const probe = scrollY + innerHeight * 0.35;
    let current = null;
    sections.forEach((s) => { if (s.offsetTop <= probe) current = s.id; });
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* Hero: luz y paralaje con el puntero */
  const hero = $('.hero');
  if (fine && !reduce && hero && giant) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      hero.style.setProperty('--hx', x + 'px');
      hero.style.setProperty('--hy', y + 'px');
      giant.style.setProperty('--px', (x / r.width - 0.5) * -34 + 'px');
      giant.style.setProperty('--py', (y / r.height - 0.5) * -20 + 'px');
    });
  }

  /* Luz en tarjetas de vidrio */
  if (fine) {
    $$('.glass-card').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', e.clientX - r.left + 'px');
        c.style.setProperty('--my', e.clientY - r.top + 'px');
      });
    });
  }

  /* Inclinación 3D en tarjeta de temporada y categorías */
  function tilt(el, max) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = 'transform .12s linear, border-color .3s, background .25s';
      el.style.transform = 'perspective(900px) rotateX(' + -py * max + 'deg) rotateY(' + px * max + 'deg) translateY(-4px)';
    });
    el.addEventListener('pointerleave', () => {
      if (mini) {
        mini(el, { transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)' }, spr).finished.then(() => { el.style.transition = ''; el.style.transform = ''; });
      } else { el.style.transition = ''; el.style.transform = ''; }
    });
  }
  if (fine && !reduce) $$('.season-card, .category-card').forEach((c) => tilt(c, 7));

  /* Botones magnéticos */
  if (fine && !reduce) {
    $$('.button, .nav-cta, .submit-button').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * 0.16 + 'px,' + (e.clientY - r.top - r.height / 2) * 0.26 + 'px)';
      });
      b.addEventListener('pointerleave', () => {
        if (mini) mini(b, { transform: 'translate(0px,0px)' }, spr).finished.then(() => { b.style.transform = ''; });
        else b.style.transform = '';
      });
    });
  }

  /* Cursor en anillo */
  const cur = $('.cursor');
  if (fine && !reduce && cur) {
    let cx = 0, cy = 0, tx = 0, ty = 0, big = false;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); });
    d.addEventListener('pointerover', (e) => {
      big = !!(e.target.closest && e.target.closest('a, button, select, input, textarea, label'));
      cur.classList.toggle('big', big);
    });
    d.documentElement.addEventListener('mouseleave', () => cur.classList.remove('on'));
    (function loop() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)' + (big ? ' scale(1.8)' : '');
      requestAnimationFrame(loop);
    })();
  }

  /* Contadores */
  function count(el) {
    const to = +el.dataset.count;
    let t0 = null;
    el.textContent = '0';
    requestAnimationFrame(function step(t) {
      if (!t0) t0 = t;
      const p = Math.min((t - t0) / 1500, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    });
  }
  if (!reduce && hasIO) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { count(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((c) => cio.observe(c));
  }

  /* Podio: sube escalonado cuando el panel entra en pantalla */
  const panel = $('.awards-panel');
  if (panel) {
    const rise = () => {
      panel.classList.add('in');
      if (mini && !reduce) {
        const pods = [$('.pod.second', panel), $('.pod.first', panel), $('.pod.third', panel)].filter(Boolean);
        mini(pods, { clipPath: ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'], translate: ['0px 36px', '0px 0px'] }, { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: M.stagger(0.14) });
      }
    };
    if (M && M.inView) M.inView(panel, () => { rise(); }, { amount: 0.25 });
    else rise();
  }

  /* Competencia: pista de scroll en tablas anchas y pestaña activa visible en móvil */
  function updateScrollHints() {
    $$('.data-table-wrap').forEach((w) => w.classList.toggle('more', w.scrollWidth - w.clientWidth - w.scrollLeft > 4));
  }
  const compContent = $('#competition-content');
  if (compContent) {
    new MutationObserver(updateScrollHints).observe(compContent, { childList: true });
    compContent.addEventListener('scroll', updateScrollHints, true);
    addEventListener('resize', updateScrollHints);
  }
  $$('.competition-tabs button').forEach((b) => b.addEventListener('click', () => {
    const tabs = b.parentElement;
    tabs.scrollTo({ left: b.offsetLeft - (tabs.clientWidth - b.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* Formulario: barra de avance y pantalla de confirmación */
  const form = $('#team-form');
  const success = $('#form-success');
  const fill = $('.form-progress i');
  function progress() {
    const fd = new FormData(form);
    let n = 0;
    ['team', 'manager', 'phone'].forEach((k) => { if (String(fd.get(k) || '').trim().length >= 2) n++; });
    if (fd.getAll('category').length) n++;
    fill.style.transform = 'scaleX(' + n / 4 + ')';
  }
  form.addEventListener('input', progress);
  form.addEventListener('change', progress);
  form.addEventListener('reset', () => setTimeout(progress, 0));
  new MutationObserver(() => {
    const ok = success.textContent.trim().length > 0;
    form.classList.toggle('done', ok);
    if (ok) {
      const r = form.getBoundingClientRect();
      scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
  }).observe(success, { childList: true, characterData: true, subtree: true });
  $('.form-again').addEventListener('click', () => {
    success.textContent = '';
    form.classList.remove('done');
    progress();
    const first = $('input[name="team"]', form);
    if (first) first.focus();
  });
})();

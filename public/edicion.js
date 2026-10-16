/* GOAT LEAGUE · ediciones, cuenta regresiva y cupos
   Lee /api/editions (disponibilidad por categoría). Si falla, usa las fechas incluidas aquí
   y no bloquea nada. El servidor vuelve a validar los cupos al guardar la inscripción. */
(function () {
  const FALLBACK = [
    { slug: '2026-11', label: '7 y 8 de noviembre', long: 'Sábado 7 de noviembre · 09:00', start: '2026-11-07T09:00:00-03:00', end: '2026-11-08T14:00:00-03:00' },
    { slug: '2026-12', label: '5 y 6 de diciembre', long: 'Sábado 5 de diciembre · 09:00', start: '2026-12-05T09:00:00-03:00', end: '2026-12-06T14:00:00-03:00' }
  ];
  const $ = (s, c = document) => c.querySelector(s);
  const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
  let editions = FALLBACK.map((e) => ({ ...e, full: false, categories: {} }));
  let openSlug = editions[0].slug;
  let currentSlug = editions[0].slug;
  const longOf = (e) => e.long || FALLBACK.find((f) => f.slug === e.slug)?.long || e.label;

  /* ───── Cuenta regresiva ───── */
  const sec = $('#cuenta-regresiva');
  const tiles = $('#cd-tiles');
  const eyebrow = $('#cd-eyebrow');
  const label = $('#cd-label');
  let lastAria = '';
  function tick() {
    if (!sec) return;
    const now = Date.now();
    const next = editions.find((e) => new Date(e.end).getTime() > now);
    if (!next) { sec.hidden = true; return; }
    sec.hidden = false;
    const start = new Date(next.start).getTime();
    if (now >= start) {
      eyebrow.textContent = 'El torneo está en juego';
      label.textContent = next.label + ' · GOAT LEAGUE 2026';
      tiles.hidden = true;
      return;
    }
    tiles.hidden = false;
    const left = Math.floor((start - now) / 1000);
    const d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
    $('#cd-d').textContent = pad(d); $('#cd-h').textContent = pad(h); $('#cd-m').textContent = pad(m); $('#cd-s').textContent = pad(s);
    const first = next.slug === editions[0].slug;
    eyebrow.textContent = first ? 'Faltan para el pitazo inicial' : 'Faltan para la próxima fecha';
    label.textContent = longOf(next);
    const aria = d + ' días, ' + h + ' horas y ' + m + ' minutos para ' + next.label;
    if (aria !== lastAria) { tiles.setAttribute('aria-label', aria); lastAria = aria; }
  }

  /* ───── Cupos y edición activa del formulario ───── */
  function applyAvailability() {
    const form = $('#team-form');
    const notice = $('#edition-notice');
    const badge = $('[data-reg-status]');
    const cta = $('#cd-cta');
    const cur = editions.find((e) => e.slug === currentSlug) || editions[0];
    const open = editions.find((e) => e.slug === openSlug);
    if (form) form.dataset.edition = open ? open.slug : '';
    const submit = $('.submit-button');
    if (open && cur && open.slug !== cur.slug) {
      if (notice) { notice.hidden = false; notice.classList.add('warn'); notice.textContent = 'Cupos completos para el ' + cur.label + '. Tu inscripción será para la próxima fecha: ' + open.label + '.'; }
      if (badge) badge.textContent = 'Cupos completos · próxima fecha ' + open.label;
      if (cta) cta.firstChild.textContent = 'Inscribirme el ' + open.label + ' ';
    } else if (!open) {
      if (notice) { notice.hidden = false; notice.classList.add('warn'); notice.textContent = 'Los cupos de todas las fechas disponibles están completos. Escríbenos por WhatsApp para quedar en lista de espera.'; }
      if (badge) badge.textContent = 'Cupos completos';
      if (submit) submit.disabled = true;
    } else if (notice) {
      notice.hidden = false; notice.classList.remove('warn');
      notice.textContent = 'Inscripción para el torneo del ' + open.label + '.';
    }
    if (open && form) {
      Object.keys(open.categories || {}).forEach((cat) => {
        const input = form.querySelector('input[name="category"][value="' + cat + '"]');
        if (!input) return;
        const full = open.categories[cat].full;
        input.disabled = full;
        const span = input.nextElementSibling;
        if (span) { span.classList.toggle('is-full', full); span.title = full ? 'Cupos completos' : ''; }
      });
    }
  }

  /* Ventana del sorteo: 48 a 72 horas antes de la primera fecha activa */
  function drawWindow() {
    const out = document.querySelector('[data-draw-window]');
    if (!out) return;
    const now = Date.now();
    const next = editions.find((e) => new Date(e.start).getTime() > now);
    if (!next) return;
    const start = new Date(next.start).getTime();
    const f = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Santiago' });
    out.textContent = 'Entre el ' + f.format(new Date(start - 72 * 3600e3)) + ' y el ' + f.format(new Date(start - 48 * 3600e3)) + ' (48 a 72 horas antes del ' + next.label + '). La hora exacta se avisa por WhatsApp y redes.';
  }

  tick();
  drawWindow();
  setInterval(tick, 1000);

  if ('fetch' in window) {
    fetch('/api/editions', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.editions) && d.editions.length) {
          editions = d.editions;
          currentSlug = d.current || editions[0].slug;
          openSlug = d.open;
          applyAvailability();
          tick();
          drawWindow();
        } else { applyAvailability(); }
      })
      .catch(applyAvailability);
  }
})();

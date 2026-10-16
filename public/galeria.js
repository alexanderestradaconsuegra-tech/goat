/* GOAT LEAGUE · galería
   Muestra fotos de ejemplo hasta que /api/gallery devuelva las publicadas desde el panel admin
   (tabla tournament_gallery_photos). Visor accesible con teclado. */
(function () {
  const grid = document.getElementById('gallery-grid');
  const dlg = document.getElementById('lightbox');
  if (!grid || !dlg) return;
  const img = dlg.querySelector('img');
  const cap = dlg.querySelector('figcaption');
  let items = [];
  let current = 0;

  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function collect() {
    items = [...grid.querySelectorAll('.shot-btn')].map((b) => {
      const i = b.querySelector('img');
      const c = b.querySelector('b');
      return { src: i.currentSrc || i.src, alt: i.alt, caption: c ? c.textContent : '' };
    });
  }

  function show(i) {
    current = (i + items.length) % items.length;
    const it = items[current];
    img.src = it.src;
    img.alt = it.alt;
    cap.textContent = it.caption;
  }

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.shot-btn');
    if (!b) return;
    collect();
    show([...grid.querySelectorAll('.shot-btn')].indexOf(b));
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  });
  dlg.querySelector('.lb-close').addEventListener('click', () => dlg.close());
  dlg.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
  dlg.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  function render(photos) {
    grid.innerHTML = photos.map((p, i) =>
      '<figure class="shot visible"><button type="button" class="shot-btn" data-i="' + i + '" aria-label="Ampliar fotografía: ' + esc(p.caption || 'Fotografía del torneo') + '">' +
      '<img src="' + esc(p.url) + '" alt="' + esc(p.alt) + '" loading="lazy" decoding="async">' +
      (p.caption ? '<figcaption><b>' + esc(p.caption) + '</b></figcaption>' : '') + '</button></figure>').join('');
    const note = document.querySelector('.gallery-note');
    if (note) note.classList.add('live');
  }

  if ('fetch' in window) {
    fetch('/api/gallery', { headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.photos) && d.photos.length) render(d.photos); })
      .catch(() => {});
  }
})();

const SUPABASE_URL = 'https://gsvnshhisqsjyhugmldp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vsgceztoofukgD8xvFyw3A_5FjPJhmz';
const COMPETITION = 'goat-league-2026';
const SESSION_KEY = 'goat_admin_session';

const state = {
  session: null,
  registrations: [],
  payments: [],
  teams: [],
  players: [],
  matches: [],
  gallery: [],
  settings: null,
  delegates: []
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const money = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const dateTime = (value) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(value)) : '—';
const dateOnly = (value) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'America/Santiago' }).format(new Date(`${value}T12:00:00-03:00`)) : '—';

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

function saveSession(session) {
  state.session = session;
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}

async function refreshSession() {
  if (!state.session?.refresh_token) return false;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: state.session.refresh_token })
  });
  if (!response.ok) return false;
  const next = await response.json();
  saveSession(next);
  return true;
}

async function api(path, options = {}, retried = false) {
  const headers = { apikey: SUPABASE_KEY, accept: 'application/json', ...(options.headers || {}) };
  if (state.session?.access_token) headers.authorization = `Bearer ${state.session.access_token}`;
  if (options.body !== undefined && !(options.body instanceof Blob) && !(options.body instanceof File)) headers['content-type'] = 'application/json';
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : (options.body instanceof Blob || options.body instanceof File ? options.body : JSON.stringify(options.body))
  });
  if (response.status === 401 && !retried && await refreshSession()) return api(path, options, true);
  const text = await response.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) {
    const error = new Error(data?.message || data?.error_description || data?.hint || 'No se pudo completar la operación.');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function rest(table, query = '', options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.method && options.method !== 'GET') headers.prefer = options.prefer || 'return=representation';
  return api(`/rest/v1/${table}${query}`, { ...options, headers });
}

async function rpc(name, body = {}) {
  return api(`/rest/v1/rpc/${name}`, { method: 'POST', body });
}

function showFeedback(message, type = 'error') {
  const node = $('#global-feedback');
  node.textContent = message;
  node.className = `global-feedback show ${type}`;
  window.setTimeout(() => { node.className = 'global-feedback'; }, 5000);
}

function formFeedback(form, message, type = 'error') {
  const node = $('[data-form-feedback]', form);
  if (!node) return;
  node.textContent = message;
  node.className = `feedback ${type}`;
}

function setBusy(form, busy) {
  const button = $('button[type="submit"]', form);
  if (button) button.disabled = busy;
}

async function ensureAdmin() {
  const allowed = await rpc('current_tournament_admin');
  if (allowed !== true) throw new Error('Este correo no está autorizado para administrar GOAT LEAGUE.');
}

async function signIn(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.msg || 'Correo o contraseña incorrectos.');
  saveSession(data);
  await ensureAdmin();
}

async function signUp(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.error_description || 'No fue posible crear el acceso.');
  if (data.access_token) {
    saveSession(data);
    await ensureAdmin();
    return 'active';
  }
  return 'confirmation';
}

function showLogin() {
  $('#login-view').hidden = false;
  $('#admin-view').hidden = true;
}

async function showAdmin() {
  $('#login-view').hidden = true;
  $('#admin-view').hidden = false;
  $('#session-email').textContent = state.session?.user?.email || '';
  await loadAll();
}

async function loadAll() {
  $('#admin-loading').hidden = false;
  $$('.panel').forEach((panel) => { panel.style.visibility = 'hidden'; });
  try {
    const filter = `?competition_slug=eq.${COMPETITION}`;
    const [registrations, payments, teams, players, matches, gallery, settingsRows, delegates] = await Promise.all([
      rest('team_registrations', `${filter}&select=*&order=created_at.desc`),
      rest('academy_payments', `${filter}&select=*&order=created_at.desc`),
      rest('tournament_teams', `${filter}&select=*&order=category.asc,name.asc`),
      rest('tournament_players', `${filter}&select=*&order=full_name.asc`),
      rest('tournament_matches', `${filter}&select=*&order=starts_at.asc`),
      rest('tournament_gallery_photos', `${filter}&select=*&order=sort_order.asc,created_at.desc`),
      rest('tournament_settings', `${filter}&select=*&limit=1`),
      rpc('list_tournament_delegates')
    ]);
    Object.assign(state, { registrations, payments, teams, players, matches, gallery, settings: settingsRows[0] || null, delegates });
    renderAll();
  } catch (error) {
    showFeedback(error.message);
  } finally {
    $('#admin-loading').hidden = true;
    $$('.panel').forEach((panel) => { panel.style.visibility = ''; });
  }
}

function emptyState(message) {
  return `<div class="empty"><div><img src="/goat-icon.png" alt=""><br>${esc(message)}</div></div>`;
}

function table(headers, rows) {
  if (!rows.length) return emptyState('Todavía no hay información registrada.');
  return `<div class="data-table-wrap"><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function statusLabel(status) {
  const names = { pending: 'Pendiente', contacted: 'Contactada', approved: 'Aprobada', rejected: 'Rechazada', partial: 'Parcial', paid: 'Pagado', scheduled: 'Programado', completed: 'Finalizado', cancelled: 'Cancelado', active: 'Activo', invited: 'Invitado' };
  return `<span class="status ${esc(status)}">${esc(names[status] || status)}</span>`;
}

function renderAll() {
  renderOverview();
  renderRegistrations();
  renderPayments();
  renderTeams();
  renderPlayers();
  renderMatches();
  renderCompetition();
  renderGallery();
  renderSettings();
  renderDelegates();
  populateSelects();
  if (typeof renderDraw === 'function') renderDraw();
}

function renderOverview() {
  const pending = state.registrations.filter((item) => item.status === 'pending').length;
  const totalPaid = state.payments.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0);
  const totalDue = state.payments.reduce((sum, item) => sum + Number(item.amount_due || 0), 0);
  $('#pending-badge').textContent = pending;
  $('#overview-metrics').innerHTML = [
    ['Solicitudes', state.registrations.length, pending ? `${pending} pendientes` : 'Al día'],
    ['Academias con pago', state.payments.length, 'Registros financieros'],
    ['Equipos', state.teams.length, 'En competencia'],
    ['Total abonado', money(totalPaid), `Saldo ${money(totalDue - totalPaid)}`]
  ].map(([label, value, note], index) => `<article class="surface metric ${index === 3 ? 'highlight' : ''}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join('');
  const recent = state.registrations.slice(0, 5);
  $('#recent-registrations').innerHTML = recent.length ? recent.map((item) => `<div class="list-row"><div><strong>${esc(item.team_name)}</strong><small>${esc(item.manager_name)} · ${esc(item.categories.join(', '))}</small></div>${statusLabel(item.status)}</div>`).join('') : emptyState('Las nuevas solicitudes aparecerán aquí.');
  renderCapacity();
  $('#payment-summary').innerHTML = `<div class="money-stack"><div><span>Total comprometido</span><strong>${money(totalDue)}</strong></div><div class="accent"><span>Total abonado</span><strong>${money(totalPaid)}</strong></div><div><span>Saldo pendiente</span><strong>${money(totalDue - totalPaid)}</strong></div></div>`;
}

const EDITION_LABELS = { '2026-11': '7 y 8 nov', '2026-12': '5 y 6 dic' };
function registrationNotes(item) {
  const raw = String(item.message || '');
  const edition = /\[Edición ([0-9-]+)\]/.exec(raw);
  const consent = /\[Consentimiento ([^:\]]+):/.exec(raw);
  const clean = raw.replace(/\[Edición[^\]]*\]/g, '').replace(/\[Consentimiento[^\]]*\]/g, '').trim();
  const badges = [
    edition ? `<span class="tag tag-date">${esc(EDITION_LABELS[edition[1]] || edition[1])}</span>` : '',
    consent ? `<span class="tag tag-ok" title="Aceptó términos y declaró autorización de apoderados">Consentimiento ${esc(consent[1])}</span>` : '<span class="tag tag-warn" title="Inscripción anterior al consentimiento digital">Sin consentimiento digital</span>'
  ].join('');
  return `<br>${badges}${clean ? `<br><small>${esc(clean)}</small>` : ''}`;
}

const CAPACITY = 6;
const CATEGORY_LIST = ['Sub 7', 'Sub 9', 'Sub 11', 'Sub 13', 'Sub 15'];
const EDITIONS = [
  { slug: '2026-11', label: '7 y 8 de noviembre', name: 'Primera fecha', start: '2026-11-07T09:00:00-03:00', end: '2026-11-08T14:00:00-03:00' },
  { slug: '2026-12', label: '5 y 6 de diciembre', name: 'Cierre de año', start: '2026-12-05T09:00:00-03:00', end: '2026-12-06T14:00:00-03:00' }
];
function renderCapacity() {
  $('#capacity-board').innerHTML = CATEGORY_LIST.map((cat) => {
    const taken = state.teams.filter((team) => team.category === cat).length;
    const pct = Math.min(100, Math.round((taken / CAPACITY) * 100));
    return `<div class="cap-row"><b>${esc(cat)}</b><div class="bar"><i style="width:${pct}%" class="${taken >= CAPACITY ? 'full' : ''}"></i></div><span>${taken}/${CAPACITY}</span>${taken >= CAPACITY ? '<em>Completo</em>' : ''}</div>`;
  }).join('') + '<p class="form-hint">Cuenta equipos confirmados en la competencia. El tope de 6 por categoría se aplica también en la web pública.</p>';
  const now = Date.now();
  $('#editions-board').innerHTML = EDITIONS.map((edition) => {
    const left = Math.ceil((new Date(edition.start).getTime() - now) / 86400000);
    const status = new Date(edition.end).getTime() < now ? 'Finalizada' : left > 0 ? `Faltan ${left} día${left === 1 ? '' : 's'}` : 'En juego';
    return `<div class="list-row"><div><strong>${esc(edition.name)}</strong><small>${esc(edition.label)}</small></div><span class="tag tag-date">${esc(status)}</span></div>`;
  }).join('');
}

function renderRegistrations() {
  const filter = $('#registration-filter')?.value || 'all';
  const items = filter === 'all' ? state.registrations : state.registrations.filter((item) => item.status === filter);
  $('#registrations-table').innerHTML = table(['Academia', 'Responsable', 'WhatsApp', 'Categorías', 'Fecha', 'Estado', 'Acción'], items.map((item) => `<tr><td><strong>${esc(item.team_name)}</strong>${registrationNotes(item)}</td><td>${esc(item.manager_name)}</td><td><a href="https://wa.me/${esc(item.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">${esc(item.whatsapp)}</a></td><td>${esc(item.categories.join(', '))}</td><td>${dateTime(item.created_at)}</td><td><select class="inline-select" data-registration-status="${item.id}"><option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pendiente</option><option value="contacted" ${item.status === 'contacted' ? 'selected' : ''}>Contactada</option><option value="approved" ${item.status === 'approved' ? 'selected' : ''}>Aprobada</option><option value="rejected" ${item.status === 'rejected' ? 'selected' : ''}>Rechazada</option></select></td><td><button class="mini-button" data-save-registration="${item.id}">Guardar</button></td></tr>`));
}

function renderPayments() {
  $('#payments-table').innerHTML = table(['Academia', 'Jugadores', 'Total', 'Abonado', 'Saldo', 'Estado', 'Fecha', 'Acciones'], state.payments.map((item) => `<tr><td><strong>${esc(item.academy_name)}</strong><br><small>${esc(item.payment_method)}</small></td><td>${item.player_count}</td><td>${money(item.amount_due)}</td><td>${money(item.amount_paid)}</td><td><strong>${money(Number(item.amount_due) - Number(item.amount_paid))}</strong></td><td>${statusLabel(item.payment_status)}</td><td>${dateOnly(item.paid_at)}</td><td><div class="table-actions"><button class="mini-button" data-edit-payment="${item.id}">Editar</button><button class="mini-button danger" data-delete-payment="${item.id}">Eliminar</button></div></td></tr>`));
}

function renderTeams() {
  $('#teams-table').innerHTML = table(['Equipo', 'Categoría', 'Sigla', 'Color', 'Responsable', 'Acciones'], state.teams.map((item) => `<tr><td><strong>${esc(item.name)}</strong></td><td>${esc(item.category)}</td><td>${esc(item.abbreviation)}</td><td><span style="display:inline-block;width:18px;height:18px;background:${esc(item.primary_color)};vertical-align:middle"></span> ${esc(item.shirt_color)}</td><td>${esc(item.captain || '—')}</td><td><div class="table-actions"><button class="mini-button" data-edit-team="${item.id}">Editar</button><button class="mini-button danger" data-delete-row="tournament_teams:${item.id}">Eliminar</button></div></td></tr>`));
}

function renderPlayers() {
  $('#players-table').innerHTML = table(['Jugador', 'Equipo', 'Posición', 'Dorsal', 'Goles', 'Asist.', 'Acciones'], state.players.map((item) => `<tr><td><strong>${esc(item.full_name)}</strong></td><td>${esc(teamName(item.team_id))}</td><td>${esc(item.position)}</td><td>${item.shirt_number}</td><td>${item.goals}</td><td>${item.assists}</td><td><div class="table-actions"><button class="mini-button" data-edit-player="${item.id}">Editar</button><button class="mini-button danger" data-delete-row="tournament_players:${item.id}">Eliminar</button></div></td></tr>`));
}

function renderMatches() {
  $('#matches-table').innerHTML = table(['Fecha', 'Categoría', 'Partido', 'Marcador', 'Lugar', 'Estado', 'Acciones'], state.matches.map((item) => `<tr><td><strong>${esc(item.round_label)}</strong><br><small>${dateTime(item.starts_at)}</small></td><td>${esc(item.category)}</td><td>${esc(teamName(item.home_team_id))}<br><small>vs ${esc(teamName(item.away_team_id))}</small></td><td><strong>${item.home_score ?? '—'} · ${item.away_score ?? '—'}</strong></td><td>${esc(item.venue)}</td><td>${statusLabel(item.status)}</td><td><div class="table-actions"><button class="mini-button" data-edit-match="${item.id}">Editar</button><button class="mini-button danger" data-delete-row="tournament_matches:${item.id}">Eliminar</button></div></td></tr>`));
}

function renderCompetition() {
  const category = $('#competition-category')?.value || 'Sub 7';
  const categoryTeams = state.teams.filter((team) => team.category === category);
  const rows = new Map(categoryTeams.map((team) => [String(team.id), { team, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 }]));
  state.matches.filter((match) => match.category === category && match.status === 'completed').forEach((match) => {
    const home = rows.get(String(match.home_team_id));
    const away = rows.get(String(match.away_team_id));
    if (!home || !away) return;
    const hs = Number(match.home_score || 0); const as = Number(match.away_score || 0);
    home.pj++; away.pj++; home.gf += hs; home.gc += as; away.gf += as; away.gc += hs;
    if (hs > as) { home.pg++; home.pts += 3; away.pp++; }
    else if (hs < as) { away.pg++; away.pts += 3; home.pp++; }
    else { home.pe++; away.pe++; home.pts++; away.pts++; }
  });
  const standings = [...rows.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
  $('#standings-table').innerHTML = table(['#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'DG', 'PTS'], standings.map((row, index) => `<tr><td><strong>${index + 1}</strong></td><td><strong>${esc(row.team.name)}</strong></td><td>${row.pj}</td><td>${row.pg}</td><td>${row.pe}</td><td>${row.pp}</td><td>${row.gf - row.gc}</td><td><strong>${row.pts}</strong></td></tr>`));
  const teamIds = new Set(categoryTeams.map((team) => String(team.id)));
  const scorers = state.players.filter((player) => teamIds.has(String(player.team_id))).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  $('#scorers-table').innerHTML = table(['#', 'Jugador', 'Equipo', 'Goles', 'Asist.'], scorers.map((player, index) => `<tr><td>${index + 1}</td><td><strong>${esc(player.full_name)}</strong></td><td>${esc(teamName(player.team_id))}</td><td><strong>${player.goals}</strong></td><td>${player.assists}</td></tr>`));
}

function renderGallery() {
  $('#gallery-grid').innerHTML = state.gallery.length ? state.gallery.map((item) => `<article class="gallery-card surface"><img src="${esc(galleryImageUrl(item))}" alt="${esc(item.alt_text || item.caption)}" loading="lazy" decoding="async"><div><strong>${esc(item.caption)}</strong><button data-delete-photo="${item.id}">Eliminar</button></div></article>`).join('') : emptyState('Las fotografías publicadas aparecerán aquí.');
}

function galleryImageUrl(item) {
  if (item?.image_url) return item.image_url;
  if (!item?.storage_path) return '';
  const encodedPath = item.storage_path.split('/').map(encodeURIComponent).join('/');
  return `${SUPABASE_URL}/storage/v1/object/public/tournament-gallery/${encodedPath}`;
}

function renderSettings() {
  const settings = state.settings || { venue_name: 'Sede por confirmar', venue_address: 'Santiago de Chile', maps_url: '' };
  $('#venue-preview-name').textContent = settings.venue_name;
  $('#venue-preview-address').textContent = settings.venue_address;
  const form = $('#settings-form');
  form.elements.venue_name.value = settings.venue_name;
  form.elements.venue_address.value = settings.venue_address;
  form.elements.maps_url.value = settings.maps_url || '';
  const matchVenue = $('#match-form [name="venue"]');
  if (!matchVenue.value) matchVenue.value = settings.venue_name === 'Sede por confirmar' ? settings.venue_address : settings.venue_name;
}

function renderDelegates() {
  $('#delegates-table').innerHTML = table(['Correo', 'Estado', 'Desde'], state.delegates.map((item) => `<tr><td><strong>${esc(item.email)}</strong></td><td>${statusLabel(item.status)}</td><td>${dateTime(item.created_at)}</td></tr>`));
}

function teamName(id) {
  return state.teams.find((team) => String(team.id) === String(id))?.name || 'Por definir';
}

function populateSelects() {
  const registrationSelect = $('#payment-form [name="registration_id"]');
  const currentRegistration = registrationSelect.value;
  registrationSelect.innerHTML = '<option value="">Sin vincular</option>' + state.registrations.map((item) => `<option value="${item.id}">${esc(item.team_name)} · ${esc(item.categories.join(', '))}</option>`).join('');
  registrationSelect.value = currentRegistration;
  const teamOptions = '<option value="">Seleccionar</option>' + state.teams.map((team) => `<option value="${team.id}">${esc(team.name)} · ${esc(team.category)}</option>`).join('');
  ['#player-form [name="team_id"]', '#match-form [name="home_team_id"]', '#match-form [name="away_team_id"]'].forEach((selector) => { const node = $(selector); const current = node.value; node.innerHTML = teamOptions; node.value = current; });
}

function resetForm(form) {
  form.reset();
  const id = form.elements.id;
  if (id) id.value = '';
  formFeedback(form, '', '');
}

function localInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

async function upsertFromForm(form, tableName, payload) {
  setBusy(form, true); formFeedback(form, 'Guardando…', '');
  try {
    const id = form.elements.id?.value;
    if (id) await rest(tableName, `?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: { ...payload, updated_at: new Date().toISOString() } });
    else await rest(tableName, '', { method: 'POST', body: payload });
    resetForm(form); await loadAll(); formFeedback(form, 'Guardado correctamente.', 'success');
  } catch (error) { formFeedback(form, error.message, 'error'); }
  finally { setBusy(form, false); }
}

async function deleteRow(tableName, id) {
  if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  try { await rest(tableName, `?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); await loadAll(); }
  catch (error) { showFeedback(error.message); }
}

function activatePanel(name) {
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.panel === name));
  $$('.panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panelView === name));
  const button = $(`.nav-item[data-panel="${name}"]`);
  $('#panel-title').textContent = button?.textContent.replace(/\d+/g, '').trim() || 'Panel';
  $('#sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget; const data = new FormData(form);
  $('#login-error').textContent = ''; $('#login-success').textContent = '';
  setBusy(form, true);
  try { await signIn(data.get('email').trim().toLowerCase(), data.get('password')); await showAdmin(); }
  catch (error) { saveSession(null); $('#login-error').textContent = error.message; }
  finally { setBusy(form, false); }
});

$('#signup-button').addEventListener('click', async () => {
  const form = $('#login-form'); const data = new FormData(form);
  $('#login-error').textContent = ''; $('#login-success').textContent = '';
  if (!data.get('email') || String(data.get('password')).length < 8) { $('#login-error').textContent = 'Completa el correo y una contraseña de al menos 8 caracteres.'; return; }
  setBusy(form, true);
  try {
    const result = await signUp(data.get('email').trim().toLowerCase(), data.get('password'));
    if (result === 'active') await showAdmin();
    else $('#login-success').textContent = 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.';
  } catch (error) { saveSession(null); $('#login-error').textContent = error.message; }
  finally { setBusy(form, false); }
});

$('#logout-button').addEventListener('click', async () => {
  try { if (state.session?.access_token) await api('/auth/v1/logout', { method: 'POST' }); } catch {}
  saveSession(null); showLogin();
});

$('#menu-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$$('.nav-item').forEach((button) => button.addEventListener('click', () => activatePanel(button.dataset.panel)));
$$('[data-go-panel]').forEach((button) => button.addEventListener('click', () => activatePanel(button.dataset.goPanel)));
$$('[data-refresh]').forEach((button) => button.addEventListener('click', loadAll));
$('#registration-filter').addEventListener('change', renderRegistrations);
$('#competition-category').addEventListener('change', renderCompetition);

$('#registrations-table').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-save-registration]'); if (!button) return;
  const id = button.dataset.saveRegistration; const select = $(`[data-registration-status="${id}"]`);
  try { await rest('team_registrations', `?id=eq.${id}`, { method: 'PATCH', body: { status: select.value, updated_at: new Date().toISOString() } }); await loadAll(); }
  catch (error) { showFeedback(error.message); }
});

$('#payment-form [name="registration_id"]').addEventListener('change', (event) => {
  const registration = state.registrations.find((item) => item.id === event.target.value);
  if (registration) $('#payment-form [name="academy_name"]').value = registration.team_name;
});
$('#payment-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const players = Number(data.get('player_count')); const due = Number(data.get('amount_due')); const paid = Number(data.get('amount_paid'));
  if (paid > due) { formFeedback(form, 'El monto pagado no puede superar el monto acordado.', 'error'); return; }
  await upsertFromForm(form, 'academy_payments', { registration_id: data.get('registration_id') || null, academy_name: data.get('academy_name').trim(), player_count: players, fee_per_player: null, amount_due: due, amount_paid: paid, payment_method: data.get('payment_method'), payment_reference: data.get('payment_reference').trim() || null, paid_at: data.get('paid_at') || null, notes: data.get('notes').trim() || null, competition_slug: COMPETITION });
});
$('[data-reset-payment]').addEventListener('click', () => { resetForm($('#payment-form')); $('#payment-form [name="player_count"]').value = 1; $('#payment-form [name="amount_due"]').value = 0; $('#payment-form [name="amount_paid"]').value = 0; });
$('#payments-table').addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit-payment]'); const remove = event.target.closest('[data-delete-payment]');
  if (remove) return deleteRow('academy_payments', remove.dataset.deletePayment);
  if (!edit) return; const item = state.payments.find((row) => row.id === edit.dataset.editPayment); const form = $('#payment-form');
  Object.entries(item).forEach(([key, value]) => { if (form.elements[key] && key !== 'payment_status') form.elements[key].value = value ?? ''; });
  $('#payment-form-mode').textContent = 'Editando academia'; form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#team-form').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const d = new FormData(form); await upsertFromForm(form, 'tournament_teams', { name: d.get('name').trim(), abbreviation: d.get('abbreviation').trim().toUpperCase(), category: d.get('category'), primary_color: d.get('primary_color'), shirt_color: d.get('shirt_color').trim(), captain: d.get('captain').trim() || null, is_published: true, competition_slug: COMPETITION }); });
$('#player-form').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const d = new FormData(form); await upsertFromForm(form, 'tournament_players', { team_id: Number(d.get('team_id')), full_name: d.get('full_name').trim(), position: d.get('position'), shirt_number: Number(d.get('shirt_number')), goals: Number(d.get('goals')), assists: Number(d.get('assists')), photo_url: d.get('photo_url').trim() || null, is_published: true, competition_slug: COMPETITION }); });
$('#match-form').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const d = new FormData(form); if (d.get('home_team_id') === d.get('away_team_id')) { formFeedback(form, 'Selecciona dos equipos diferentes.', 'error'); return; } await upsertFromForm(form, 'tournament_matches', { category: d.get('category'), round_label: d.get('round_label').trim(), starts_at: new Date(d.get('starts_at')).toISOString(), venue: d.get('venue').trim(), home_team_id: Number(d.get('home_team_id')), away_team_id: Number(d.get('away_team_id')), home_score: d.get('home_score') === '' ? null : Number(d.get('home_score')), away_score: d.get('away_score') === '' ? null : Number(d.get('away_score')), status: d.get('status'), is_published: true, competition_slug: COMPETITION }); });

document.addEventListener('click', (event) => {
  const remove = event.target.closest('[data-delete-row]');
  if (remove) { const [tableName, id] = remove.dataset.deleteRow.split(':'); deleteRow(tableName, id); return; }
  const teamEdit = event.target.closest('[data-edit-team]');
  if (teamEdit) { const item = state.teams.find((row) => String(row.id) === teamEdit.dataset.editTeam); fillEditor($('#team-form'), item); activatePanel('teams'); }
  const playerEdit = event.target.closest('[data-edit-player]');
  if (playerEdit) { const item = state.players.find((row) => String(row.id) === playerEdit.dataset.editPlayer); fillEditor($('#player-form'), item); activatePanel('players'); }
  const matchEdit = event.target.closest('[data-edit-match]');
  if (matchEdit) { const item = state.matches.find((row) => String(row.id) === matchEdit.dataset.editMatch); fillEditor($('#match-form'), { ...item, starts_at: localInputDate(item.starts_at) }); activatePanel('matches'); }
});

function fillEditor(form, item) {
  Object.entries(item || {}).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; });
  if (!form.elements.id) { const input = document.createElement('input'); input.type = 'hidden'; input.name = 'id'; form.prepend(input); }
  form.elements.id.value = item.id;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('#gallery-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const file = data.get('photo');
  if (!(file instanceof File) || !file.size) return;
  if (!data.get('authorized')) { formFeedback(form, 'Confirma la autorización de los apoderados para publicar.', 'error'); return; }
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!extensions[file.type]) { formFeedback(form, 'Usa una imagen JPG, PNG o WebP.', 'error'); return; }
  if (file.size > 15 * 1024 * 1024) { formFeedback(form, 'La imagen supera los 15 MB.', 'error'); return; }
  setBusy(form, true); formFeedback(form, 'Subiendo fotografía…', '');
  const path = `${COMPETITION}/${Date.now()}-${crypto.randomUUID()}.${extensions[file.type]}`;
  let uploaded = false;
  try {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    await api(`/storage/v1/object/tournament-gallery/${encodedPath}`, { method: 'POST', headers: { 'content-type': file.type, 'cache-control': '31536000', 'x-upsert': 'false' }, body: file });
    uploaded = true;
    await rest('tournament_gallery_photos', '', { method: 'POST', body: { storage_path: path, caption: data.get('caption').trim(), alt_text: data.get('caption').trim(), competition_slug: COMPETITION } });
    resetForm(form); await loadAll(); formFeedback(form, 'Fotografía publicada.', 'success');
  } catch (error) {
    if (uploaded) {
      try { await api(`/storage/v1/object/tournament-gallery/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' }); } catch {}
    }
    formFeedback(form, error.message, 'error');
  }
  finally { setBusy(form, false); }
});

$('#gallery-grid').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete-photo]'); if (!button) return;
  const item = state.gallery.find((row) => String(row.id) === button.dataset.deletePhoto); if (!item || !confirm('¿Eliminar esta fotografía?')) return;
  try { if (item.storage_path) await api(`/storage/v1/object/tournament-gallery/${item.storage_path.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' }); await rest('tournament_gallery_photos', `?id=eq.${item.id}`, { method: 'DELETE' }); await loadAll(); }
  catch (error) { showFeedback(error.message); }
});

$('#settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const mapsUrl = data.get('maps_url').trim();
  if (mapsUrl && !/^https:\/\//i.test(mapsUrl)) {
    formFeedback(form, 'El enlace de Maps debe comenzar con https://', 'error');
    return;
  }
  setBusy(form, true);
  formFeedback(form, 'Publicando dirección…', '');
  try {
    await rest('tournament_settings', `?competition_slug=eq.${COMPETITION}`, {
      method: 'PATCH',
      body: {
        venue_name: data.get('venue_name').trim(),
        venue_address: data.get('venue_address').trim(),
        maps_url: mapsUrl || null,
        is_published: true,
        updated_by: state.session.user.id,
        updated_at: new Date().toISOString()
      }
    });
    await loadAll();
    formFeedback(form, 'Dirección publicada en la web.', 'success');
  } catch (error) {
    formFeedback(form, error.message, 'error');
  } finally {
    setBusy(form, false);
  }
});

$('#delegate-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const email = new FormData(form).get('email').trim().toLowerCase(); setBusy(form, true);
  try { const result = await rpc('invite_tournament_delegate', { p_email: email }); resetForm(form); await loadAll(); formFeedback(form, result === 'active' ? 'Administrador activado.' : 'Correo autorizado. Ya puede crear su acceso.', 'success'); }
  catch (error) { formFeedback(form, error.message, 'error'); }
  finally { setBusy(form, false); }
});

(async function boot() {
  state.session = readSession();
  if (!state.session) { showLogin(); return; }
  try { await ensureAdmin(); await showAdmin(); }
  catch { saveSession(null); showLogin(); }
})();

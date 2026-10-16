const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav');

function closeMenu() {
  nav.classList.remove('open');
  document.body.classList.remove('menu-open');
  menuButton.setAttribute('aria-expanded', 'false');
}

menuButton.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  document.body.classList.toggle('menu-open', isOpen);
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('open')) closeMenu();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 760 && nav.classList.contains('open')) closeMenu();
});

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

const form = document.querySelector('#team-form');
const formError = document.querySelector('#form-error');
const formSuccess = document.querySelector('#form-success');
const submitButton = form.querySelector('.submit-button');
const submitLabel = submitButton.querySelector('span');

document.querySelectorAll('[data-category]').forEach((card) => {
  card.addEventListener('click', () => {
    const wanted = card.dataset.category;
    const input = [...form.querySelectorAll('[name="category"]')].find((item) => item.value === wanted);
    if (input) input.checked = true;
    document.querySelector('#inscripcion').scrollIntoView({ behavior: 'smooth' });
  });
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.textContent = '';
  formSuccess.textContent = '';

  const data = new FormData(form);
  const teamName = String(data.get('team') || '').trim();
  const managerName = String(data.get('manager') || '').trim();
  const whatsapp = String(data.get('phone') || '').trim();
  const categories = data.getAll('category').map(String);
  const message = String(data.get('message') || '').trim();
  const website = String(data.get('website') || '').trim();
  const consentTerms = data.get('consent_terms') === 'on';
  const consentGuardians = data.get('consent_guardians') === 'on';
  const phoneDigits = whatsapp.replace(/\D/g, '');

  if (!teamName || !managerName || !whatsapp) {
    formError.textContent = 'Completa el club, el responsable y el WhatsApp de contacto.';
    return;
  }
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    formError.textContent = 'Ingresa un número de WhatsApp válido.';
    return;
  }
  if (!categories.length) {
    formError.textContent = 'Selecciona al menos una categoría.';
    return;
  }

  if (!consentTerms || !consentGuardians) {
    formError.textContent = 'Debes aceptar los términos y la declaración de autorización de los apoderados para continuar.';
    return;
  }

  submitButton.disabled = true;
  submitLabel.textContent = 'Guardando solicitud…';

  try {
    const response = await fetch('/api/registrations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        team_name: teamName,
        manager_name: managerName,
        whatsapp,
        categories,
        message,
        website,
        consent: { terms: consentTerms, guardians: consentGuardians, version: '2026-10-v1' }
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No pudimos registrar el equipo.');

    form.reset();
    formSuccess.textContent = '¡Solicitud registrada! Tu equipo quedó guardado y la organización te contactará para confirmar el cupo.';
    formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    formError.textContent = error.message || 'Ocurrió un problema. Intenta nuevamente en unos minutos.';
  } finally {
    submitButton.disabled = false;
    submitLabel.textContent = 'Registrar mi equipo';
  }
});

const competitionState = {
  tab: 'standings',
  category: 'Sub 7',
  data: { teams: [], players: [], matches: [], settings: null }
};

const competitionContent = document.querySelector('#competition-content');
const competitionStatus = document.querySelector('#competition-status');
const categorySelect = document.querySelector('#competition-category');
const tabButtons = [...document.querySelectorAll('[data-tab]')];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function safeColor(value) {
  const color = String(value || '');
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#173b25';
}

function teamInitials(team) {
  if (team?.abbreviation) return String(team.abbreviation).slice(0, 4).toUpperCase();
  return String(team?.name || 'EQ').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function badge(team) {
  return '<span class="team-badge" style="--team-color:' + safeColor(team?.primary_color) + '">' + escapeHtml(teamInitials(team)) + '</span>';
}

function teamById(id) {
  return competitionState.data.teams.find((team) => String(team.id) === String(id));
}

function isFinished(match) {
  const status = String(match.status || '').toLowerCase();
  return ['finished', 'completed', 'finalizado', 'played', 'terminado'].includes(status);
}

function categoryItems() {
  const selected = competitionState.category;
  return {
    teams: competitionState.data.teams.filter((team) => team.category === selected),
    players: competitionState.data.players.filter((player) => {
      const team = teamById(player.team_id);
      return (player.category || team?.category) === selected;
    }),
    matches: competitionState.data.matches.filter((match) => match.category === selected)
  };
}

function computeStandings(teams, matches) {
  const rows = new Map(teams.map((team) => [String(team.id), {
    team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0
  }]));

  matches.filter(isFinished).forEach((match) => {
    const home = rows.get(String(match.home_team_id));
    const away = rows.get(String(match.away_team_id));
    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);
    if (!home || !away || !Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return;
    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;
    if (homeScore > awayScore) {
      home.won += 1; away.lost += 1; home.points += 3;
    } else if (awayScore > homeScore) {
      away.won += 1; home.lost += 1; away.points += 3;
    } else {
      home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1;
    }
  });

  return [...rows.values()].sort((a, b) =>
    b.points - a.points ||
    (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor ||
    String(a.team.name).localeCompare(String(b.team.name), 'es')
  );
}

function emptyState(title, text) {
  return '<div class="empty-state"><div><img src="/goat-icon.png" alt=""><h3>' +
    escapeHtml(title) + '</h3><p>' + escapeHtml(text) + '</p></div></div>';
}

function renderStandings(teams, matches) {
  if (!teams.length) return emptyState('Posiciones por estrenar', 'Cuando se confirmen los primeros equipos de esta categoría, la tabla aparecerá aquí.');
  const rows = computeStandings(teams, matches);
  return '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Pos.</th><th>Equipo</th><th class="numeric">PJ</th><th class="numeric">G</th><th class="numeric">E</th><th class="numeric">P</th><th class="numeric">GF</th><th class="numeric">GC</th><th class="numeric">DG</th><th class="numeric">Pts.</th></tr></thead><tbody>' +
    rows.map((row, index) => '<tr><td class="rank">' + (index + 1) + '</td><td><div class="team-cell">' + badge(row.team) + '<span>' + escapeHtml(row.team.name) + '</span></div></td><td class="numeric">' + row.played + '</td><td class="numeric">' + row.won + '</td><td class="numeric">' + row.drawn + '</td><td class="numeric">' + row.lost + '</td><td class="numeric">' + row.goalsFor + '</td><td class="numeric">' + row.goalsAgainst + '</td><td class="numeric">' + (row.goalsFor - row.goalsAgainst) + '</td><td class="numeric points">' + row.points + '</td></tr>').join('') +
    '</tbody></table></div>';
}

function formatMatchDate(value) {
  if (!value) return { date: 'Por confirmar', time: '—' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: 'Por confirmar', time: '—' };
  return {
    date: new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', weekday: 'short', day: '2-digit', month: 'short' }).format(date),
    time: new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
  };
}

function renderMatches(matches) {
  if (!matches.length) return emptyState('Fixture en preparación', 'Los partidos de esta categoría aparecerán apenas la organización publique la programación.');
  const ordered = [...matches].sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0));
  return '<div class="match-list">' + ordered.map((match) => {
    const home = teamById(match.home_team_id) || { name: 'Por confirmar' };
    const away = teamById(match.away_team_id) || { name: 'Por confirmar' };
    const when = formatMatchDate(match.starts_at);
    const finished = isFinished(match);
    const score = finished ? escapeHtml(match.home_score) + ' — ' + escapeHtml(match.away_score) : when.time;
    return '<article class="match-card"><div class="match-meta"><small>' + escapeHtml(match.round_label || 'Próxima fecha') + '</small><strong>' + escapeHtml(when.date) + '</strong></div>' +
      '<div class="match-team">' + badge(home) + '<span>' + escapeHtml(home.name) + '</span></div>' +
      '<div class="match-score ' + (finished ? '' : 'upcoming') + '">' + score + '</div>' +
      '<div class="match-team away"><span>' + escapeHtml(away.name) + '</span>' + badge(away) + '</div>' +
      '<div class="match-state"><small>' + (finished ? 'Finalizado' : 'Cancha') + '</small><strong>' + escapeHtml(finished ? 'Resultado oficial' : (match.venue || 'Por confirmar')) + '</strong></div></article>';
  }).join('') + '</div>';
}

function renderTeams(teams) {
  if (!teams.length) return emptyState('Equipos por confirmar', 'Las academias aprobadas para esta categoría aparecerán aquí con su identidad oficial.');
  return '<div class="team-grid-public">' + teams.map((team) =>
    '<article class="public-team-card">' + badge(team) + '<div><strong>' + escapeHtml(team.name) + '</strong><small>' + escapeHtml(team.category) + '</small></div></article>'
  ).join('') + '</div>';
}

function renderPlayers(players) {
  if (!players.length) return emptyState('Planteles en preparación', 'Los jugadores se publicarán cuando los equipos completen y validen sus planteles.');
  const ordered = [...players].sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'es'));
  return '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th>Posición</th><th class="numeric">Goles</th><th class="numeric">Asist.</th></tr></thead><tbody>' +
    ordered.map((player) => {
      const team = teamById(player.team_id) || { name: '—' };
      return '<tr><td class="rank">' + escapeHtml(player.shirt_number || '—') + '</td><td><strong>' + escapeHtml(player.full_name) + '</strong></td><td><div class="team-cell">' + badge(team) + '<span>' + escapeHtml(team.name) + '</span></div></td><td>' + escapeHtml(player.position || 'Jugador') + '</td><td class="numeric">' + Number(player.goals || 0) + '</td><td class="numeric">' + Number(player.assists || 0) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function renderScorers(players) {
  const ordered = [...players].filter((player) => Number(player.goals || 0) > 0).sort((a, b) =>
    Number(b.goals || 0) - Number(a.goals || 0) ||
    Number(b.assists || 0) - Number(a.assists || 0) ||
    String(a.full_name).localeCompare(String(b.full_name), 'es')
  );
  if (!ordered.length) return emptyState('La carrera de goleadores comienza pronto', 'Los goles oficiales se actualizarán después de cada fecha.');
  return '<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Pos.</th><th>Jugador</th><th>Equipo</th><th class="numeric">Goles</th><th class="numeric">Asist.</th></tr></thead><tbody>' +
    ordered.map((player, index) => {
      const team = teamById(player.team_id) || { name: '—' };
      return '<tr><td class="rank">' + (index + 1) + '</td><td><strong>' + escapeHtml(player.full_name) + '</strong></td><td><div class="team-cell">' + badge(team) + '<span>' + escapeHtml(team.name) + '</span></div></td><td class="numeric points">' + Number(player.goals || 0) + '</td><td class="numeric">' + Number(player.assists || 0) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function renderCompetition() {
  const items = categoryItems();
  const renderers = {
    standings: () => renderStandings(items.teams, items.matches),
    matches: () => renderMatches(items.matches),
    teams: () => renderTeams(items.teams),
    players: () => renderPlayers(items.players),
    scorers: () => renderScorers(items.players)
  };
  competitionContent.innerHTML = renderers[competitionState.tab]();
  competitionContent.classList.add('ready');
}

function applyVenue(settings) {
  const venueName = String(settings?.venue_name || 'Sede por confirmar');
  const venueAddress = String(settings?.venue_address || 'Santiago de Chile');
  const mapsUrl = /^https:\/\//.test(String(settings?.maps_url || '')) ? String(settings.maps_url) : '';

  document.querySelectorAll('[data-venue-name]').forEach((node) => { node.textContent = venueName; });
  document.querySelectorAll('[data-venue-address]').forEach((node) => { node.textContent = venueAddress; });
  document.querySelectorAll('[data-venue-map]').forEach((node) => {
    node.hidden = !mapsUrl;
    if (mapsUrl) node.href = mapsUrl;
    else node.removeAttribute('href');
  });
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    competitionState.tab = button.dataset.tab;
    tabButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    renderCompetition();
  });
});

categorySelect.addEventListener('change', () => {
  competitionState.category = categorySelect.value;
  renderCompetition();
});

async function loadCompetition() {
  try {
    const response = await fetch('/api/public-data', { headers: { accept: 'application/json' } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo cargar la competencia.');
    competitionState.data = {
      teams: Array.isArray(result.teams) ? result.teams : [],
      players: Array.isArray(result.players) ? result.players : [],
      matches: Array.isArray(result.matches) ? result.matches : [],
      settings: result.settings && typeof result.settings === 'object' ? result.settings : null
    };
    const firstCategoryWithData = ['Sub 7', 'Sub 9', 'Sub 11', 'Sub 13', 'Sub 15'].find((category) =>
      competitionState.data.teams.some((team) => team.category === category) ||
      competitionState.data.matches.some((match) => match.category === category)
    );
    if (firstCategoryWithData) {
      competitionState.category = firstCategoryWithData;
      categorySelect.value = firstCategoryWithData;
    }
    competitionStatus.hidden = true;
    applyVenue(competitionState.data.settings);
    renderCompetition();
  } catch (error) {
    competitionStatus.innerHTML = '<span>La competencia se está preparando. Vuelve a revisar pronto.</span>';
    applyVenue(null);
  }
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));
loadCompetition();

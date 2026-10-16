import { supabaseRest } from "./supabase-rest.js";

/** Fechas del torneo. Horario de Chile continental en noviembre y diciembre: UTC-3. */
export const EDITIONS = [
  { slug: "2026-11", name: "Primera fecha", label: "7 y 8 de noviembre", start: "2026-11-07T09:00:00-03:00", end: "2026-11-08T14:00:00-03:00" },
  { slug: "2026-12", name: "Cierre de año", label: "5 y 6 de diciembre", start: "2026-12-05T09:00:00-03:00", end: "2026-12-06T14:00:00-03:00" }
];

export const CATEGORIES = ["Sub 7", "Sub 9", "Sub 11", "Sub 13", "Sub 15"];

/** Cupos por categoría: variable GOAT_CAPACITY_PER_CATEGORY (número). Sin definir = sin límite. */
export function capacityPerCategory() {
  const value = Number.parseInt(process.env.GOAT_CAPACITY_PER_CATEGORY || "", 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function activeEditions(now = new Date()) {
  return EDITIONS.filter((edition) => new Date(edition.end) > now);
}

/**
 * Disponibilidad por edición y categoría, contando los equipos confirmados (goat_teams).
 * Si no se puede leer la tabla, no se bloquea nada (falla abierta).
 */
export async function availability(now = new Date()) {
  const capacity = capacityPerCategory();
  let teams = [];
  let known = true;
  try {
    teams = await supabaseRest("goat_teams?select=category,edition");
  } catch {
    try {
      teams = await supabaseRest("goat_teams?select=category");
    } catch {
      known = false;
    }
  }
  const first = EDITIONS[0].slug;
  const list = activeEditions(now).map((edition) => {
    const categories = {};
    for (const category of CATEGORIES) {
      const taken = known
        ? teams.filter((team) => team.category === category && (team.edition || first) === edition.slug).length
        : 0;
      categories[category] = { capacity, taken, full: Boolean(capacity && known && taken >= capacity) };
    }
    const full = Boolean(capacity && known) && CATEGORIES.every((category) => categories[category].full);
    return { ...edition, categories, full };
  });
  const open = list.find((edition) => !edition.full) || null;
  return { editions: list, current: list[0]?.slug || null, open: open?.slug || null };
}

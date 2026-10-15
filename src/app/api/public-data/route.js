import { supabaseRest } from "../../../lib/supabase-rest.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" }
  });
}

async function readTable(path) {
  try {
    return await supabaseRest(path);
  } catch {
    return [];
  }
}

export async function GET() {
  const [teams, players, matches, settingsRows] = await Promise.all([
    readTable("goat_teams?select=*&order=name.asc"),
    readTable("goat_players?select=*&order=full_name.asc"),
    readTable("goat_matches?select=*&order=starts_at.asc"),
    readTable("goat_settings?select=*")
  ]);

  return json({
    teams: Array.isArray(teams) ? teams : [],
    players: Array.isArray(players) ? players : [],
    matches: Array.isArray(matches) ? matches : [],
    settings: Array.isArray(settingsRows) ? settingsRows[0] || null : null
  });
}

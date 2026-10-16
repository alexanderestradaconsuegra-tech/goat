import { supabaseRest } from "../../../lib/supabase-rest.js";
import { availability } from "../../../lib/editions.js";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" }
  });
}

export async function POST(request) {
  const payload = await request.json().catch(() => ({}));
  const teamName = String(payload.team_name || "").trim();
  const managerName = String(payload.manager_name || "").trim();
  const whatsapp = String(payload.whatsapp || "").trim();
  const categories = Array.isArray(payload.categories) ? payload.categories.map(String).filter(Boolean) : [];
  const message = String(payload.message || "").trim();
  const website = String(payload.website || "").trim();
  const requestedEdition = String(payload.edition || "").trim();
  const consent = payload.consent && typeof payload.consent === "object" ? payload.consent : {};

  if (website) return json({ ok: true });
  if (!teamName || !managerName || !whatsapp || !categories.length) {
    return json({ error: "Faltan datos obligatorios." }, 400);
  }

  if (consent.terms !== true || consent.guardians !== true) {
    return json({ error: "Debes aceptar los terminos y la autorizacion de los apoderados." }, 400);
  }

  const phoneDigits = whatsapp.replace(/\D/g, "");
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    return json({ error: "WhatsApp invalido." }, 400);
  }

  const state = await availability();
  const edition = state.editions.find((item) => item.slug === (requestedEdition || state.current));
  if (!edition) return json({ error: "Esa fecha del torneo ya no recibe inscripciones." }, 400);
  const full = categories.filter((category) => edition.categories[category]?.full);
  if (full.length) {
    return json(
      {
        error: `Cupos completos en ${full.join(", ")} para el ${edition.label}.${state.open && state.open !== edition.slug ? " Puedes inscribirte en la próxima fecha." : ""}`,
        next: state.open && state.open !== edition.slug ? state.open : null
      },
      409
    );
  }

  await supabaseRest("goat_registrations", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: {
      team_name: teamName,
      manager_name: managerName,
      whatsapp,
      categories,
      message: `${message}${message ? "\n\n" : ""}[Edición ${edition.slug}] [Consentimiento ${String(consent.version || "v1").slice(0, 20)}: terminos+privacidad y autorizacion de apoderados (datos e imagen) aceptados el ${new Date().toISOString()}]`
    }
  });

  return json({ ok: true }, 201);
}

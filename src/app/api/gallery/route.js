import { supabaseRest, supabasePublicUrl } from "../../../lib/supabase-rest.js";

export const dynamic = "force-dynamic";

const COMPETITION = "goat-league-2026";

export async function GET() {
  try {
    const rows = await supabaseRest(
      `tournament_gallery_photos?competition_slug=eq.${COMPETITION}&select=id,storage_path,image_url,caption,alt_text&order=sort_order.asc,created_at.desc&limit=48`
    );
    const base = supabasePublicUrl();
    const photos = rows
      .map((row) => {
        const url =
          row.image_url ||
          (row.storage_path
            ? `${base}/storage/v1/object/public/tournament-gallery/${row.storage_path.split("/").map(encodeURIComponent).join("/")}`
            : "");
        return { id: row.id, url, caption: row.caption || "", alt: row.alt_text || row.caption || "Fotografía del torneo" };
      })
      .filter((photo) => photo.url);
    return Response.json({ photos }, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ photos: [] }, { headers: { "cache-control": "no-store" } });
  }
}

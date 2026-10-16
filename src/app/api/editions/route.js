import { availability } from "../../../lib/editions.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await availability();
  return Response.json(data, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
}

import { expirarHolds } from "@/lib/services/reservas";

export async function POST(request: Request) {
  const esperado = process.env.CRON_SECRET?.trim();
  const recibido = (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!esperado || recibido !== esperado) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const expiradas = await expirarHolds();

  return Response.json(
    { ok: true, expiradas },
    { headers: { "cache-control": "no-store" } },
  );
}

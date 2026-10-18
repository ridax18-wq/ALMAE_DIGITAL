import { procesarWebhookMock, verificarFirmaMock } from "@/lib/payments/orquestador";
import { esProduccion } from "@/lib/payments/gateway";
import { ipDelCliente, limitarLlamadas } from "@/lib/services/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proveedor: string }> },
) {
  const { proveedor } = await params;

  if (proveedor !== "mock") {
    return Response.json({ ok: false }, { status: 404 });
  }

  if (esProduccion()) {
    return Response.json({ ok: false }, { status: 403 });
  }

  const limite = limitarLlamadas(`webhook:${ipDelCliente(request)}`, 30, 60_000);
  if (!limite.permitido) {
    return Response.json({ ok: false }, { status: 429 });
  }

  const cuerpoCrudo = await request.text();
  const firma = (request.headers.get("x-signature") ?? "").trim();

  if (!verificarFirmaMock(cuerpoCrudo, firma)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const resultado = await procesarWebhookMock(cuerpoCrudo, firma);

  return Response.json(
    { ok: resultado.ok, detalle: resultado.detalle },
    { status: resultado.status },
  );
}

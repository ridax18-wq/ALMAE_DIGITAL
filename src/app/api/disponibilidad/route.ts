import { z } from "zod";
import { disponibilidadDeDia } from "@/lib/services/disponibilidad";
import { ipDelCliente, limitarLlamadas } from "@/lib/services/rate-limit";

const consultaSchema = z.object({
  servicio: z.string().min(2).max(80),
  variante: z.uuid("Identificador de duración inválido"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = consultaSchema.safeParse({
    servicio: url.searchParams.get("servicio"),
    variante: url.searchParams.get("variante"),
    fecha: url.searchParams.get("fecha"),
  });

  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Parámetros inválidos" },
      { status: 400 },
    );
  }

  const limite = limitarLlamadas(
    `disponibilidad:${ipDelCliente(request)}`,
    60,
    60_000,
  );

  if (!limite.permitido) {
    return Response.json(
      { ok: false, error: "Demasiadas consultas. Espera unos segundos." },
      { status: 429, headers: { "retry-after": String(Math.ceil(limite.reintentaEnMs / 1000)) } },
    );
  }

  const { servicio, variante, fecha } = parsed.data;
  const resultado = await disponibilidadDeDia(servicio, variante, fecha);

  if (!resultado.ok) {
    return Response.json(
      { ok: false, error: "No hay horarios para esa selección" },
      { status: 404 },
    );
  }

  return Response.json(resultado, {
    headers: { "cache-control": "no-store" },
  });
}

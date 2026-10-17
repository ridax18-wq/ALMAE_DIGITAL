import { z } from "zod";
import { crearReserva } from "@/lib/services/reservas";
import { ipDelCliente, limitarLlamadas } from "@/lib/services/rate-limit";

const reservaSchema = z.object({
  servicio: z.string().min(2).max(80),
  variante: z.uuid("Duración inválida"),
  inicio: z.iso.datetime({ offset: true, message: "Horario inválido" }),
  nombre: z.string().trim().min(2, "Ingresa tu nombre").max(80),
  telefono: z
    .string()
    .trim()
    .regex(/^9\d{8}$/, "Ingresa un celular válido (9 dígitos, empieza con 9)"),
  email: z.union([z.literal(""), z.email("Correo inválido")]).optional(),
  notas: z.string().trim().max(300).optional(),
  consent: z.literal(true, { message: "Debes autorizar el contacto por WhatsApp" }),
  utm: z
    .object({
      source: z.string().max(60).optional(),
      medium: z.string().max(60).optional(),
      campaign: z.string().max(60).optional(),
      sourceId: z.uuid().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const limite = limitarLlamadas(`reservas:${ipDelCliente(request)}`, 5, 60_000);

  if (!limite.permitido) {
    return Response.json(
      { ok: false, error: "Demasiados intentos. Espera un minuto e intenta de nuevo." },
      { status: 429, headers: { "retry-after": String(Math.ceil(limite.reintentaEnMs / 1000)) } },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
  }

  const parsed = reservaSchema.safeParse(cuerpo);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const datos = parsed.data;
  const resultado = await crearReserva({
    servicio: datos.servicio,
    variante: datos.variante,
    inicio: datos.inicio,
    nombre: datos.nombre,
    telefono: datos.telefono,
    email: datos.email ?? "",
    notas: datos.notas ?? "",
    consentimiento: datos.consent,
    utm: datos.utm,
  });

  if (!resultado.ok) {
    return Response.json(
      { ok: false, error: resultado.error },
      { status: 409 },
    );
  }

  return Response.json(
    {
      ok: true,
      token: resultado.token,
      expira: resultado.expira,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

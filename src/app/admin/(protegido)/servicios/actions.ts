"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { registrarAuditoria } from "@/lib/services/auditoria";

async function requerirAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");
  return auth.user;
}

const servicioSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido (minúsculas y guiones)"),
  name: z.string().trim().min(2).max(80),
  description: z.string().max(600).default(""),
  location: z.enum(["consultorio", "domicilio"]),
  instructions: z.string().max(400).default(""),
  sort_order: z.coerce.number().int().min(0).max(99),
});

const varianteSchema = z.object({
  duration_minutes: z.coerce.number().int().min(10).max(240),
  prep_buffer_minutes: z.coerce.number().int().min(0).max(60).default(0),
  price: z.coerce.number().positive(),
  advance_amount: z.coerce.number().min(0).optional(),
});

function parsearVariantes(datos: FormData) {
  const variantes: z.infer<typeof varianteSchema>[] = [];
  for (let i = 0; i < 8; i += 1) {
    const duration = datos.get(`v_${i}_duration`);
    if (!duration) continue;
    const parsed = varianteSchema.safeParse({
      duration_minutes: duration,
      prep_buffer_minutes: datos.get(`v_${i}_prep`) ?? 0,
      price: datos.get(`v_${i}_price`),
      advance_amount: datos.get(`v_${i}_advance`) || undefined,
    });
    if (parsed.success) variantes.push(parsed.data);
  }
  return variantes;
}

export async function guardarServicio(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();

  const servicio = servicioSchema.safeParse({
    slug: datos.get("slug"),
    name: datos.get("name"),
    description: datos.get("description") ?? "",
    location: datos.get("location"),
    instructions: datos.get("instructions") ?? "",
    sort_order: datos.get("sort_order"),
  });

  if (!servicio.success) {
    redirect(
      `/admin/servicios?error=${encodeURIComponent(servicio.error.issues[0]?.message ?? "Datos inválidos")}`,
    );
  }

  const service = createSupabaseServiceClient();
  const variantes = parsearVariantes(datos);

  if (variantes.length === 0) {
    redirect("/admin/servicios/nuevo?error=variantes");
  }

  const servicioIdPrevio = String(datos.get("servicio_id") ?? "");
  const esNuevo = servicioIdPrevio.length === 0;

  const { data: existente } = await service
    .from("services")
    .select("id")
    .eq("slug", servicio.data.slug)
    .maybeSingle();

  if (existente && String(existente.id) !== servicioIdPrevio) {
    redirect("/admin/servicios/nuevo?error=slug_duplicado");
  }

  const datosServicio = {
    slug: servicio.data.slug,
    name: servicio.data.name,
    description: servicio.data.description,
    location: servicio.data.location,
    active: datos.get("active") === "on",
    instructions: servicio.data.instructions,
    sort_order: servicio.data.sort_order,
  };

  let servicioId = servicioIdPrevio;

  if (esNuevo) {
    const { data: nuevo, error } = await service
      .from("services")
      .insert(datosServicio)
      .select("id")
      .single();
    if (error || !nuevo) redirect("/admin/servicios/nuevo?error=insertar");
    servicioId = String(nuevo.id);
  } else {
    const { error } = await service
      .from("services")
      .update(datosServicio)
      .eq("id", servicioId);
    if (error) redirect(`/admin/servicios/${servicioId}?error=actualizar`);
  }

  const { data: actuales } = await service
    .from("service_variants")
    .select("id, duration_minutes")
    .eq("service_id", servicioId);

  const { data: reservasPorVariante } = await service
    .from("bookings")
    .select("service_variant_id");

  const idsOcupados = new Set(
    (reservasPorVariante ?? []).map((r) => String(r.service_variant_id)),
  );

  const idsLibres = (actuales ?? [])
    .filter((v) => !idsOcupados.has(String(v.id)))
    .map((v) => String(v.id));

  if (idsLibres.length > 0) {
    await service.from("service_variants").delete().in("id", idsLibres);
  }

  const duracionesPreservadas = new Set(
    (actuales ?? [])
      .filter((v) => idsOcupados.has(String(v.id)))
      .map((v) => v.duration_minutes),
  );

  for (const variante of variantes) {
    if (duracionesPreservadas.has(variante.duration_minutes)) continue;

    const { error } = await service.from("service_variants").insert({
      service_id: servicioId,
      duration_minutes: variante.duration_minutes,
      prep_buffer_minutes: variante.prep_buffer_minutes,
      price: variante.price,
      advance_amount: variante.advance_amount ?? null,
    });
    if (error) redirect(`/admin/servicios/${servicioId}?error=variante`);
  }

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: esNuevo ? "servicio.creado" : "servicio.actualizado",
    entity: "services",
    entityId: servicioId,
    after: datosServicio,
  });

  revalidatePath("/admin/servicios");
  revalidatePath("/servicios");
  redirect(`/admin/servicios/${servicioId}?guardado=1`);
}


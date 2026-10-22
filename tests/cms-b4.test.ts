import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { esPromocionVigente } from "@/lib/services/promociones-publicas";
import { obtenerCatalogo, obtenerServicio } from "@/lib/services/catalogo-publico";

describe("Promociones — vigencia (B4)", () => {
  it("sin fechas siempre está vigente", () => {
    expect(esPromocionVigente({ valid_from: null, valid_to: null }, "2026-10-22")).toBe(true);
  });

  it("respeta inicio y vencimiento inclusive", () => {
    const rango = { valid_from: "2026-10-01", valid_to: "2026-10-31" };
    expect(esPromocionVigente(rango, "2026-09-30")).toBe(false);
    expect(esPromocionVigente(rango, "2026-10-01")).toBe(true);
    expect(esPromocionVigente(rango, "2026-10-31")).toBe(true);
    expect(esPromocionVigente(rango, "2026-11-01")).toBe(false);
  });

  it("soporta rangos abiertos", () => {
    expect(esPromocionVigente({ valid_from: "2026-10-01", valid_to: null }, "2027-01-01")).toBe(true);
    expect(esPromocionVigente({ valid_from: null, valid_to: "2026-10-31" }, "2026-11-15")).toBe(false);
  });
});

describe("Servicios — catálogo con imagen y modo (B4)", () => {
  const srv = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const slug = `promo-b4-${Date.now()}`;
  let servicioId = "";
  let mediaId = "";

  beforeAll(async () => {
    const { data: media } = await srv
      .from("media_assets")
      .insert({
        storage_path: `comercial/b4-${Date.now()}.png`,
        mime_type: "image/png",
        bytes: 10,
        alt_text: "prueba b4",
      })
      .select("id")
      .single();
    mediaId = String(media?.id);

    const { data: servicio } = await srv
      .from("services")
      .insert({
        slug,
        name: "Servicio prueba B4",
        description: "desc",
        location: "consultorio",
        active: true,
        sort_order: 99,
        catalog_mode: "reservable",
        image_media_id: mediaId,
      })
      .select("id")
      .single();
    servicioId = String(servicio?.id);

    await srv.from("service_variants").insert({
      service_id: servicioId,
      duration_minutes: 45,
      prep_buffer_minutes: 0,
      amount_cents: 12000,
      deposit_cents: 0,
    });
  });

  afterAll(async () => {
    await srv.from("service_variants").delete().eq("service_id", servicioId);
    await srv.from("services").delete().eq("id", servicioId);
    await srv.from("media_assets").delete().eq("id", mediaId);
  });

  it("expone imagen desde media_assets y modo reservable", async () => {
    const servicio = await obtenerServicio(slug);
    expect(servicio).not.toBeNull();
    expect(servicio?.imagen).toContain("/storage/v1/object/public/almae-media/");
    expect(servicio?.reservable).toBe(true);
    expect(servicio?.modo).toBe("reservable");
  });

  it("cambiar a modo consulta desactiva la reserva en línea", async () => {
    await srv.from("services").update({ catalog_mode: "consulta" }).eq("id", servicioId);
    const servicio = await obtenerServicio(slug);
    expect(servicio?.reservable).toBe(false);
    expect(servicio?.modo).toBe("consulta");
    await srv.from("services").update({ catalog_mode: "reservable" }).eq("id", servicioId);
  });

  it("servicio inactivo desaparece del catálogo", async () => {
    await srv.from("services").update({ active: false }).eq("id", servicioId);
    const catalogo = await obtenerCatalogo();
    expect(catalogo.some((s) => s.slug === slug)).toBe(false);
    await srv.from("services").update({ active: true }).eq("id", servicioId);
  });
});

describe("Promociones — creación e integridad en BD (B4)", () => {
  const srv = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const code = `B4P-${Date.now()}`;

  it("crea una promoción válida y la filtra el RLS público por fechas", async () => {
    const { data: promo, error } = await srv
      .from("promotions")
      .insert({
        code,
        kind: "percent",
        value: 15,
        valid_from: "2026-10-01",
        valid_to: "2026-10-31",
        active: true,
        published: true,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(promo?.id).toBeTruthy();

    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: publicas } = await anon
      .from("promotions")
      .select("code")
      .eq("code", code);
    expect(publicas?.length).toBe(1);

    await srv.from("promotions").delete().eq("code", code);
  });

  it("rechaza valores negativos o porcentaje mayor a 100 en la BD", async () => {
    const { error } = await srv.from("promotions").insert({
      code: `${code}-NEG`,
      kind: "percent",
      value: 150,
      active: true,
      published: true,
    });
    expect(error).not.toBeNull();
  });

  it("una promoción pausada no es visible para el anon", async () => {
    const { data: promo } = await srv
      .from("promotions")
      .insert({ code: `${code}-PAUSA`, kind: "fixed", value: 10, active: false, published: true })
      .select("id, code")
      .single();
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: publicas } = await anon
      .from("promotions")
      .select("id")
      .eq("id", String(promo?.id));
    expect(publicas?.length).toBe(0);
    await srv.from("promotions").delete().eq("id", String(promo?.id));
  });
});

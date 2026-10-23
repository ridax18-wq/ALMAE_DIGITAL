import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  direccionCompleta,
  esUrlMapsSegura,
  urlBusquedaMaps,
  urlComoLlegar,
  urlEmbedMaps,
} from "@/lib/cms/config-publica";
import {
  guardarBorrador,
  obtenerBorrador,
  publicarBorrador,
  descartarBorrador,
} from "@/lib/cms/revisiones-config";

describe("Config pública — utilidades puras (B5.1)", () => {
  it("direccionCompleta une solo partes no vacías", () => {
    expect(
      direccionCompleta({
        calle: "Altos del Rímac 250",
        distrito: "Rímac",
        provincia: "Lima",
        departamento: "Lima",
      }),
    ).toBe("Altos del Rímac 250, Rímac, Lima, Lima");
    expect(
      direccionCompleta({ calle: "Calle 1", distrito: "", provincia: "", departamento: "" }),
    ).toBe("Calle 1");
  });

  it("esUrlMapsSegura acepta solo https de Google Maps", () => {
    expect(esUrlMapsSegura("https://www.google.com/maps/place/Altos+del+Rimac")).toBe(true);
    expect(esUrlMapsSegura("https://maps.google.com/?q=ALMAE")).toBe(true);
    expect(esUrlMapsSegura("https://goo.gl/maps/abc123")).toBe(true);
    expect(esUrlMapsSegura("http://www.google.com/maps?q=x")).toBe(false);
    expect(esUrlMapsSegura("https://evil.com/maps?q=x")).toBe(false);
    expect(esUrlMapsSegura("javascript:alert(1)")).toBe(false);
    expect(esUrlMapsSegura("")).toBe(false);
    expect(esUrlMapsSegura("no es una url")).toBe(false);
  });

  it("urlBusquedaMaps codifica la dirección", () => {
    const url = urlBusquedaMaps("Altos del Rímac 250, Rímac");
    expect(url.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(true);
    expect(url).toContain(encodeURIComponent("Altos del Rímac 250, Rímac"));
  });

  it("urlComoLlegar usa el enlace guardado si es seguro si no, búsqueda", () => {
    const segura = "https://www.google.com/maps/place/Altos+del+R%C3%ADmac+250";
    expect(urlComoLlegar(segura, "otra")).toBe(segura);
    expect(urlComoLlegar("https://otro-sitio.com/x", "Altos del Rímac 250"))
      .toBe(urlBusquedaMaps("Altos del Rímac 250"));
  });

  it("urlEmbedMaps nunca inventa coordenadas: siempre embebe una búsqueda", () => {
    const embed = urlEmbedMaps("", "Altos del Rímac 250, Rímac, Lima");
    expect(embed).toBe(
      `https://www.google.com/maps?q=${encodeURIComponent("Altos del Rímac 250, Rímac, Lima")}&output=embed`,
    );
    expect(embed).not.toMatch(/@-?\d/);
    expect(urlEmbedMaps("", "   ")).toBe("");
  });
});

describe("Config pública — borradores y publicación (B5.1)", () => {
  const srv = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let actorId = "";
  let localIntroOriginal = "";
  const MARKER = "PRUEBA B51 SIN PUBLICAR";

  beforeAll(async () => {
    const { data: admin } = await srv.auth.admin.listUsers({ perPage: 1 });
    actorId = String(admin?.users[0]?.id ?? "");
    expect(actorId).not.toBe("");

    const { data: settings } = await srv
      .from("business_settings")
      .select("id, local_intro")
      .limit(1)
      .maybeSingle();
    localIntroOriginal = String(settings?.local_intro ?? "");
  });

  afterAll(async () => {
    await descartarBorrador("ubicacion");
    await srv
      .from("business_settings")
      .update({ local_intro: localIntroOriginal })
      .neq("id", "00000000-0000-0000-0000-000000000000");
  });

  it("el anon nunca ve borradores de configuración en content_revisions", async () => {
    await guardarBorrador(
      "ubicacion",
      {
        address_street: "Calle falsa 123",
        address_district: "Rímac",
        address_province: "Lima",
        address_department: "Lima",
        address_reference: "",
        maps_url: "",
        local_intro: MARKER,
      },
      actorId,
    );

    const borrador = await obtenerBorrador<{ local_intro: string }>("ubicacion");
    expect(borrador?.valores.local_intro).toBe(MARKER);

    const { data: visibles } = await anon
      .from("content_revisions")
      .select("id, snapshot")
      .limit(50);
    const fuga = (visibles ?? []).some((fila) =>
      JSON.stringify(fila.snapshot).includes(MARKER),
    );
    expect(fuga).toBe(false);
    expect((visibles ?? []).length).toBe(0);
  });

  it("el borrador no cambia el sitio público hasta publicar", async () => {
    const { data: antes } = await srv
      .from("business_settings")
      .select("local_intro")
      .limit(1)
      .maybeSingle();
    expect(String(antes?.local_intro ?? "")).not.toBe(MARKER);

    const ok = await publicarBorrador("ubicacion", actorId);
    expect(ok).toBe(true);

    const { data: despues } = await srv
      .from("business_settings")
      .select("local_intro")
      .limit(1)
      .maybeSingle();
    expect(String(despues?.local_intro ?? "")).toBe(MARKER);

    const borradorRestante = await obtenerBorrador("ubicacion");
    expect(borradorRestante).toBeNull();
  });
});

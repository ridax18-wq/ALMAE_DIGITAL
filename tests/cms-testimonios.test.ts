import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { obtenerTestimonios } from "@/lib/cms/testimonios-publicos";

describe("Testimonios — consentimiento y publicación (B5)", () => {
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
  let idPublicado = "";
  let idBorrador = "";
  let idSinConsentimiento = "";

  beforeAll(async () => {
    const { data: a } = await srv
      .from("testimonials")
      .insert({
        patient_name: "Paciente B5",
        quote: "Testimonio de prueba publicado con consentimiento.",
        rating: 5,
        patient_consent: true,
        consent_at: new Date().toISOString(),
        status: "published",
      })
      .select("id")
      .single();
    idPublicado = String(a?.id);

    const { data: b } = await srv
      .from("testimonials")
      .insert({
        patient_name: "Paciente B5 borrador",
        quote: "Testimonio en borrador con consentimiento.",
        patient_consent: true,
        consent_at: new Date().toISOString(),
        status: "draft",
      })
      .select("id")
      .single();
    idBorrador = String(b?.id);

    const { data: c } = await srv
      .from("testimonials")
      .insert({
        patient_name: "Paciente B5 sin consent",
        quote: "Testimonio sin consentimiento, no debe publicarse.",
        patient_consent: false,
        status: "draft",
      })
      .select("id")
      .single();
    idSinConsentimiento = String(c?.id);
  });

  afterAll(async () => {
    await srv.from("testimonials").delete().in("id", [idPublicado, idBorrador, idSinConsentimiento]);
  });

  it("la BD impide publicar sin consentimiento", async () => {
    const { error } = await srv
      .from("testimonials")
      .update({ status: "published" })
      .eq("id", idSinConsentimiento);
    expect(error).not.toBeNull();
  });

  it("el anon solo ve testimonios publicados con consentimiento", async () => {
    const { data } = await anon
      .from("testimonials")
      .select("id, patient_name")
      .eq("id", idPublicado);
    expect(data?.length).toBe(1);

    const { data: borrador } = await anon
      .from("testimonials")
      .select("id")
      .eq("id", idBorrador);
    expect(borrador?.length).toBe(0);
  });

  it("obtenerTestimonios expone solo el publicado", async () => {
    const listado = await obtenerTestimonios();
    const ids = listado.map((t) => t.id);
    expect(ids).toContain(idPublicado);
    expect(ids).not.toContain(idBorrador);
    expect(ids).not.toContain(idSinConsentimiento);
  });

  it("consent_at debe existir cuando hay consentimiento", async () => {
    const { data } = await srv
      .from("testimonials")
      .insert({
        patient_name: "Sin fecha",
        quote: "Fila que viola el CHECK de consentimiento con fecha.",
        patient_consent: true,
        consent_at: null,
        status: "draft",
      })
      .select("id");
    expect(data === null || data.length === 0).toBe(true);
  });
});

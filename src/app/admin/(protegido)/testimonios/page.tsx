import type { Metadata } from "next";
import Link from "next/link";
import {
  alternarTestimonio,
  eliminarTestimonio,
} from "@/app/admin/(protegido)/testimonios/actions";
import { urlPublicaMedia } from "@/lib/cms/media";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Testimonios",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminTestimoniosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; guardado?: string; eliminado?: string }>;
}) {
  const { error, guardado, eliminado } = await searchParams;
  const supabase = createSupabaseServiceClient();

  const { data: testimonios } = await supabase
    .from("testimonials")
    .select(
      "id, patient_name, quote, rating, patient_consent, consent_at, status, media:media_assets!testimonials_media_id_fkey(storage_path)",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Testimonios</h1>
            <p className="mt-1 text-sm text-ink-500">
              Solo se publican testimonios con consentimiento expreso del paciente
            </p>
          </div>
          <Link
            href="/admin/testimonios/nuevo"
            className="inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            + Nuevo testimonio
          </Link>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error === "sin_consentimiento"
              ? "No se puede publicar: falta el consentimiento del paciente."
              : decodeURIComponent(error)}
          </p>
        ) : null}
        {guardado ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Testimonio guardado.
          </p>
        ) : null}
        {eliminado ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Testimonio eliminado.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(testimonios ?? []).map((t) => {
            const mediaPath = Array.isArray(t.media)
              ? (t.media[0] as { storage_path?: string } | undefined)?.storage_path
              : (t.media as { storage_path?: string } | null)?.storage_path;
            return (
              <article key={String(t.id)} className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-ink-900">{t.patient_name}</h2>
                  <div className="flex flex-wrap justify-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        t.status === "published"
                          ? "border border-green-200 bg-green-50 text-green-900"
                          : "border border-sand-200 bg-sand-100 text-ink-700"
                      }`}
                    >
                      {t.status === "published" ? "publicado" : "borrador"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        t.patient_consent
                          ? "border border-brand-200 bg-brand-50 text-brand-700"
                          : "border border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {t.patient_consent ? "consentimiento" : "sin consentimiento"}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm italic text-ink-700">“{t.quote}”</p>
                {t.rating ? <p className="mt-1 text-xs text-ink-500">Calificación: {t.rating}/5</p> : null}
                {mediaPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlPublicaMedia(mediaPath)}
                    alt=""
                    className="mt-3 h-28 w-28 rounded-full object-cover"
                  />
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/testimonios/${t.id}`}
                    className="rounded-lg border border-brand-700 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Editar
                  </Link>
                  <form action={alternarTestimonio}>
                    <input type="hidden" name="id" value={String(t.id)} />
                    <button
                      type="submit"
                      className="rounded-lg border border-sand-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-sand-50"
                    >
                      {t.status === "published" ? "Ocultar" : "Publicar"}
                    </button>
                  </form>
                  <form action={eliminarTestimonio}>
                    <input type="hidden" name="id" value={String(t.id)} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
          {(testimonios ?? []).length === 0 ? (
            <p className="text-sm text-ink-500 sm:col-span-2">
              Aún no hay testimonios. Registra solo testimonios reales con consentimiento verificado.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

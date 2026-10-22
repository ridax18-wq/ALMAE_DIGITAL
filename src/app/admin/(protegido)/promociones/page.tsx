import type { Metadata } from "next";
import Link from "next/link";
import {
  alternarPromocion,
  eliminarPromocion,
  reordenarPromocion,
} from "@/app/admin/(protegido)/promociones/actions";
import { urlPublicaMedia } from "@/lib/cms/media";
import { formatPen } from "@/lib/format";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Promociones",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function hoyLima(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function AdminPromocionesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; guardada?: string; eliminada?: string }>;
}) {
  const { error, guardada, eliminada } = await searchParams;
  const supabase = createSupabaseServiceClient();

  const [{ data: promos }, { data: servicios }, { data: medios }] = await Promise.all([
    supabase
      .from("promotions")
      .select(
        "id, code, kind, value, valid_from, valid_to, max_uses, used_count, active, published, sort_order, service_id, media:media_assets!promotions_image_media_id_fkey(storage_path)",
      )
      .order("sort_order"),
    supabase.from("services").select("id, name").order("sort_order"),
    supabase.from("media_assets").select("id, storage_path, alt_text").order("created_at", { ascending: false }),
  ]);

  const mapaServicio = new Map((servicios ?? []).map((s) => [String(s.id), s.name]));
  const hoy = hoyLima();

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Promociones</h1>
            <p className="mt-1 text-sm text-ink-500">
              Campañas visibles en /promociones solo si están activas, publicadas y vigentes
            </p>
          </div>
          <Link
            href="/admin/promociones/nueva"
            className="inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
          >
            + Nueva promoción
          </Link>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error === "codigo_duplicado"
              ? "Ya existe una promoción con ese código."
              : error === "con_usos"
                ? "No se puede eliminar: la promoción ya fue usada."
                : decodeURIComponent(error)}
          </p>
        ) : null}
        {guardada ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Promoción guardada.
          </p>
        ) : null}
        {eliminada ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Promoción eliminada.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(promos ?? []).map((promo) => {
            const mediaPath = Array.isArray(promo.media)
              ? (promo.media[0] as { storage_path?: string } | undefined)?.storage_path
              : (promo.media as { storage_path?: string } | null)?.storage_path;
            const vencida = Boolean(promo.valid_to && promo.valid_to < hoy);
            const vigente = Boolean(
              promo.active && promo.published && !vencida && (!promo.valid_from || promo.valid_to === null || promo.valid_to >= hoy),
            );
            return (
              <article key={promo.id} className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
                {mediaPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlPublicaMedia(mediaPath)}
                    alt=""
                    className="mb-3 h-32 w-full rounded-lg object-cover"
                  />
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-ink-900">{promo.code}</h2>
                  <div className="flex flex-wrap justify-end gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        promo.active
                          ? "border border-green-200 bg-green-50 text-green-900"
                          : "border border-sand-200 bg-sand-100 text-ink-700"
                      }`}
                    >
                      {promo.active ? "activa" : "pausada"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        promo.published
                          ? "border border-brand-200 bg-brand-50 text-brand-700"
                          : "border border-sand-200 bg-sand-100 text-ink-700"
                      }`}
                    >
                      {promo.published ? "publicada" : "borrador"}
                    </span>
                    {vencida ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
                        vencida
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-700">
                  {promo.kind === "percent" ? `${promo.value}% de descuento` : `${formatPen(Math.round(Number(promo.value) * 100))} de descuento`}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  {promo.service_id
                    ? `Servicio: ${mapaServicio.get(String(promo.service_id)) ?? "—"}`
                    : "Válido para cualquier servicio"}
                  {promo.valid_from || promo.valid_to
                    ? ` · ${promo.valid_from ?? "sin inicio"} → ${promo.valid_to ?? "sin vencimiento"}`
                    : ""}
                  {promo.max_uses ? ` · usos ${promo.used_count}/${promo.max_uses}` : ""}
                </p>
                {vigente ? (
                  <p className="mt-1 text-xs font-semibold text-green-800">Visible para el público</p>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-ink-500">No visible para el público</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/promociones/${promo.id}`}
                    className="rounded-lg border border-brand-700 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Editar
                  </Link>
                  <form action={alternarPromocion}>
                    <input type="hidden" name="id" value={promo.id} />
                    <input type="hidden" name="campo" value="active" />
                    <button
                      type="submit"
                      className="rounded-lg border border-sand-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-sand-50"
                    >
                      {promo.active ? "Pausar" : "Activar"}
                    </button>
                  </form>
                  <form action={alternarPromocion}>
                    <input type="hidden" name="id" value={promo.id} />
                    <input type="hidden" name="campo" value="published" />
                    <button
                      type="submit"
                      className="rounded-lg border border-sand-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-sand-50"
                    >
                      {promo.published ? "Ocultar" : "Publicar"}
                    </button>
                  </form>
                  <form action={reordenarPromocion}>
                    <input type="hidden" name="id" value={promo.id} />
                    <input type="hidden" name="paso" value="-1" />
                    <button
                      type="submit"
                      aria-label={`Subir ${promo.code}`}
                      className="rounded-lg border border-sand-200 px-2 py-1.5 text-xs font-semibold text-ink-700 hover:bg-sand-50"
                    >
                      ↑
                    </button>
                  </form>
                  <form action={reordenarPromocion}>
                    <input type="hidden" name="id" value={promo.id} />
                    <input type="hidden" name="paso" value="1" />
                    <button
                      type="submit"
                      aria-label={`Bajar ${promo.code}`}
                      className="rounded-lg border border-sand-200 px-2 py-1.5 text-xs font-semibold text-ink-700 hover:bg-sand-50"
                    >
                      ↓
                    </button>
                  </form>
                  {Number(promo.used_count) === 0 ? (
                    <form action={eliminarPromocion}>
                      <input type="hidden" name="id" value={promo.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
          {(promos ?? []).length === 0 ? (
            <p className="text-sm text-ink-500 sm:col-span-2 lg:col-span-3">
              Aún no hay promociones. Crea la primera desde el botón superior.
            </p>
          ) : null}
        </div>

        <details className="mt-8 rounded-2xl border border-sand-200 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-ink-900">
            Imágenes disponibles en Multimedia
          </summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(medios ?? []).map((m) => (
              <li key={String(m.id)} className="text-xs text-ink-500">
                {m.alt_text || String(m.storage_path).split("/").pop()}
              </li>
            ))}
            {(medios ?? []).length === 0 ? (
              <li className="text-xs text-ink-500">Sube imágenes desde Multimedia.</li>
            ) : null}
          </ul>
        </details>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { BotonEliminar } from "@/app/admin/(protegido)/multimedia/BotonEliminar";
import { actualizarAltMedia, eliminarMedia, subirImagen } from "@/app/admin/(protegido)/multimedia/actions";
import { BUCKET, mediosEnUso, urlPublicaMedia } from "@/lib/cms/media";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Multimedia",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function peso(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export default async function MultimediaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; subida?: string; alt?: string; eliminada?: string }>;
}) {
  const { error, subida, alt, eliminada } = await searchParams;
  const mensajeError =
    error === "imagen_duplicada"
      ? "Esta imagen ya existe en la biblioteca (contenido idéntico)."
      : error
        ? decodeURIComponent(error)
        : null;
  const supabase = createSupabaseServiceClient();
  const { data: medios } = await supabase
    .from("media_assets")
    .select("id, storage_path, mime_type, bytes, alt_text, created_at")
    .order("created_at", { ascending: false });

  const filas = medios ?? [];
  const enUso = await mediosEnUso(filas.map((m) => String(m.id)));

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Multimedia</h1>
        <p className="mt-1 text-sm text-ink-500">
          Biblioteca de imágenes del sitio: JPG, PNG o WebP hasta 5 MB. Solo imágenes comerciales; no subas datos clínicos ni comprobantes.
        </p>

        {mensajeError ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {mensajeError}
          </p>
        ) : null}
        {subida ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Imagen subida correctamente.
          </p>
        ) : null}
        {alt ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Texto alternativo guardado.
          </p>
        ) : null}
        {eliminada ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Imagen eliminada.
          </p>
        ) : null}

        <form
          action={subirImagen}
          className="mt-6 grid gap-3 rounded-2xl border border-sand-200 bg-white p-4 sm:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700 sm:col-span-2">
            Imagen (JPG, PNG o WebP, máx. 5 MB)
            <input
              type="file"
              name="archivo"
              accept="image/jpeg,image/png,image/webp"
              required
              className="rounded-lg border border-sand-200 px-2 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700">
            Texto alternativo (accesibilidad)
            <input
              type="text"
              name="alt"
              maxLength={300}
              placeholder="Descripción de la imagen"
              className="rounded-lg border border-sand-200 px-2 py-2 text-sm font-normal"
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Subir imagen
          </button>
        </form>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filas.map((medio) => {
            const id = String(medio.id);
            const usado = enUso.has(id);
            return (
              <article key={id} className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlPublicaMedia(String(medio.storage_path))}
                  alt={medio.alt_text || "Imagen sin descripción"}
                  className="aspect-[16/10] w-full object-cover"
                  loading="lazy"
                />
                <div className="space-y-3 p-4">
                  <p className="truncate font-mono text-xs text-ink-500">{medio.storage_path}</p>
                  <p className="text-xs text-ink-500">
                    {medio.mime_type} · {peso(medio.bytes)} ·{" "}
                    <span className={usado ? "font-semibold text-brand-700" : "text-ink-500"}>
                      {usado ? "En uso" : "Sin uso"}
                    </span>
                  </p>
                  <form action={actualizarAltMedia} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={id} />
                    <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink-700">
                      Texto alternativo
                      <input
                        type="text"
                        name="alt"
                        maxLength={300}
                        defaultValue={medio.alt_text}
                        className="rounded-lg border border-sand-200 px-2 py-1.5 text-sm font-normal"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg border border-brand-700 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Guardar
                    </button>
                  </form>
                  <form action={eliminarMedia}>
                    <input type="hidden" name="id" value={id} />
                    {usado ? (
                      <p className="text-xs text-amber-700">
                        En uso por un contenido publicado: no se puede eliminar.
                      </p>
                    ) : (
                      <BotonEliminar />
                    )}
                  </form>
                </div>
              </article>
            );
          })}
          {filas.length === 0 ? (
            <p className="text-sm text-ink-500 sm:col-span-2 lg:col-span-3">
              Aún no hay imágenes en la biblioteca. Las imágenes del sitio actual están en public/ y se migrarán en el módulo B4.
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-xs text-ink-500">
          Bucket: {BUCKET} · lectura pública de imágenes autorizadas; subida y borrado solo desde el panel.
        </p>
      </div>
    </main>
  );
}

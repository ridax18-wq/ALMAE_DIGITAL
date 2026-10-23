import type { Metadata } from "next";
import {
  descartarBorradorUbicacion,
  guardarBorradorUbicacion,
  publicarUbicacion,
} from "@/app/admin/(protegido)/ubicacion/actions";
import { obtenerConfiguracionPublica, urlBusquedaMaps, urlComoLlegar } from "@/lib/cms/config-publica";
import { obtenerBorrador } from "@/lib/cms/revisiones-config";

export const metadata: Metadata = {
  title: "Ubicación",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type ValoresUbicacion = {
  address_street: string;
  address_district: string;
  address_province: string;
  address_department: string;
  address_reference: string;
  maps_url: string;
  local_intro: string;
};

export default async function AdminUbicacionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; borrador?: string; publicada?: string; descartado?: string }>;
}) {
  const { error, borrador, publicada, descartado } = await searchParams;
  const [config, draft] = await Promise.all([
    obtenerConfiguracionPublica(),
    obtenerBorrador<ValoresUbicacion>("ubicacion"),
  ]);

  const v = draft?.valores;
  const direccionActual = config.direccionCompleta;
  const comoLlegar = urlComoLlegar(config.mapsUrl, direccionActual);

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Ubicación</h1>
        <p className="mt-1 text-sm text-ink-500">
          Dirección, mapa y presentación del local. Los cambios se publican con el
          botón &quot;Publicar&quot; (el público nunca ve borradores).
        </p>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(error)}
          </p>
        ) : null}
        {borrador ? (
          <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Borrador guardado. El sitio público no cambia hasta que publiques.
          </p>
        ) : null}
        {publicada ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Ubicación publicada. El sitio se actualizó sin rebuild.
          </p>
        ) : null}
        {descartado ? (
          <p role="status" className="mt-4 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-ink-700">
            Borrador descartado.
          </p>
        ) : null}

        {draft ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Hay un borrador sin publicar
              <span className="ml-2 font-normal">
                ({new Date(draft.creadoEn).toLocaleString("es-PE", { timeZone: "America/Lima" })})
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={publicarUbicacion}>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Publicar borrador
                </button>
              </form>
              <form action={descartarBorradorUbicacion}>
                <button
                  type="submit"
                  className="rounded-xl border border-sand-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-sand-50"
                >
                  Descartar
                </button>
              </form>
            </div>
          </div>
        ) : null}

        <form action={guardarBorradorUbicacion} className="mt-6 grid gap-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="address_street" className="mb-1 block text-sm font-semibold text-ink-900">
              Dirección comercial
            </label>
            <input
              id="address_street"
              name="address_street"
              required
              minLength={3}
              maxLength={120}
              defaultValue={v?.address_street ?? config.direccionCalle}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address_district" className="mb-1 block text-sm font-semibold text-ink-900">
              Distrito
            </label>
            <input
              id="address_district"
              name="address_district"
              required
              minLength={2}
              maxLength={60}
              defaultValue={v?.address_district ?? config.direccionDistrito}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address_province" className="mb-1 block text-sm font-semibold text-ink-900">
              Provincia
            </label>
            <input
              id="address_province"
              name="address_province"
              required
              minLength={2}
              maxLength={60}
              defaultValue={v?.address_province ?? config.direccionProvincia}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address_department" className="mb-1 block text-sm font-semibold text-ink-900">
              Departamento
            </label>
            <input
              id="address_department"
              name="address_department"
              required
              minLength={2}
              maxLength={60}
              defaultValue={v?.address_department ?? config.direccionDepartamento}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="address_reference" className="mb-1 block text-sm font-semibold text-ink-900">
              Referencia de ubicación (opcional)
            </label>
            <input
              id="address_reference"
              name="address_reference"
              maxLength={200}
              defaultValue={v?.address_reference ?? config.direccionReferencia}
              placeholder="Ej: frente al parque del Rímac"
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="maps_url" className="mb-1 block text-sm font-semibold text-ink-900">
              Enlace de Google Maps (opcional, https)
            </label>
            <input
              id="maps_url"
              name="maps_url"
              type="url"
              maxLength={500}
              defaultValue={v?.maps_url ?? config.mapsUrl}
              placeholder="https://www.google.com/maps/..."
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
            <p className="mt-1 text-xs text-ink-500">
              Sin enlace, el sitio muestra la dirección y un botón de búsqueda en Maps
              (no se inventa ningún pin exacto).
            </p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="local_intro" className="mb-1 block text-sm font-semibold text-ink-900">
              Texto de presentación del local (opcional)
            </label>
            <textarea
              id="local_intro"
              name="local_intro"
              rows={2}
              maxLength={400}
              defaultValue={v?.local_intro ?? config.introLocal}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Guardar borrador
            </button>
          </div>
        </form>

        <section className="mt-6 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs">
          <h2 className="font-display text-lg font-bold text-ink-900">Previsualización pública</h2>
          <p className="mt-2 text-sm text-ink-700">{direccionActual || "Sin dirección configurada"}</p>
          {config.direccionReferencia ? (
            <p className="mt-1 text-sm text-ink-500">{config.direccionReferencia}</p>
          ) : null}
          {config.introLocal ? (
            <p className="mt-3 text-sm text-ink-700">{config.introLocal}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={comoLlegar}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
            >
              {config.mapsUrl ? "Cómo llegar" : "Buscar en Google Maps"}
            </a>
            <a
              href={urlBusquedaMaps(direccionActual)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-sand-300 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-sand-50"
            >
              Buscar dirección en Maps
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

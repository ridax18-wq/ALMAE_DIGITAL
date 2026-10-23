import type { Metadata } from "next";
import {
  descartarBorradorContacto,
  guardarBorradorContacto,
  publicarContacto,
} from "@/app/admin/(protegido)/contacto/actions";
import { obtenerConfiguracionPublica } from "@/lib/cms/config-publica";
import { obtenerBorrador } from "@/lib/cms/revisiones-config";

export const metadata: Metadata = {
  title: "Contacto",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type ValoresContacto = {
  whatsapp_number: string;
  whatsapp_message: string;
  phone: string;
  email: string;
  instagram_url: string;
  facebook_url: string;
};

export default async function AdminContactoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; borrador?: string; publicado?: string; descartado?: string }>;
}) {
  const { error, borrador, publicado, descartado } = await searchParams;
  const [config, draft] = await Promise.all([
    obtenerConfiguracionPublica(),
    obtenerBorrador<ValoresContacto>("contacto"),
  ]);
  const v = draft?.valores;

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Contacto</h1>
        <p className="mt-1 text-sm text-ink-500">
          Fuente única de datos de contacto: se usa en botones de WhatsApp, footer, página de
          contacto y metadatos.
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
        {publicado ? (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            Contacto publicado. El sitio se actualizó sin rebuild.
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
              <form action={publicarContacto}>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
                >
                  Publicar borrador
                </button>
              </form>
              <form action={descartarBorradorContacto}>
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

        <form action={guardarBorradorContacto} className="mt-6 grid gap-4 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:grid-cols-2">
          <div>
            <label htmlFor="whatsapp_number" className="mb-1 block text-sm font-semibold text-ink-900">
              WhatsApp (solo dígitos, con código de país)
            </label>
            <input
              id="whatsapp_number"
              name="whatsapp_number"
              required
              inputMode="numeric"
              pattern="\d{8,15}"
              maxLength={15}
              defaultValue={v?.whatsapp_number ?? config.whatsapp}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-semibold text-ink-900">
              Teléfono fijo (opcional)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              maxLength={20}
              defaultValue={v?.phone ?? config.telefono}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-semibold text-ink-900">
              Correo electrónico (opcional)
            </label>
            <input
              id="email"
              name="email"
              type="email"
              maxLength={120}
              defaultValue={v?.email ?? config.email}
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="whatsapp_message" className="mb-1 block text-sm font-semibold text-ink-900">
              Mensaje predeterminado de WhatsApp (opcional)
            </label>
            <input
              id="whatsapp_message"
              name="whatsapp_message"
              maxLength={300}
              defaultValue={v?.whatsapp_message ?? config.whatsappMensaje}
              placeholder="Hola ALMAE, quisiera información…"
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="instagram_url" className="mb-1 block text-sm font-semibold text-ink-900">
              Instagram (https, opcional)
            </label>
            <input
              id="instagram_url"
              name="instagram_url"
              type="url"
              maxLength={300}
              defaultValue={v?.instagram_url ?? config.instagramUrl}
              placeholder="https://www.instagram.com/..."
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="facebook_url" className="mb-1 block text-sm font-semibold text-ink-900">
              Facebook (https, opcional)
            </label>
            <input
              id="facebook_url"
              name="facebook_url"
              type="url"
              maxLength={300}
              defaultValue={v?.facebook_url ?? config.facebookUrl}
              placeholder="https://www.facebook.com/..."
              className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
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
          <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
            <li>WhatsApp: {config.whatsapp || "—"}</li>
            {config.telefono ? <li>Teléfono: {config.telefono}</li> : null}
            {config.email ? <li>Correo: {config.email}</li> : null}
            {config.instagramUrl ? <li>Instagram: {config.instagramUrl}</li> : null}
            {config.facebookUrl ? <li>Facebook: {config.facebookUrl}</li> : null}
          </ul>
        </section>
      </div>
    </main>
  );
}

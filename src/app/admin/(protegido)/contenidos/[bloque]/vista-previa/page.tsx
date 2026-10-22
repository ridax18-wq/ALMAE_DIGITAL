import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VistaPrevia } from "@/app/admin/(protegido)/contenidos/[bloque]/vista-previa/VistaPrevia";
import { cuerpoDefecto, esquemas, MAPA_BLOQUES } from "@/lib/cms/bloques";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Vista previa",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function lista(valor: unknown): { title?: string; text?: string; question?: string; answer?: string }[] {
  return Array.isArray(valor) ? (valor as never[]) : [];
}

export default async function VistaPreviaContenidoPage({
  params,
}: {
  params: Promise<{ bloque: string }>;
}) {
  const { bloque } = await params;
  const def = MAPA_BLOQUES.get(bloque);
  if (!def) notFound();

  const supabase = createSupabaseServiceClient();
  const { data: fila } = await supabase
    .from("content_blocks")
    .select("body, status")
    .eq("block_key", bloque)
    .maybeSingle();

  let cuerpo = cuerpoDefecto(def.clave) as Record<string, unknown>;
  let origen = "Contenido publicado actual (sin cambios guardados)";
  if (fila?.body) {
    const parseo = esquemas[def.clave].safeParse(fila.body);
    if (parseo.success) {
      cuerpo = parseo.data as Record<string, unknown>;
      origen = fila.status === "draft" ? "Borrador sin publicar" : "Versión publicada";
    }
  }

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Migas" className="text-sm">
          <Link href="/admin/contenidos" className="font-semibold text-brand-700 hover:underline">
            ← Contenidos
          </Link>
          <span className="mx-2 text-ink-400">/</span>
          <Link href={`/admin/contenidos/${bloque}`} className="font-semibold text-brand-700 hover:underline">
            {def.pagina}
          </Link>
          <span className="mx-2 text-ink-400">/</span>
          <span className="text-ink-700">Vista previa</span>
        </nav>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink-900">Vista previa — {def.pagina}</h1>
        <p className="mt-1 text-sm text-ink-500">{origen}. Solo tú puedes ver esta página.</p>

        <div className="mt-6">
          <VistaPrevia>
            <div className="space-y-4 bg-white p-6 sm:p-8">
              {def.clave === "faq_section" ? (
                <>
                  <p className="text-xs font-bold tracking-[0.18em] uppercase text-brand-600">{texto(cuerpo.eyebrow)}</p>
                  <h2 className="font-display text-2xl font-bold text-ink-900">{texto(cuerpo.title)}</h2>
                  <ul className="divide-y divide-sand-200">
                    {lista(cuerpo.items).map((item, i) => (
                      <li key={i} className="py-3">
                        <p className="font-semibold text-ink-900">{texto(item.question)}</p>
                        <p className="mt-1 text-sm text-ink-700">{texto(item.answer)}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : def.clave === "intro_nosotros" ? (
                <>
                  <h2 className="font-display text-2xl font-bold text-ink-900">{texto(cuerpo.hero_title)}</h2>
                  <p className="text-ink-700">{texto(cuerpo.hero_description)}</p>
                  <h3 className="pt-2 font-display text-lg font-bold text-ink-900">{texto(cuerpo.seccion_title)}</h3>
                  {lista(cuerpo.parrafos).map((p, i) => (
                    <p key={i} className="text-sm text-ink-700">{texto(p)}</p>
                  ))}
                </>
              ) : def.clave === "home_como_funciona" ? (
                <>
                  <h2 className="font-display text-2xl font-bold text-ink-900">{texto(cuerpo.title)}</h2>
                  {cuerpo.visible === false ? (
                    <p className="text-xs font-semibold text-amber-700">Sección oculta en el sitio público.</p>
                  ) : null}
                  <ol className="grid gap-3 sm:grid-cols-2">
                    {lista(cuerpo.pasos).map((paso, i) => (
                      <li key={i} className="rounded-xl border border-sand-200 p-4">
                        <p className="text-xs font-bold uppercase text-brand-600">Paso {i + 1}</p>
                        <p className="font-semibold text-ink-900">{texto(paso.title)}</p>
                        <p className="mt-1 text-sm text-ink-700">{texto(paso.text)}</p>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <>
                  {"eyebrow" in cuerpo ? (
                    <p className="text-xs font-bold tracking-[0.18em] uppercase text-brand-600">{texto(cuerpo.eyebrow)}</p>
                  ) : null}
                  <h2 className="font-display text-2xl font-bold text-ink-900">
                    {texto(cuerpo.title ?? cuerpo.hero_title)}
                  </h2>
                  <p className="text-ink-700">{texto(cuerpo.description ?? cuerpo.text ?? cuerpo.hero_description)}</p>
                  {"beneficios" in cuerpo ? (
                    <ul className="flex flex-wrap gap-2">
                      {lista(cuerpo.beneficios).map((b, i) => (
                        <li key={i} className="rounded-full border border-sand-200 bg-sand-100 px-3 py-1 text-sm">
                          {texto(b)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {"cta_primario" in cuerpo ? (
                    <div className="flex flex-wrap gap-3 pt-2">
                      <span className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
                        {texto(cuerpo.cta_primario)}
                      </span>
                      {"cta_secundario" in cuerpo ? (
                        <span className="rounded-xl border border-brand-700 px-4 py-2 text-sm font-semibold text-brand-700">
                          {texto(cuerpo.cta_secundario)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </VistaPrevia>
        </div>
      </div>
    </main>
  );
}

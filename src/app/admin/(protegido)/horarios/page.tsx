import type { Metadata } from "next";
import {
  guardarSemanaLaboral,
} from "@/app/admin/(protegido)/horarios/actions";
import {
  crearExcepcionCalendario,
  eliminarExcepcionCalendario,
} from "@/app/admin/(protegido)/agenda/actions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Horarios",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type FilaHorario = {
  id: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  break_start: string | null;
  break_end: string | null;
};

const DIAS = [
  { iso: 1, nombre: "Lunes" },
  { iso: 2, nombre: "Martes" },
  { iso: 3, nombre: "Miércoles" },
  { iso: 4, nombre: "Jueves" },
  { iso: 5, nombre: "Viernes" },
  { iso: 6, nombre: "Sábado" },
  { iso: 7, nombre: "Domingo" },
];

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorUrl } = await searchParams;
  const supabase = createSupabaseServiceClient();

  const { data: horas } = await supabase
    .from("business_hours")
    .select("id, day_of_week, opens_at, closes_at, break_start, break_end")
    .order("day_of_week");

  const { data: excepciones } = await supabase
    .from("schedule_exceptions")
    .select("id, kind, date_from, date_to, reason")
    .gte("date_to", new Date().toISOString().slice(0, 10))
    .order("date_from");

  const porDia = new Map<number, FilaHorario | undefined>();
  for (const dia of DIAS) {
    porDia.set(dia.iso, (horas ?? []).find((h) => h.day_of_week === dia.iso));
  }

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Horarios</h1>
        <p className="mt-1 text-sm text-ink-500">
          Horario laboral semanal (hora local America/Lima, días ISO 1–7)
        </p>

        {errorUrl ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(errorUrl)}
          </p>
        ) : null}

        <form action={guardarSemanaLaboral} className="mt-5 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="pb-2">Día</th>
                <th className="pb-2">Abre</th>
                <th className="pb-2">Cierra</th>
                <th className="pb-2">Descanso desde</th>
                <th className="pb-2">Descanso hasta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {DIAS.map((dia) => {
                const fila = porDia.get(dia.iso);
                return (
                  <tr key={dia.iso}>
                    <td className="py-2.5 font-medium text-ink-900">{dia.nombre}</td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="time"
                        name={`d_${dia.iso}_abre`}
                        defaultValue={fila?.opens_at?.slice(0, 5) ?? ""}
                        aria-label={`Apertura ${dia.nombre}`}
                        className="rounded-lg border border-sand-200 bg-white px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="time"
                        name={`d_${dia.iso}_cierra`}
                        defaultValue={fila?.closes_at?.slice(0, 5) ?? ""}
                        aria-label={`Cierre ${dia.nombre}`}
                        className="rounded-lg border border-sand-200 bg-white px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="time"
                        name={`d_${dia.iso}_descanso_desde`}
                        defaultValue={fila?.break_start?.slice(0, 5) ?? ""}
                        aria-label={`Descanso desde ${dia.nombre}`}
                        className="rounded-lg border border-sand-200 bg-white px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="py-2.5">
                      <input
                        type="time"
                        name={`d_${dia.iso}_descanso_hasta`}
                        defaultValue={fila?.break_end?.slice(0, 5) ?? ""}
                        aria-label={`Descanso hasta ${dia.nombre}`}
                        className="rounded-lg border border-sand-200 bg-white px-2 py-1.5 text-sm"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-500">
            Deja ambos campos vacíos para cerrar ese día. El descanso bloquea los
            slots que lo cruzan.
          </p>
          <button type="submit" className="mt-4 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
            Guardar horario semanal
          </button>
        </form>

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold text-ink-900">
            Excepciones de calendario
          </h2>
          <form action={crearExcepcionCalendario} className="mt-3 grid gap-3 rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:grid-cols-3">
            <div>
              <label htmlFor="fecha_inicio" className="mb-1 block text-xs font-semibold text-ink-700">Desde</label>
              <input id="fecha_inicio" name="fecha_inicio" type="date" required className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="fecha_fin" className="mb-1 block text-xs font-semibold text-ink-700">Hasta</label>
              <input id="fecha_fin" name="fecha_fin" type="date" required className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="tipo" className="mb-1 block text-xs font-semibold text-ink-700">Tipo</label>
              <select id="tipo" name="tipo" className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm">
                <option value="full_day">Día cerrado completo</option>
                <option value="holiday">Feriado</option>
                <option value="partial">Parcial (con horas)</option>
              </select>
            </div>
            <div>
              <label htmlFor="hora_desde" className="mb-1 block text-xs font-semibold text-ink-700">Solo si parcial: desde</label>
              <input id="hora_desde" name="hora_desde" type="time" className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="hora_hasta" className="mb-1 block text-xs font-semibold text-ink-700">Solo si parcial: hasta</label>
              <input id="hora_hasta" name="hora_hasta" type="time" className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="motivo" className="mb-1 block text-xs font-semibold text-ink-700">Motivo (interno)</label>
              <input id="motivo" name="motivo" maxLength={120} placeholder="Ej: vacaciones, feriado, personal" className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-3">
              <button type="submit" className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
                Crear excepción
              </button>
            </div>
          </form>

          <ul className="mt-4 divide-y divide-sand-200 rounded-2xl border border-sand-200 bg-white shadow-xs">
            {(excepciones ?? []).map((excepcion) => (
              <li key={excepcion.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="font-medium text-ink-900">
                  {excepcion.date_from} → {excepcion.date_to} ·{" "}
                  {excepcion.kind === "holiday" ? "Feriado" : excepcion.kind === "partial" ? "Parcial" : "Día cerrado"}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-ink-500">{excepcion.reason || "—"}</span>
                  <form action={eliminarExcepcionCalendario}>
                    <input type="hidden" name="excepcion_id" value={excepcion.id} />
                    <button type="submit" className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50">
                      Eliminar
                    </button>
                  </form>
                </span>
              </li>
            ))}
            {(excepciones ?? []).length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-ink-500">
                No hay excepciones vigentes
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </main>
  );
}

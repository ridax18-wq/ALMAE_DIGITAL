import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pacientes",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createSupabaseServerClient();

  let consulta = supabase
    .from("patients")
    .select("id, full_name, phone, email, contact_consent, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`;
    consulta = consulta.or(`full_name.ilike.${term},phone.ilike.${term}`);
  }

  const { data: pacientes } = await consulta;

  const { data: conteos } = await supabase
    .from("bookings")
    .select("patient_id, count")
    .not("patient_id", "is", null);

  const numeroReservas = new Map<string, number>();
  for (const fila of conteos ?? []) {
    numeroReservas.set(String(fila.patient_id), Number(fila.count));
  }

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">
              Pacientes
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {(pacientes?.length ?? 0)} pacientes (últimos 100)
            </p>
          </div>
          <form className="flex gap-2" action="/admin/pacientes">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por nombre o teléfono"
              aria-label="Buscar pacientes"
              className="w-64 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2.5">Paciente</th>
                <th className="px-4 py-2.5">Teléfono</th>
                <th className="px-4 py-2.5">Correo</th>
                <th className="px-4 py-2.5">Reservas</th>
                <th className="px-4 py-2.5">Consentimiento</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {(pacientes ?? []).map((paciente) => (
                <tr key={paciente.id} className="hover:bg-sand-50">
                  <td className="px-4 py-2.5 font-medium text-ink-900">
                    {paciente.full_name}
                  </td>
                  <td className="px-4 py-2.5">{paciente.phone}</td>
                  <td className="px-4 py-2.5">{paciente.email || "—"}</td>
                  <td className="px-4 py-2.5">{numeroReservas.get(paciente.id) ?? 0}</td>
                  <td className="px-4 py-2.5">
                    {paciente.contact_consent ? (
                      <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-900">
                        autorizado
                      </span>
                    ) : (
                      <span className="rounded-full border border-sand-200 bg-sand-100 px-2 py-0.5 text-xs font-semibold text-ink-700">
                        solo citas
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/admin/pacientes/${paciente.id}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {(pacientes ?? []).length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-ink-500" colSpan={6}>
                    Sin pacientes para esta búsqueda
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

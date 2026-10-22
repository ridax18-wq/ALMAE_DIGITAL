import type { Metadata } from "next";
import Link from "next/link";
import { verificarPagoPage, rechazarPagoPage } from "@/app/admin/(protegido)/pagos/actions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { formatPen } from "@/lib/format";
import {
  ESTADOS_PAGO,
  METODOS_PAGO,
  TAMANO_PAGINA,
  esEstadoPago,
  esMetodoPago,
  paginaValida,
  rangoFechaLima,
  sumarVerificados,
  totalPaginas,
} from "@/lib/services/pagos-historial";

export const metadata: Metadata = {
  title: "Pagos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ETIQUETA_ESTADO_PAGO: Record<string, { texto: string; clases: string }> = {
  REPORTED: { texto: "Reportado (por verificar)", clases: "border-amber-200 bg-amber-50 text-amber-900" },
  VERIFIED: { texto: "Verificado", clases: "border-green-200 bg-green-50 text-green-900" },
  REJECTED: { texto: "Rechazado", clases: "border-red-200 bg-red-50 text-red-900" },
};

const ETIQUETA_METODO: Record<string, string> = {
  YAPE: "Yape",
  PLIN: "Plin",
  BANK_TRANSFER: "Transferencia",
  CASH: "Efectivo",
  OTHER: "Otro",
};

type Filtros = { desde?: string; hasta?: string; estado?: string; metodo?: string; q?: string; pagina?: string };

function enlace(filtros: Filtros, cambios: Partial<Filtros>): string {
  const combinados = { ...filtros, ...cambios };
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(combinados)) {
    if (valor && clave !== "pagina") params.set(clave, valor);
  }
  if (cambios.pagina) params.set("pagina", cambios.pagina);
  const texto = params.toString();
  return texto ? `/admin/pagos?${texto}` : "/admin/pagos";
}

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<Filtros & { error?: string }>;
}) {
  const parametros = await searchParams;
  const filtros: Filtros = {
    desde: parametros.desde,
    hasta: parametros.hasta,
    estado: esEstadoPago(parametros.estado) ? parametros.estado : undefined,
    metodo: esMetodoPago(parametros.metodo) ? parametros.metodo : undefined,
    q: parametros.q?.trim().slice(0, 60) || undefined,
  };
  const pagina = paginaValida(parametros.pagina);
  const { desdeIso, hastaIso } = rangoFechaLima(filtros.desde, filtros.hasta);
  const supabase = createSupabaseServiceClient();

  let idsReservaBusqueda: string[] | null = null;
  if (filtros.q) {
    const termino = filtros.q.replace(/[%_,()]/g, "");
    const { data: pacientes } = await supabase
      .from("patients")
      .select("id")
      .ilike("full_name", `%${termino}%`)
      .limit(200);
    const idsPacientes = (pacientes ?? []).map((p) => String(p.id));
    const { data: reservas } = await supabase
      .from("bookings")
      .select("id, public_code, patient_id")
      .or(
        [
          `public_code.ilike.%${termino}%`,
          idsPacientes.length ? `patient_id.in.(${idsPacientes.join(",")})` : null,
        ]
          .filter(Boolean)
          .join(","),
      )
      .limit(500);
    idsReservaBusqueda = (reservas ?? []).map((r) => String(r.id));
  }

  const sinResultados = idsReservaBusqueda !== null && idsReservaBusqueda.length === 0;

  function aplicarFiltros<T extends { eq: (c: string, v: string) => T; gte: (c: string, v: string) => T; lte: (c: string, v: string) => T; in: (c: string, v: string[]) => T }>(consulta: T): T {
    let c = consulta;
    if (filtros.estado) c = c.eq("verification_status", filtros.estado);
    if (filtros.metodo) c = c.eq("method", filtros.metodo);
    if (desdeIso) c = c.gte("created_at", desdeIso);
    if (hastaIso) c = c.lte("created_at", hastaIso);
    if (idsReservaBusqueda) c = c.in("booking_id", idsReservaBusqueda);
    return c;
  }

  const desde = (pagina - 1) * TAMANO_PAGINA;
  const hasta = desde + TAMANO_PAGINA - 1;

  const { data: adelantos, count } = sinResultados
    ? { data: [], count: 0 }
    : await aplicarFiltros(
        supabase
          .from("manual_payments")
          .select(
            "id, method, amount_cents, verification_status, transaction_reference, paid_at, verified_at, verified_by, rejection_reason, created_at, booking:bookings(id, public_code, status, starts_at, service:services(name), patient:patients(full_name, phone))",
            { count: "exact" },
          )
          .order("created_at", { ascending: false })
          .range(desde, hasta),
      );

  const { data: todosFiltrados } = sinResultados
    ? { data: [] }
    : await aplicarFiltros(
        supabase.from("manual_payments").select("verification_status, amount_cents").limit(5000),
      );
  const totalVerificado = sumarVerificados(todosFiltrados ?? []);
  const conteoVerificados = (todosFiltrados ?? []).filter((f) => f.verification_status === "VERIFIED").length;

  const idsVerificadores = Array.from(
    new Set((adelantos ?? []).map((a) => a.verified_by).filter((v): v is string => typeof v === "string")),
  );
  const { data: perfiles } = idsVerificadores.length
    ? await supabase.from("admin_profiles").select("user_id, display_name").in("user_id", idsVerificadores)
    : { data: [] };
  const nombreVerificador = new Map((perfiles ?? []).map((p) => [String(p.user_id), p.display_name]));

  const filas = (adelantos ?? []).map((a) => ({
    adelanto: a,
    reserva: (a.booking as unknown as {
      id: string;
      public_code: string;
      status: string;
      starts_at: string;
      service: { name: string } | null;
      patient: { full_name: string; phone: string } | null;
    } | null) ?? null,
  }));

  const totalResultados = count ?? 0;
  const paginas = totalPaginas(totalResultados);

  return (
    <main className="py-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-ink-900">Pagos</h1>
        <p className="mt-1 text-sm text-ink-500">
          Historial de adelantos manuales coordinados por WhatsApp. Solo los pagos verificados suman como ingreso confirmado.
        </p>

        {parametros.error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {decodeURIComponent(parametros.error)}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold uppercase text-green-900">Total verificado (filtros actuales)</p>
            <p className="mt-1 font-display text-2xl font-bold text-green-900">{formatPen(totalVerificado)}</p>
            <p className="text-xs text-green-900">{conteoVerificados} pagos verificados</p>
          </div>
          <div className="rounded-2xl border border-sand-200 bg-white p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase text-ink-500">Resultados</p>
            <p className="mt-1 text-sm text-ink-700">
              {totalResultados} registros · página {Math.min(pagina, paginas)} de {paginas}
            </p>
          </div>
        </div>

        <form action="/admin/pagos" className="mt-5 grid gap-3 rounded-2xl border border-sand-200 bg-white p-4 sm:grid-cols-6">
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700">
            Desde
            <input type="date" name="desde" defaultValue={filtros.desde ?? ""} className="rounded-lg border border-sand-200 px-2 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700">
            Hasta
            <input type="date" name="hasta" defaultValue={filtros.hasta ?? ""} className="rounded-lg border border-sand-200 px-2 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700">
            Estado
            <select name="estado" defaultValue={filtros.estado ?? ""} className="rounded-lg border border-sand-200 px-2 py-2 text-sm">
              <option value="">Todos</option>
              {ESTADOS_PAGO.map((e) => (
                <option key={e} value={e}>{ETIQUETA_ESTADO_PAGO[e]?.texto}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700">
            Método
            <select name="metodo" defaultValue={filtros.metodo ?? ""} className="rounded-lg border border-sand-200 px-2 py-2 text-sm">
              <option value="">Todos</option>
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>{ETIQUETA_METODO[m]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-700 sm:col-span-2">
            Código o paciente
            <input type="search" name="q" defaultValue={filtros.q ?? ""} placeholder="ALM-… o nombre" className="rounded-lg border border-sand-200 px-2 py-2 text-sm" />
          </label>
          <div className="flex items-end gap-2 sm:col-span-6">
            <button type="submit" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800">
              Aplicar filtros
            </button>
            <Link href="/admin/pagos" className="text-sm font-semibold text-brand-700 hover:underline">
              Limpiar
            </Link>
          </div>
        </form>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-sand-200 bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2.5">Fecha registro</th>
                <th className="px-4 py-2.5">Reserva</th>
                <th className="px-4 py-2.5">Paciente</th>
                <th className="px-4 py-2.5">Servicio</th>
                <th className="px-4 py-2.5">Método</th>
                <th className="px-4 py-2.5">Importe</th>
                <th className="px-4 py-2.5">Referencia</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5">Verificado por</th>
                <th className="px-4 py-2.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {filas.map(({ adelanto, reserva }) => {
                const etiqueta = ETIQUETA_ESTADO_PAGO[adelanto.verification_status] ?? {
                  texto: adelanto.verification_status,
                  clases: "border-sand-200 bg-sand-100 text-ink-700",
                };
                const verificador = adelanto.verified_by
                  ? `${nombreVerificador.get(String(adelanto.verified_by)) ?? "Administrador"}${
                      adelanto.verified_at ? ` · ${String(adelanto.verified_at).slice(0, 16).replace("T", " ")}` : ""
                    }`
                  : "—";
                return (
                  <tr key={adelanto.id} className="hover:bg-sand-50">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {String(adelanto.created_at).slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/reservas/${reserva?.id}`} className="font-mono text-xs font-semibold text-brand-700 hover:underline">
                        {reserva?.public_code ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-ink-900">{reserva?.patient?.full_name ?? "—"}</span>
                      <span className="block text-xs text-ink-500">{reserva?.patient?.phone ?? ""}</span>
                    </td>
                    <td className="px-4 py-2.5">{reserva?.service?.name ?? "—"}</td>
                    <td className="px-4 py-2.5">{ETIQUETA_METODO[adelanto.method] ?? adelanto.method}</td>
                    <td className="px-4 py-2.5 font-semibold text-ink-900">{formatPen(adelanto.amount_cents)}</td>
                    <td className="px-4 py-2.5 text-xs">{adelanto.transaction_reference || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${etiqueta.clases}`}>
                        {etiqueta.texto}
                      </span>
                      {adelanto.rejection_reason ? (
                        <span className="block text-[11px] text-ink-500">{adelanto.rejection_reason}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-700">{verificador}</td>
                    <td className="px-4 py-2.5">
                      {adelanto.verification_status === "REPORTED" ? (
                        <span className="flex items-center gap-1.5">
                          <form action={verificarPagoPage}>
                            <input type="hidden" name="payment_id" value={adelanto.id} />
                            <input type="hidden" name="booking_id" value={reserva?.id ?? ""} />
                            <button type="submit" className="rounded-lg bg-brand-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-800">
                              Verificar
                            </button>
                          </form>
                          <form action={rechazarPagoPage} className="flex items-center gap-1">
                            <input type="hidden" name="payment_id" value={adelanto.id} />
                            <input name="motivo" aria-label="Motivo del rechazo" placeholder="motivo" className="w-20 rounded-lg border border-sand-200 px-2 py-1.5 text-xs" />
                            <button type="submit" className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50">
                              Rechazar
                            </button>
                          </form>
                        </span>
                      ) : (
                        <Link href={`/admin/reservas/${reserva?.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
                          Ver detalle
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filas.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-ink-500" colSpan={10}>
                    No hay pagos que coincidan con los filtros
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {paginas > 1 ? (
          <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm">
            {pagina > 1 ? (
              <Link href={enlace(filtros, { pagina: String(pagina - 1) })} className="font-semibold text-brand-700 hover:underline">
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-ink-500">Página {pagina} de {paginas}</span>
            {pagina < paginas ? (
              <Link href={enlace(filtros, { pagina: String(pagina + 1) })} className="font-semibold text-brand-700 hover:underline">
                Siguiente →
              </Link>
            ) : <span />}
          </nav>
        ) : null}
      </div>
    </main>
  );
}

-- ALMAE DIGITAL — 0003: Row Level Security con privilegios mínimos
-- anon: solo puede leer servicios activos, horarios y excepciones (insumo del
-- motor de disponibilidad). Las tablas privadas no tienen políticas públicas.
-- El admin (dueño) está autenticado y tiene fila en admin_profiles.

create or replace function es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles where user_id = auth.uid()
  );
$$;

revoke execute on function es_administrador() from anon;
grant execute on function es_administrador() to authenticated;

-- =====================================================================
-- Activar RLS en todas las tablas
-- =====================================================================
alter table business_settings enable row level security;
alter table admin_profiles enable row level security;
alter table services enable row level security;
alter table service_variants enable row level security;
alter table business_hours enable row level security;
alter table schedule_exceptions enable row level security;
alter table patients enable row level security;
alter table bookings enable row level security;
alter table booking_events enable row level security;
alter table payments enable row level security;
alter table payment_events enable row level security;
alter table payment_reconciliation enable row level security;
alter table appointment_notifications enable row level security;
alter table marketing_sources enable row level security;
alter table campaigns enable row level security;
alter table promotions enable row level security;
alter table audit_logs enable row level security;

-- =====================================================================
-- Lecturas públicas mínimas
-- =====================================================================
create policy "servicios_activos_publicos" on services
  for select to anon using (active);

create policy "variantes_de_servicios_activos_publicos" on service_variants
  for select to anon
  using (
    exists (
      select 1 from services s
      where s.id = service_variants.service_id and s.active
    )
  );

create policy "horario_laboral_publico" on business_hours
  for select to anon using (true);

create policy "excepciones_agenda_publicas" on schedule_exceptions
  for select to anon using (true);

create policy "fuentes_marketing_publicas" on marketing_sources
  for select to anon using (active);

create policy "configuracion_negocio_publica" on business_settings
  for select to anon using (true);

-- =====================================================================
-- Administrador (dueño) autenticado
-- =====================================================================
create policy "servicios_admin" on services
  for all to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "variantes_admin" on service_variants
  for all to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "horario_admin" on business_hours
  for all to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "excepciones_admin" on schedule_exceptions
  for all to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "pacientes_admin_lectura" on patients
  for select to authenticated
  using (es_administrador());

create policy "pacientes_admin_escritura" on patients
  for insert to authenticated
  with check (es_administrador());

create policy "pacientes_admin_actualizacion" on patients
  for update to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "reservas_admin_lectura" on bookings
  for select to authenticated
  using (es_administrador());

create policy "reservas_admin_escritura" on bookings
  for insert to authenticated
  with check (es_administrador());

create policy "reservas_admin_actualizacion" on bookings
  for update to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "eventos_reserva_admin_lectura" on booking_events
  for select to authenticated
  using (es_administrador());

create policy "pagos_admin_lectura" on payments
  for select to authenticated
  using (es_administrador());

create policy "pagos_admin_escritura" on payments
  for insert to authenticated
  with check (es_administrador());

create policy "pagos_admin_actualizacion" on payments
  for update to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "eventos_pago_admin_lectura" on payment_events
  for select to authenticated
  using (es_administrador());

create policy "conciliacion_admin_lectura" on payment_reconciliation
  for select to authenticated
  using (es_administrador());

create policy "conciliacion_admin_actualizacion" on payment_reconciliation
  for update to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "notificaciones_admin_lectura" on appointment_notifications
  for select to authenticated
  using (es_administrador());

create policy "campanas_admin" on campaigns
  for all to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "promociones_admin" on promotions
  for all to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "auditoria_admin_lectura" on audit_logs
  for select to authenticated
  using (es_administrador());

create policy "perfiles_admin_lectura" on admin_profiles
  for select to authenticated
  using (es_administrador());

create policy "perfiles_admin_actualizacion" on admin_profiles
  for update to authenticated
  using (es_administrador())
  with check (es_administrador());

create policy "configuracion_negocio_admin_actualizacion" on business_settings
  for update to authenticated
  using (es_administrador())
  with check (es_administrador());

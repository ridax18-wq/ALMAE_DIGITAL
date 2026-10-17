-- ALMAE DIGITAL — 0002: tablas, índices y protección contra reservas superpuestas
-- La superposición se impide físicamente con una restricción EXCLUDE sobre el
-- intervalo generado (hold_range) por profesional, limitada a estados activos.

create extension if not exists btree_gist;

-- =====================================================================
-- Configuración del negocio (fila única)
-- =====================================================================
create table business_settings (
  id uuid primary key default gen_random_uuid(),
  timezone text not null default 'America/Lima',
  currency char(3) not null default 'PEN',
  booking_hold_ttl_minutes int2 not null default 10 check (booking_hold_ttl_minutes between 1 and 120),
  booking_gap_minutes int2 not null default 15 check (booking_gap_minutes between 0 and 60),
  min_booking_lead_hours int2 not null default 3 check (min_booking_lead_hours between 0 and 72),
  max_advance_days int2 not null default 30 check (max_advance_days between 1 and 365),
  cancellation_policy_hours int2 not null default 24 check (cancellation_policy_hours between 1 and 168),
  whatsapp_number text,
  address_public text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Perfiles de administrador (vinculados a Supabase Auth)
-- =====================================================================
create table admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role admin_role not null default 'assistant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Marketing (antes de patients/bookings por sus claves foráneas)
-- =====================================================================
create table marketing_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind marketing_source_kind not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  marketing_source_id uuid not null references marketing_sources (id) on delete cascade,
  name text not null,
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_utm_unico unique (marketing_source_id, utm_source, utm_medium, utm_campaign)
);

create index campaigns_source_idx on campaigns (marketing_source_id);

-- =====================================================================
-- Catálogo de servicios
-- =====================================================================
create table services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  location service_location not null default 'consultorio',
  active boolean not null default true,
  instructions text not null default '',
  sort_order int2 not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table service_variants (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete cascade,
  duration_minutes int2 not null check (duration_minutes > 0),
  prep_buffer_minutes int2 not null default 0 check (prep_buffer_minutes >= 0),
  price numeric(10, 2) not null check (price > 0),
  advance_amount numeric(10, 2) check (advance_amount is null or advance_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_variants_service_id_idx on service_variants (service_id);
create index services_active_idx on services (active) where active;

create table promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('fixed', 'percent')),
  value numeric(10, 2) not null check (value > 0),
  service_id uuid references services (id) on delete set null,
  valid_from date,
  valid_to date,
  max_uses int2,
  used_count int2 not null default 0 check (used_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Horario laboral semanal y excepciones de agenda
-- =====================================================================
create table business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday int2 not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  break_start time,
  break_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_rango_valido check (opens_at < closes_at),
  constraint business_hours_break_valido check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_start < break_end and opens_at < break_start and break_end < closes_at)
  ),
  constraint business_hours_weekday_unico unique (weekday)
);

create table schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  kind exception_kind not null,
  date_from date not null,
  date_to date not null,
  time_from time,
  time_to time,
  reason text not null default '',
  created_by uuid references admin_profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_exceptions_rango_fechas check (date_from <= date_to),
  constraint schedule_exceptions_partial_valido check (
    (kind <> 'partial')
    or (time_from is not null and time_to is not null and time_from < time_to)
  )
);

create index schedule_exceptions_fechas_idx on schedule_exceptions (date_from, date_to);

-- =====================================================================
-- Pacientes (datos mínimos, sin historia clínica)
-- =====================================================================
create table patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text,
  marketing_source_id uuid references marketing_sources (id) on delete set null,
  contact_consent boolean not null default false,
  consent_at timestamptz,
  notes_admin text not null default '',
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Reservas — núcleo del sistema
-- =====================================================================
create table bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete restrict,
  service_variant_id uuid not null references service_variants (id) on delete restrict,
  patient_id uuid not null references patients (id) on delete restrict,
  professional_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  hold_range tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  status booking_status not null default 'HELD',
  access_token text not null unique,
  token_expires_at timestamptz not null,
  total_amount numeric(10, 2) not null check (total_amount > 0),
  advance_amount numeric(10, 2) not null check (advance_amount >= 0),
  currency char(3) not null default 'PEN',
  marketing_source_id uuid references marketing_sources (id) on delete set null,
  campaign_id uuid,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  notes text not null default '',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  constraint bookings_fechas_validas check (starts_at < ends_at)
);

create index bookings_starts_at_idx on bookings (starts_at)
  where status in ('HELD', 'PENDING_PAYMENT', 'CONFIRMED');
create index bookings_patient_id_idx on bookings (patient_id);
create index bookings_service_id_idx on bookings (service_id);
create index bookings_status_idx on bookings (status);

-- Clave estable para la exclusión: evita que NULL profesional eluda el
-- solapamiento (NULL = NULL no coincide en la comparación gist).
alter table bookings
  add column profesional_clave text generated always as (
    coalesce(professional_id::text, 'unico')
  ) stored;

alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (
    profesional_clave with =,
    hold_range with &&
  )
  where (status in ('HELD', 'PENDING_PAYMENT', 'CONFIRMED'));

-- =====================================================================
-- Historiales inmutables
-- =====================================================================
create table booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  from_status booking_status,
  to_status booking_status,
  actor actor_type not null default 'system',
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index booking_events_booking_id_idx on booking_events (booking_id);

-- =====================================================================
-- Pagos y conciliación (estado independiente del estado de reserva)
-- =====================================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings (id) on delete set null,
  provider payment_provider not null,
  provider_charge_id text,
  external_reference text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  currency char(3) not null default 'PEN',
  status payment_state not null default 'CREATED',
  method text not null default '',
  raw_last4 text,
  reconciliation_note text,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_provider_charge_unico_idx on payments (provider_charge_id)
  where provider_charge_id is not null;
create index payments_booking_id_idx on payments (booking_id);
create index payments_status_idx on payments (status);

create table payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  event_type text not null,
  provider text not null,
  provider_event_id text,
  payload_hash text,
  actor actor_type not null default 'system',
  created_at timestamptz not null default now(),
  constraint payment_events_evento_unico unique (provider, provider_event_id)
);

create index payment_events_payment_id_idx on payment_events (payment_id);

create table payment_reconciliation (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  reason reconciliation_reason not null,
  resolution reconciliation_resolution,
  resolved_at timestamptz,
  resolved_by uuid references admin_profiles (user_id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_reconciliation_payment_id_idx on payment_reconciliation (payment_id);

-- =====================================================================
-- Notificaciones operativas (cola; envío automático en fase 8)
-- =====================================================================
create table appointment_notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  kind notification_kind not null,
  channel notification_channel not null,
  status notification_status not null default 'queued',
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointment_notifications_booking_id_idx on appointment_notifications (booking_id);

-- =====================================================================
-- Auditoría
-- =====================================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references admin_profiles (user_id) on delete set null,
  actor_role admin_role,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on audit_logs (actor_user_id);
create index audit_logs_entity_idx on audit_logs (entity, entity_id);

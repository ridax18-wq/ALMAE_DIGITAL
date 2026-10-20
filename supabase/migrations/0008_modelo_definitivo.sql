-- ALMAE DIGITAL — 0008: modelo definitivo del Hito 2.2
-- Incremental: no elimina datos ni modifica migraciones aplicadas.
-- Decide: dinero en céntimos (integer), orígenes, código público,
-- hash de token, agenda unificada (bookings + schedule_blocks),
-- roles administrativos ampliados y pagos manuales.

-- =====================================================================
-- 1. ROLES ADMINISTRATIVOS ampliados
-- =====================================================================
alter type admin_role add value if not exists 'admin';
alter type admin_role add value if not exists 'professional';
alter type admin_role add value if not exists 'receptionist';

alter table admin_profiles
  add column active boolean not null default true;

-- =====================================================================
-- 2. CONFIGURACIÓN: retención 15 min + límite de extensión
-- =====================================================================
alter table business_settings
  alter column booking_hold_ttl_minutes set default 15;

update business_settings
set booking_hold_ttl_minutes = 15
where booking_hold_ttl_minutes < 15;

alter table business_settings
  add column max_hold_extension_minutes int2 not null default 30
    check (max_hold_extension_minutes between 5 and 240);

alter table business_settings
  add column advance_required_by_default boolean not null default true;

-- =====================================================================
-- 3. SERVICIOS Y VARIANTES: dinero en céntimos
-- =====================================================================
alter table service_variants
  rename column price to amount_cents;
alter table service_variants
  alter column amount_cents type integer using (amount_cents * 100)::int;
alter table service_variants
  alter column amount_cents set not null;
alter table service_variants
  alter column amount_cents set default 0;
alter table service_variants
  drop constraint if exists service_variants_price_check;

alter table service_variants
  rename column advance_amount to deposit_cents;
alter table service_variants
  alter column deposit_cents type integer using (coalesce(deposit_cents, 0) * 100)::int;

alter table service_variants
  add constraint service_variants_montos_validos
  check (amount_cents > 0 and deposit_cents >= 0 and deposit_cents <= amount_cents);

-- Normalización de datos existentes (precios enteros ya están en céntimos)
update service_variants set deposit_cents = 0 where deposit_cents is null;

-- =====================================================================
-- 4. BOOKINGS: origen, código público, hash de token, confirmación
-- =====================================================================
create type booking_origin as enum ('WEB', 'IN_PERSON', 'ADMIN');

alter table bookings
  rename column expires_at to hold_expires_at;

alter table bookings
  add column origin booking_origin not null default 'WEB';
alter table bookings
  add column public_code text;
alter table bookings
  add column deposit_verified_cents integer not null default 0;
alter table bookings
  add column confirmed_at timestamptz;
alter table bookings
  add column confirmed_by uuid references admin_profiles (user_id) on delete set null;
alter table bookings
  add column cancellation_reason text not null default '';
alter table bookings
  add column access_token_hash text unique;

-- Hash de tokens existentes (sha256 hex de 64 caracteres)
update bookings
set access_token_hash = encode(extensions.digest(access_token, 'sha256'), 'hex')
where access_token is not null and access_token_hash is null;

-- Código público legible y no secuencial para los existentes
do $$
declare
  fila record;
  intento text;
begin
  for fila in select id from bookings where public_code is null loop
    intento := 'ALM-' || upper(substr(replace(replace(replace(encode(extensions.gen_random_bytes(8), 'hex'), '0', 'x'), 'o', 'y'), '1', 'z'), 1, 6));
    loop
      begin
        update bookings set public_code = intento where id = fila.id;
        exit;
      exception when unique_violation then
        intento := 'ALM-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 6));
      end;
    end loop;
  end loop;
end $$;

alter table bookings
  alter column public_code set not null;
create unique index bookings_public_code_unico_idx on bookings (public_code);

alter table bookings
  rename column total_amount to amount_cents;
alter table bookings
  alter column amount_cents type integer using (amount_cents * 100)::int;

alter table bookings
  rename column advance_amount to deposit_required_cents;
alter table bookings
  alter column deposit_required_cents type integer using (deposit_required_cents * 100)::int;

alter table bookings
  add constraint bookings_montos_validos
  check (amount_cents > 0 and deposit_required_cents >= 0
         and deposit_required_cents <= amount_cents
         and deposit_verified_cents >= 0);

-- El trigger de confirmación por pago (0004) ya no aplica al flujo WhatsApp;
-- queda sin efecto para proveedores manuales (no inserta pagos el público).
drop trigger if exists trg_pago_confirma_reserva on payments;

-- =====================================================================
-- 5. BLOQUEOS ADMINISTRATIVOS
-- =====================================================================
create type block_type as enum ('BREAK', 'INTERNAL', 'ABSENCE', 'MAINTENANCE', 'OTHER');

create table schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  block_type block_type not null default 'OTHER',
  reason text not null default '',
  created_by uuid references admin_profiles (user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_blocks_rango_valido check (starts_at < ends_at)
);

create index schedule_blocks_fechas_idx on schedule_blocks (starts_at, ends_at);

-- =====================================================================
-- 6. ADELANTOS MANUALES
-- =====================================================================
create type manual_payment_method as enum ('YAPE', 'PLIN', 'BANK_TRANSFER', 'CASH', 'OTHER');
create type manual_payment_state as enum ('REPORTED', 'VERIFIED', 'REJECTED');

create table manual_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  method manual_payment_method not null,
  amount_cents integer not null check (amount_cents > 0),
  verification_status manual_payment_state not null default 'REPORTED',
  transaction_reference text,
  paid_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references admin_profiles (user_id) on delete set null,
  rejection_reason text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index manual_payments_booking_idx on manual_payments (booking_id);
create index manual_payments_estado_idx on manual_payments (verification_status);
create unique index manual_payments_referencia_unica_idx
  on manual_payments (method, transaction_reference)
  where transaction_reference is not null and transaction_reference <> '';

-- =====================================================================
-- 7. AGENDA UNIFICADA: única fuente de integridad de intervalos
-- =====================================================================
create type occupancy_source as enum ('BOOKING', 'BLOCK');

create table agenda_occupancy (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings (id) on delete cascade,
  block_id uuid references schedule_blocks (id) on delete cascade,
  source occupancy_source not null,
  profesional_clave text not null default 'unico',
  rango tstzrange not null,
  created_at timestamptz not null default now(),
  constraint agenda_occupancy_origen_definido
    check ((booking_id is null)::int + (block_id is null)::int = 1),
  constraint agenda_occupancy_coherente check (
    (source = 'BOOKING' and booking_id is not null)
    or (source = 'BLOCK' and block_id is not null)
  )
);

alter table agenda_occupancy
  add constraint agenda_no_overlap
  exclude using gist (
    profesional_clave with =,
    rango with &&
  );

create index agenda_occupancy_rango_idx on agenda_occupancy using gist (rango);
create index agenda_occupancy_booking_idx on agenda_occupancy (booking_id);
create index agenda_occupancy_block_idx on agenda_occupancy (block_id);

-- =====================================================================
-- 8. SINCRONIZACIÓN TRANSACCIONAL bookings -> agenda_occupancy
-- =====================================================================
create or replace function sincronizar_ocupacion_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rango tstzrange := tstzrange(new.starts_at, new.ends_at, '[)');
  v_ocupa boolean;
begin
  v_ocupa := new.status in ('HELD', 'PENDING_PAYMENT', 'CONFIRMED');

  delete from agenda_occupancy
  where booking_id = new.id;

  if v_ocupa then
    insert into agenda_occupancy (booking_id, block_id, source, profesional_clave, rango)
    values (new.id, null, 'BOOKING', new.profesional_clave, v_rango);
  end if;

  return new;
end;
$$;

create trigger trg_ocupacion_booking
  after insert or update on bookings
  for each row execute function sincronizar_ocupacion_booking();

create or replace function sincronizar_ocupacion_bloqueo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from agenda_occupancy
  where block_id = new.id;

  insert into agenda_occupancy (booking_id, block_id, source, profesional_clave, rango)
  values (null, new.id, 'BLOCK', 'unico', tstzrange(new.starts_at, new.ends_at, '[)'));

  return new;
end;
$$;

create trigger trg_ocupacion_bloqueo
  after insert or update on schedule_blocks
  for each row execute function sincronizar_ocupacion_bloqueo();

-- Backfill de ocupación con los datos existentes
insert into agenda_occupancy (booking_id, block_id, source, profesional_clave, rango)
select id, null, 'BOOKING', profesional_clave,
       tstzrange(starts_at, ends_at, '[)')
from bookings
where status in ('HELD', 'PENDING_PAYMENT', 'CONFIRMED')
on conflict do nothing;

-- =====================================================================
-- 9. VISTA de resumen económico de reserva (derivada, sin campo editable)
-- =====================================================================
create or replace view bookings_resumen_economico as
select
  b.id as booking_id,
  b.status,
  b.amount_cents,
  b.deposit_required_cents,
  coalesce(sum(mp.amount_cents) filter (where mp.verification_status = 'VERIFIED'), 0)::integer as deposit_verified_cents,
  b.amount_cents - coalesce(sum(mp.amount_cents) filter (where mp.verification_status = 'VERIFIED'), 0)::integer as saldo_pendiente_cents
from bookings b
left join manual_payments mp on mp.booking_id = b.id
group by b.id;

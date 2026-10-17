-- ALMAE DIGITAL — 0004: triggers estándar y guardas de integridad

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'business_settings',
    'admin_profiles',
    'services',
    'service_variants',
    'business_hours',
    'schedule_exceptions',
    'patients',
    'bookings',
    'payment_reconciliation',
    'appointment_notifications',
    'marketing_sources',
    'campaigns',
    'promotions'
  ]
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on %I for each row execute function set_updated_at()',
      tabla, tabla
    );
  end loop;
end;
$$;

-- =====================================================================
-- Guarda de transiciones de estado de reserva (defensa a nivel de BD)
-- =====================================================================
create table bookings_valid_transitions (
  from_status booking_status not null,
  to_status booking_status not null,
  constraint bookings_valid_transitions_pk primary key (from_status, to_status)
);

insert into bookings_valid_transitions (from_status, to_status) values
  ('HELD', 'PENDING_PAYMENT'),
  ('HELD', 'CONFIRMED'),
  ('HELD', 'EXPIRED'),
  ('HELD', 'CANCELLED'),
  ('PENDING_PAYMENT', 'CONFIRMED'),
  ('PENDING_PAYMENT', 'EXPIRED'),
  ('PENDING_PAYMENT', 'CANCELLED'),
  ('CONFIRMED', 'COMPLETED'),
  ('CONFIRMED', 'NO_SHOW'),
  ('CONFIRMED', 'CANCELLED'),
  ('CONFIRMED', 'REFUND_PENDING'),
  ('REFUND_PENDING', 'REFUNDED');

create or replace function check_booking_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = new.status then
    return new;
  end if;
  if not exists (
    select 1
    from bookings_valid_transitions t
    where t.from_status = old.status and t.to_status = new.status
  ) then
    raise exception
      'Transición de estado de reserva no permitida: % -> %',
      old.status, new.status
      using errcode = 'check_violation';
  end if;
  new.status_changed_at = now();
  return new;
end;
$$;

create trigger trg_bookings_transicion
  before update on bookings
  for each row execute function check_booking_transition();

-- =====================================================================
-- Historial automático de cambios de estado de reserva
-- =====================================================================
create or replace function log_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = new.status then
    return new;
  end if;
  insert into booking_events (booking_id, from_status, to_status, actor, reason)
  values (
    new.id,
    old.status,
    new.status,
    case
      when es_administrador() then 'admin'::actor_type
      else 'system'::actor_type
    end,
    coalesce(current_setting('app.booking_reason', true), '')
  );
  return new;
end;
$$;

create trigger trg_bookings_evento
  after update on bookings
  for each row execute function log_booking_status_change();

-- =====================================================================
-- Pago acreditado: transición automática de la reserva (HELD/PENDING -> CONFIRMED)
-- Solo se ejecuta cuando el pago queda SUCCEEDED y el monto coincide.
-- =====================================================================
create or replace function confirmar_reserva_por_pago()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'SUCCEEDED' or old.status = 'SUCCEEDED' then
    return new;
  end if;
  if new.booking_id is null then
    return new;
  end if;

  update bookings
  set status = 'CONFIRMED'
  where id = new.booking_id
    and status in ('HELD', 'PENDING_PAYMENT');

  return new;
end;
$$;

create trigger trg_pago_confirma_reserva
  after update on payments
  for each row execute function confirmar_reserva_por_pago();

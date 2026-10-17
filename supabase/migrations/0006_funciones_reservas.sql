-- ALMAE DIGITAL — 0006: funciones transaccionales del motor de reservas
-- crear_reserva_con_hold: RPC security definer llamada por el sitio público
-- (con rate limiting en la capa app). Valida TODO en el servidor dentro de una
-- transacción con bloqueo advisory por servicio+fecha para serializar la carrera.
-- obtener_reserva_por_token / cancelar_reserva_por_token: acciones del paciente
-- vía token de alta entropía.
-- expirar_holds: cron/lazy — marca EXPIRED los holds y pagos vencidos.

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- Helper interno: metadatos de una fecha (hora local Lima)
-- =====================================================================
create or replace function _meta_del_dia(p_starts_at timestamptz)
returns table (
  weekday int,
  apertura time,
  cierre time,
  break_start time,
  break_end time
)
language sql
stable
as $$
  select h.weekday,
         h.opens_at,
         h.closes_at,
         h.break_start,
         h.break_end
  from business_hours h
  where h.weekday = extract(dow from p_starts_at at time zone 'America/Lima')::int;
$$;

create or replace function _fecha_lima(p_starts_at timestamptz)
returns date
language sql
stable
as $$
  select (p_starts_at at time zone 'America/Lima')::date;
$$;

-- =====================================================================
-- RPC principal: crear hold de reserva
-- =====================================================================
create or replace function crear_reserva_con_hold(
  p_service_slug text,
  p_variant_id uuid,
  p_starts_at timestamptz,
  p_patient jsonb,
  p_marketing jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
  v_service record;
  v_variant record;
  v_fin timestamptz;
  v_dia date;
  v_meta record;
  v_excepcion record;
  v_patient_id uuid;
  v_booking_id uuid;
  v_token text;
  v_expires timestamptz;
  v_now timestamptz := now();
  v_hora time;
begin
  select * into v_settings from business_settings limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'configuracion_ausente');
  end if;

  select s.id, s.name, s.location, s.active
    into v_service
  from services s
  where s.slug = p_service_slug and s.active and s.location = 'consultorio';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'servicio_no_disponible');
  end if;

  select sv.id, sv.service_id, sv.duration_minutes, sv.prep_buffer_minutes, sv.price, sv.advance_amount
    into v_variant
  from service_variants sv
  where sv.id = p_variant_id and sv.service_id = v_service.id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'variante_no_disponible');
  end if;

  if p_starts_at <= v_now
     or p_starts_at > v_now + make_interval(days => v_settings.max_advance_days)
     or p_starts_at < v_now + make_interval(hours => v_settings.min_booking_lead_hours) then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_ventana');
  end if;

  v_dia := _fecha_lima(p_starts_at);
  select * into v_meta from _meta_del_dia(p_starts_at);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_horario');
  end if;

  v_hora := (p_starts_at at time zone 'America/Lima')::time;
  v_fin := p_starts_at + make_interval(
    mins => v_variant.duration_minutes + v_variant.prep_buffer_minutes
  );

  if v_hora < v_meta.apertura
     or (v_fin at time zone 'America/Lima')::time > v_meta.cierre then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_horario');
  end if;

  if v_meta.break_start is not null
     and (tstzrange(p_starts_at, v_fin) && tstzrange(
            (v_dia + v_meta.break_start) at time zone 'America/Lima',
            (v_dia + v_meta.break_end) at time zone 'America/Lima')) then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_horario');
  end if;

  select 1 into v_excepcion
  from schedule_exceptions e
  where e.date_from <= v_dia and e.date_to >= v_dia
    and (
      e.kind in ('full_day', 'holiday')
      or (
        e.kind = 'partial'
        and tstzrange(p_starts_at, v_fin) && tstzrange(
              (v_dia + e.time_from) at time zone 'America/Lima',
              (v_dia + e.time_to) at time zone 'America/Lima')
      )
    )
  limit 1;
  if found then
    return jsonb_build_object('ok', false, 'error', 'agenda_bloqueada');
  end if;

  perform pg_advisory_xact_lock(
    hashtext('almae:' || p_service_slug || ':' || v_dia::text)
  );

  if exists (
    select 1 from bookings b
    where b.status in ('HELD', 'PENDING_PAYMENT', 'CONFIRMED')
      and tstzrange(b.starts_at - make_interval(mins => v_settings.booking_gap_minutes),
                    b.ends_at + make_interval(mins => v_settings.booking_gap_minutes))
          && tstzrange(p_starts_at, v_fin)
  ) then
    return jsonb_build_object('ok', false, 'error', 'slot_no_disponible');
  end if;

  select p.id into v_patient_id
  from patients p
  where p.phone = p_patient->>'phone';
  if not found then
    insert into patients (full_name, phone, email, contact_consent, consent_at)
    values (
      p_patient->>'full_name',
      p_patient->>'phone',
      nullif(p_patient->>'email', ''),
      coalesce((p_patient->>'consent')::boolean, false),
      case when coalesce((p_patient->>'consent')::boolean, false) then v_now else null end
    )
    returning id into v_patient_id;
  else
    update patients
    set contact_consent = contact_consent or coalesce((p_patient->>'consent')::boolean, false),
        consent_at = case
          when contact_consent then consent_at
          when coalesce((p_patient->>'consent')::boolean, false) then v_now
          else consent_at
        end
    where id = v_patient_id;
  end if;

  select id into v_booking_id
  from bookings
  where patient_id = v_patient_id
    and service_id = v_service.id
    and starts_at = p_starts_at
    and status in ('HELD', 'PENDING_PAYMENT');
  if found then
    select access_token, expires_at into v_token, v_expires from bookings
    where id = v_booking_id;
    return jsonb_build_object(
      'ok', true,
      'ya_creada', true,
      'token', v_token,
      'expires_at', v_expires
    );
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into bookings (
    service_id, service_variant_id, patient_id, professional_id,
    starts_at, ends_at, status,
    access_token, token_expires_at,
    total_amount, advance_amount, currency,
    marketing_source_id, utm_source, utm_medium, utm_campaign,
    notes, expires_at
  ) values (
    v_service.id, v_variant.id, v_patient_id, null,
    p_starts_at, v_fin, 'HELD',
    v_token, v_now + interval '7 days',
    v_variant.price, coalesce(v_variant.advance_amount, 0), v_settings.currency,
    (p_marketing->>'source_id')::uuid,
    p_marketing->>'utm_source',
    p_marketing->>'utm_medium',
    p_marketing->>'utm_campaign',
    coalesce(p_patient->>'notes', ''),
    v_now + make_interval(mins => v_settings.booking_hold_ttl_minutes)
  )
  returning id into v_booking_id;

  insert into booking_events (booking_id, to_status, actor, reason)
  values (v_booking_id, 'HELD', 'patient', 'hold creado');

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'id', v_booking_id,
    'expires_at', v_now + make_interval(mins => v_settings.booking_hold_ttl_minutes),
    'ends_at', v_fin,
    'etiqueta', v_hora::text
  );
end;
$$;

-- =====================================================================
-- Consulta de reserva por token (datos mínimos, sin datos de terceros)
-- =====================================================================
create or replace function obtener_reserva_por_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', b.id,
    'status', b.status,
    'service', s.name,
    'slug', s.slug,
    'location', s.location,
    'variant_id', b.service_variant_id,
    'duracion_min', sv.duration_minutes,
    'inicio_lima', b.starts_at at time zone 'America/Lima',
    'fin_lima', b.ends_at at time zone 'America/Lima',
    'total_amount', b.total_amount,
    'advance_amount', b.advance_amount,
    'currency', b.currency,
    'notes', b.notes,
    'hold_expira', b.expires_at,
    'token_expira', b.token_expires_at,
    'paciente_nombre', p.full_name,
    'paciente_telefono', p.phone,
    'policy_hours', (select cancellation_policy_hours from business_settings limit 1),
    'puede_cancelar', (
      b.status = 'HELD'
      or (
        b.status = 'CONFIRMED'
        and b.starts_at > now() + make_interval(
          mins => (select cancellation_policy_hours from business_settings limit 1) * 60
        )
      )
    )
  )
  from bookings b
  join services s on s.id = b.service_id
  join service_variants sv on sv.id = b.service_variant_id
  join patients p on p.id = b.patient_id
  where b.access_token = p_token
    and b.token_expires_at > now();
$$;

-- =====================================================================
-- Cancelación por token (según política de cancelación)
-- =====================================================================
create or replace function cancelar_reserva_por_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_policy int;
begin
  select b.id, b.status, b.starts_at into v_booking
  from bookings b
  where b.access_token = p_token and b.token_expires_at > now();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_encontrada');
  end if;

  select cancellation_policy_hours into v_policy from business_settings limit 1;

  if v_booking.status = 'HELD' then
    update bookings set status = 'CANCELLED' where id = v_booking.id;
    return jsonb_build_object('ok', true, 'status', 'CANCELLED');
  end if;

  if v_booking.status = 'CONFIRMED'
     and v_booking.starts_at > now() + make_interval(hours => v_policy) then
    update bookings set status = 'CANCELLED' where id = v_booking.id;
    return jsonb_build_object('ok', true, 'status', 'CANCELLED');
  end if;

  return jsonb_build_object(
    'ok', false,
    'error', 'fuera_de_politica',
    'policy_hours', v_policy
  );
end;
$$;

-- =====================================================================
-- Expiración de holds (CRON / lazy)
-- =====================================================================
create or replace function expirar_holds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta int;
begin
  with expiradas as (
    update bookings
    set status = 'EXPIRED'
    where status in ('HELD', 'PENDING_PAYMENT')
      and expires_at is not null
      and expires_at < now()
    returning id
  )
  select count(*) into v_cuenta from expiradas;
  return v_cuenta;
end;
$$;

-- =====================================================================
-- Privilegios: el sitio público (anon) puede crear/cancelar/consultar
-- por token; la expiración queda para service-role/cron.
-- =====================================================================
revoke all on function crear_reserva_con_hold(text, uuid, timestamptz, jsonb, jsonb) from public, authenticated;
grant execute on function crear_reserva_con_hold(text, uuid, timestamptz, jsonb, jsonb) to anon;

revoke all on function obtener_reserva_por_token(text) from public, authenticated;
grant execute on function obtener_reserva_por_token(text) to anon;

revoke all on function cancelar_reserva_por_token(text) from public, authenticated;
grant execute on function cancelar_reserva_por_token(text) to anon;

revoke all on function expirar_holds() from public, anon, authenticated;

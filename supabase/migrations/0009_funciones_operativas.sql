-- ALMAE DIGITAL — 0009: funciones operativas del Hito 2.2
-- Retención web controlada (anon), expiración idempotente, extensión,
-- confirmación administrativa transaccional, reserva presencial, bloqueos
-- y matriz de transiciones del nuevo flujo. Reemplaza las RPCs del prototipo.

drop function if exists crear_reserva_con_hold(text, uuid, timestamptz, jsonb, jsonb);
drop function if exists obtener_reserva_por_token(text);
drop function if exists cancelar_reserva_por_token(text);
drop function if exists expirar_holds();
drop function if exists expirar_pagos();
drop function if exists confirmar_reserva_por_pago();
drop function if exists _meta_del_dia(timestamptz);

-- =====================================================================
-- MATRIZ DE TRANSICIONES del flujo definitivo (WhatsApp + confirmación admin)
-- =====================================================================
delete from bookings_valid_transitions
where from_status in ('PENDING_PAYMENT', 'REFUND_PENDING');

delete from bookings_valid_transitions
where (from_status, to_status) not in (
  ('HELD','CONFIRMED'), ('HELD','EXPIRED'), ('HELD','CANCELLED'),
  ('CONFIRMED','COMPLETED'), ('CONFIRMED','NO_SHOW'), ('CONFIRMED','CANCELLED')
);

insert into bookings_valid_transitions (from_status, to_status) values
  ('HELD','CONFIRMED'), ('HELD','EXPIRED'), ('HELD','CANCELLED'),
  ('CONFIRMED','COMPLETED'), ('CONFIRMED','NO_SHOW'), ('CONFIRMED','CANCELLED')
on conflict (from_status, to_status) do nothing;

-- =====================================================================
-- EXPIRACIÓN idempotente (servidor; cron o lazy)
-- =====================================================================
create or replace function expirar_retenciones()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta integer := 0;
begin
  with vencidas as (
    update bookings
    set status = 'EXPIRED'
    where status = 'HELD'
      and hold_expires_at is not null
      and hold_expires_at < now()
    returning id
  )
  select count(*) into v_cuenta from vencidas;

  return v_cuenta;
end;
$$;

revoke all on function expirar_retenciones() from public, anon, authenticated;
grant execute on function expirar_retenciones() to service_role;

-- =====================================================================
-- RETENCIÓN WEB (RPC pública CONTROLADA: valida horario, excepciones,
-- ocupación unificada con gap, ventanas; upsert paciente; único camino
-- para que el público cree reservas, siempre en estado HELD)
-- =====================================================================
create or replace function crear_retencion_web(
  p_service_slug text,
  p_variant_id uuid,
  p_starts_at timestamptz,
  p_patient jsonb,
  p_utm jsonb default null
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
  v_hora time;
  v_horario record;
  v_apertura timestamptz;
  v_cierre timestamptz;
  v_patient_id uuid;
  v_booking_id uuid;
  v_token text;
  v_public_code text;
  v_dow_iso int;
  v_hold_min int;
  v_excepcion_block int;
  v_expires timestamptz;
  v_now timestamptz := now();
begin
  select * into v_settings from business_settings limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'configuracion_ausente');
  end if;

  v_hold_min := v_settings.booking_hold_ttl_minutes;
  perform expirar_retenciones();

  select s.id, s.name, s.active into v_service
  from services s
  where s.slug = p_service_slug and s.active and s.location = 'consultorio';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'servicio_no_disponible');
  end if;

  select sv.id, sv.service_id, sv.duration_minutes, sv.prep_buffer_minutes,
         sv.amount_cents, sv.deposit_cents
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

  v_dia := (p_starts_at at time zone 'America/Lima')::date;
  v_hora := (p_starts_at at time zone 'America/Lima')::time;
  v_dow_iso := case extract(dow from p_starts_at at time zone 'America/Lima')::int
                 when 0 then 7
                 else extract(dow from p_starts_at at time zone 'America/Lima')::int
               end;

  select opens_at, closes_at into v_horario
  from business_hours
  where day_of_week = v_dow_iso
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_horario');
  end if;

  v_fin := p_starts_at + make_interval(mins => v_variant.duration_minutes + v_variant.prep_buffer_minutes);
  v_apertura := (v_dia + v_horario.opens_at) at time zone 'America/Lima';
  v_cierre := (v_dia + v_horario.closes_at) at time zone 'America/Lima';

  if p_starts_at < v_apertura or v_fin > v_cierre then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_horario');
  end if;

  select 1 into v_excepcion_block
  from schedule_exceptions e
  where e.date_from <= v_dia and e.date_to >= v_dia
    and (
      e.kind in ('full_day', 'holiday')
      or (
        e.kind = 'partial'
        and e.time_from is not null and e.time_to is not null
        and tstzrange(p_starts_at, v_fin) && tstzrange(
              (v_dia + e.time_from) at time zone 'America/Lima',
              (v_dia + e.time_to) at time zone 'America/Lima')
      )
    )
  limit 1;
  if found then
    return jsonb_build_object('ok', false, 'error', 'agenda_bloqueada');
  end if;

  perform pg_advisory_xact_lock(hashtext('almae:' || p_service_slug || ':' || v_dia::text));

  if exists (
    select 1 from agenda_occupancy o
    where o.profesional_clave = 'unico'
      and o.rango && tstzrange(
            p_starts_at - make_interval(mins => v_settings.booking_gap_minutes),
            v_fin + make_interval(mins => v_settings.booking_gap_minutes))
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

  select id, public_code, hold_expires_at into v_booking_id, v_public_code, v_expires
  from bookings
  where patient_id = v_patient_id
    and service_id = v_service.id
    and starts_at = p_starts_at
    and status = 'HELD';
  if found then
    return jsonb_build_object(
      'ok', true,
      'ya_creada', true,
      'public_code', v_public_code,
      'expires_at', v_expires
    );
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  for i in 1..12 loop
    v_public_code := 'ALM-' || upper(translate(
      encode(extensions.gen_random_bytes(6), 'hex'),
      '0134567890abcdef',
      'ABCDEFGHJKLMNPQRSTUV'
    ));
    if not exists (select 1 from bookings where public_code = v_public_code) then
      exit;
    end if;
    v_public_code := null;
  end loop;

  if v_public_code is null then
    return jsonb_build_object('ok', false, 'error', 'interno');
  end if;

  insert into bookings (
    service_id, service_variant_id, patient_id, professional_id,
    starts_at, ends_at, status, origin,
    public_code, access_token, access_token_hash, token_expires_at,
    amount_cents, deposit_required_cents, deposit_verified_cents, currency,
    marketing_source_id, utm_source, utm_medium, utm_campaign,
    notes, hold_expires_at
  ) values (
    v_service.id, v_variant.id, v_patient_id, null,
    p_starts_at, v_fin, 'HELD', 'WEB',
    v_public_code, v_token, encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_now + interval '7 days',
    v_variant.amount_cents, v_variant.deposit_cents, 0, v_settings.currency,
    (p_utm->>'source_id')::uuid,
    p_utm->>'utm_source',
    p_utm->>'utm_medium',
    p_utm->>'utm_campaign',
    coalesce(p_patient->>'notes', ''),
    v_now + make_interval(mins => v_hold_min)
  )
  returning id into v_booking_id;

  insert into booking_events (booking_id, to_status, actor, reason)
  values (v_booking_id, 'HELD', 'patient', 'retencion ' || v_hold_min::text || ' min');

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'id', v_booking_id,
    'public_code', v_public_code,
    'expires_at', v_now + make_interval(mins => v_hold_min),
    'ends_at', v_fin,
    'etiqueta', v_hora::text
  );
end;
$$;

revoke all on function crear_retencion_web(text, uuid, timestamptz, jsonb, jsonb) from public, authenticated;
grant execute on function crear_retencion_web(text, uuid, timestamptz, jsonb, jsonb) to anon;
grant execute on function crear_retencion_web(text, uuid, timestamptz, jsonb, jsonb) to service_role;

-- =====================================================================
-- CONSULTA PRIVADA por token (hash en BD)
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
    'origin', b.origin,
    'service', s.name,
    'slug', s.slug,
    'duracion_min', sv.duration_minutes,
    'inicio_lima', b.starts_at at time zone 'America/Lima',
    'fin_lima', b.ends_at at time zone 'America/Lima',
    'amount_cents', b.amount_cents,
    'deposit_required_cents', b.deposit_required_cents,
    'deposit_verified_cents', b.deposit_verified_cents,
    'currency', b.currency,
    'public_code', b.public_code,
    'notes', b.notes,
    'hold_expira', b.hold_expires_at,
    'token_expira', b.token_expires_at,
    'paciente_nombre', p.full_name,
    'paciente_telefono', p.phone,
    'policy_hours', (select cancellation_policy_hours from business_settings limit 1),
    'puede_cancelar', (
      b.status = 'HELD'
      or (b.status = 'CONFIRMED'
          and b.starts_at > now() + make_interval(
            mins => (select cancellation_policy_hours from business_settings limit 1) * 60))
    )
  )
  from bookings b
  join services s on s.id = b.service_id
  join service_variants sv on sv.id = b.service_variant_id
  join patients p on p.id = b.patient_id
  where b.access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and b.token_expires_at > now();
$$;

revoke all on function obtener_reserva_por_token(text) from public, authenticated;
grant execute on function obtener_reserva_por_token(text) to anon;
grant execute on function obtener_reserva_por_token(text) to service_role;

-- =====================================================================
-- CANCELACIÓN del paciente (por token, según política)
-- =====================================================================
create or replace function cancelar_reserva_por_token(p_token text, p_motivo text default '')
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
  where b.access_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and b.token_expires_at > now();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_encontrada');
  end if;

  select cancellation_policy_hours into v_policy from business_settings limit 1;

  if v_booking.status = 'HELD' then
    update bookings
    set status = 'CANCELLED',
        cancellation_reason = coalesce(nullif(p_motivo, ''), 'cancelada por el paciente')
    where id = v_booking.id;
    return jsonb_build_object('ok', true, 'status', 'CANCELLED');
  end if;

  if v_booking.status = 'CONFIRMED'
     and v_booking.starts_at > now() + make_interval(hours => v_policy) then
    update bookings
    set status = 'CANCELLED',
        cancellation_reason = coalesce(nullif(p_motivo, ''), 'cancelada por el paciente')
    where id = v_booking.id;
    return jsonb_build_object('ok', true, 'status', 'CANCELLED');
  end if;

  return jsonb_build_object('ok', false, 'error', 'fuera_de_politica', 'policy_hours', v_policy);
end;
$$;

revoke all on function cancelar_reserva_por_token(text, text) from public, authenticated;
grant execute on function cancelar_reserva_por_token(text, text) to anon;
grant execute on function cancelar_reserva_por_token(text, text) to service_role;

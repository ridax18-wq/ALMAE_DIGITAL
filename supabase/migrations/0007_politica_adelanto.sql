-- ALMAE DIGITAL — 0007: política de adelanto y expiración de pagos
-- El adelanto pasa a ser calculado por un parámetro editable del negocio
-- (advance_percent) cuando la variante no define advance_amount.
-- VALOR PROVISIONAL 40% — configurable por el propietario en business_settings
-- (y en el panel admin a partir de FASE 6).

alter table business_settings
  add column advance_percent int2 not null default 40
  check (advance_percent between 0 and 100);

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
  v_advance numeric(10, 2);
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

  v_advance := coalesce(
    v_variant.advance_amount,
    round(v_variant.price * v_settings.advance_percent / 100.0, 2)
  );

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

  select id, access_token, expires_at into v_booking_id, v_token, v_expires
  from bookings
  where patient_id = v_patient_id
    and service_id = v_service.id
    and starts_at = p_starts_at
    and status in ('HELD', 'PENDING_PAYMENT');
  if found then
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
    v_variant.price, v_advance, v_settings.currency,
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

revoke all on function crear_reserva_con_hold(text, uuid, timestamptz, jsonb, jsonb) from public, authenticated;
grant execute on function crear_reserva_con_hold(text, uuid, timestamptz, jsonb, jsonb) to anon;

-- =====================================================================
-- Expiración de pagos en proceso (parte del CRON)
-- =====================================================================
create or replace function expirar_pagos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta int;
begin
  with expirados as (
    update payments p
    set status = 'EXPIRED'
    where p.status in ('CREATED', 'PENDING')
      and (
        exists (
          select 1 from bookings b
          where b.id = p.booking_id
            and b.status in ('EXPIRED', 'CANCELLED')
        )
        or (
          p.booking_id is null
          and p.created_at < now() - interval '1 hour'
        )
      )
    returning id
  )
  select count(*) into v_cuenta from expirados;
  return v_cuenta;
end;
$$;

revoke all on function expirar_pagos() from public, anon, authenticated;

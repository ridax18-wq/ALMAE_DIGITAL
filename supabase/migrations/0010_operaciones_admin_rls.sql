-- ALMAE DIGITAL — 0010: operaciones administrativas transaccionales y RLS
-- Funciones seguras de owner: confirmar cita, extender retención,
-- reserva presencial, crear/retirar bloqueos. RLS de las tablas nuevas.

-- =====================================================================
-- AUTORIZACIÓN: owner activo verificado desde la identidad del servidor
-- =====================================================================
create or replace function es_owner_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from admin_profiles
    where user_id = auth.uid()
      and role = 'owner'
      and active
  );
$$;

revoke execute on function es_owner_activo() from public, anon;
grant execute on function es_owner_activo() to authenticated;

-- =====================================================================
-- CONFIRMACIÓN ADMINISTRATIVA (transaccional, idempotente, con validación
-- de vencimiento y de adelantos VERIFIED)
-- =====================================================================
create or replace function confirmar_reserva_admin(
  p_booking_id uuid,
  p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva record;
  v_verificado int := 0;
  v_requerido int;
begin
  if not es_owner_activo() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  perform expirar_retenciones();

  select b.id, b.status, b.amount_cents, b.deposit_required_cents, b.currency,
         b.hold_expires_at, b.starts_at, b.ends_at
    into v_reserva
  from bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_encontrada');
  end if;

  if v_reserva.status = 'CONFIRMED' then
    return jsonb_build_object(
      'ok', true,
      'ya_confirmada', true,
      'status', 'CONFIRMED'
    );
  end if;

  if v_reserva.status <> 'HELD' then
    return jsonb_build_object('ok', false, 'error', 'estado_no_confirmable', 'status', v_reserva.status);
  end if;

  if v_reserva.hold_expires_at is null or v_reserva.hold_expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'retencion_expirada');
  end if;

  if not exists (
    select 1 from agenda_occupancy
    where booking_id = v_reserva.id and source = 'BOOKING'
  ) then
    return jsonb_build_object('ok', false, 'error', 'horario_libre_reprogramar');
  end if;

  v_requerido := v_reserva.deposit_required_cents;

  if v_requerido > 0 then
    select coalesce(sum(mp.amount_cents), 0)::int into v_verificado
    from manual_payments mp
    where mp.booking_id = v_reserva.id
      and mp.verification_status = 'VERIFIED';

    if v_verificado < v_requerido then
      return jsonb_build_object(
        'ok', false,
        'error', 'adelante_insuficiente',
        'deposit_required_cents', v_requerido,
        'deposit_verified_cents', v_verificado
      );
    end if;
  end if;

  update bookings
  set status = 'CONFIRMED',
      confirmed_at = now(),
      confirmed_by = auth.uid(),
      deposit_verified_cents = v_verificado
  where id = v_reserva.id;

  insert into booking_events (booking_id, to_status, actor, reason)
  values (v_reserva.id, 'CONFIRMED', 'admin', coalesce(p_motivo, 'confirmación administrativa'));

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, after)
  values (auth.uid(), 'owner', 'reserva.confirmada', 'bookings', v_reserva.id,
          jsonb_build_object('deposit_verified_cents', v_verificado));

  return jsonb_build_object('ok', true, 'status', 'CONFIRMED', 'deposit_verified_cents', v_verificado);
end;
$$;

revoke all on function confirmar_reserva_admin(uuid, text) from public, anon;
grant execute on function confirmar_reserva_admin(uuid, text) to authenticated;

-- =====================================================================
-- EXTENSIÓN de retención (owner; con límite configurable; sin reactivar vencidas)
-- =====================================================================
create or replace function extender_retencion(
  p_booking_id uuid,
  p_minutos_extra int,
  p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva record;
  v_max int;
begin
  if not es_owner_activo() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  if p_minutos_extra is null or p_minutos_extra <= 0 then
    return jsonb_build_object('ok', false, 'error', 'minutos_invalidos');
  end if;

  select max_hold_extension_minutes into v_max from business_settings limit 1;

  if v_max is not null and p_minutos_extra > v_max then
    return jsonb_build_object('ok', false, 'error', 'extension_excede_maximo', 'max_minutos', v_max);
  end if;

  select b.id, b.status, b.hold_expires_at into v_reserva
  from bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_encontrada');
  end if;

  if v_reserva.status <> 'HELD' then
    return jsonb_build_object('ok', false, 'error', 'estado_no_extendible', 'status', v_reserva.status);
  end if;

  if v_reserva.hold_expires_at is null or v_reserva.hold_expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'retencion_ya_expirada');
  end if;

  update bookings
  set hold_expires_at = v_reserva.hold_expires_at + make_interval(mins => p_minutos_extra)
  where id = v_reserva.id;

  insert into booking_events (booking_id, to_status, actor, reason)
  values (v_reserva.id, null, 'admin',
          'extensión ' || p_minutos_extra::text || ' min — ' || coalesce(p_motivo, 'sin motivo'));

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, after)
  values (auth.uid(), 'owner', 'retencion.extendida', 'bookings', v_reserva.id,
          jsonb_build_object('minutos_extra', p_minutos_extra, 'motivo', p_motivo));

  return jsonb_build_object(
    'ok', true,
    'nuevo_vencimiento', v_reserva.hold_expires_at + make_interval(mins => p_minutos_extra)
  );
end;
$$;

revoke all on function extender_retencion(uuid, int, text) from public, anon;
grant execute on function extender_retencion(uuid, int, text) to authenticated;

-- =====================================================================
-- RESERVA PRESENCIAL (owner; CONFIRMED inmediato; ocupa la agenda ya)
-- =====================================================================
create or replace function crear_reserva_presencial(p_entrada jsonb)
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
  v_dow_iso int;
  v_patient_id uuid;
  v_booking_id uuid;
  v_public_code text;
  v_exencion boolean;
  v_deposito int;
begin
  if not es_owner_activo() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  select * into v_settings from business_settings limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'configuracion_ausente');
  end if;

  perform expirar_retenciones();

  select s.id, s.name, s.active into v_service
  from services s
  where s.slug = p_entrada->>'service_slug' and s.active and s.location = 'consultorio';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'servicio_no_disponible');
  end if;

  select sv.id, sv.service_id, sv.duration_minutes, sv.prep_buffer_minutes,
         sv.amount_cents, sv.deposit_cents
    into v_variant
  from service_variants sv
  where sv.id = (p_entrada->>'variant_id')::uuid and sv.service_id = v_service.id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'variante_no_disponible');
  end if;

  if (p_entrada->>'starts_at')::timestamptz > now() + make_interval(days => v_settings.max_advance_days) then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_ventana');
  end if;

  v_dia := ((p_entrada->>'starts_at')::timestamptz at time zone 'America/Lima')::date;
  v_hora := ((p_entrada->>'starts_at')::timestamptz at time zone 'America/Lima')::time;
  v_dow_iso := case extract(dow from (p_entrada->>'starts_at')::timestamptz at time zone 'America/Lima')::int
                 when 0 then 7
                 else extract(dow from (p_entrada->>'starts_at')::timestamptz at time zone 'America/Lima')::int
               end;

  select opens_at, closes_at into v_horario
  from business_hours
  where day_of_week = v_dow_iso
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_horario');
  end if;

  v_fin := (p_entrada->>'starts_at')::timestamptz
           + make_interval(mins => v_variant.duration_minutes + v_variant.prep_buffer_minutes);
  v_apertura := (v_dia + v_horario.opens_at) at time zone 'America/Lima';
  v_cierre := (v_dia + v_horario.closes_at) at time zone 'America/Lima';

  if (p_entrada->>'starts_at')::timestamptz < v_apertura or v_fin > v_cierre then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_horario');
  end if;

  select p.id into v_patient_id
  from patients p
  where p.phone = p_entrada->>'phone';
  if not found then
    insert into patients (full_name, phone, email, contact_consent, consent_at)
    values (
      p_entrada->>'full_name',
      p_entrada->>'phone',
      nullif(p_entrada->>'email', ''),
      coalesce((p_entrada->>'consent')::boolean, false),
      case when coalesce((p_entrada->>'consent')::boolean, false) then now() else null end
    )
    returning id into v_patient_id;
  else
    update patients
    set contact_consent = contact_consent or coalesce((p_entrada->>'consent')::boolean, false)
    where id = v_patient_id;
  end if;

  perform pg_advisory_xact_lock(hashtext('almae:presencial:' || v_dia::text));

  if exists (
    select 1 from agenda_occupancy o
    where o.profesional_clave = 'unico'
      and o.rango && tstzrange(
            (p_entrada->>'starts_at')::timestamptz - make_interval(mins => v_settings.booking_gap_minutes),
            v_fin + make_interval(mins => v_settings.booking_gap_minutes))
  ) then
    return jsonb_build_object('ok', false, 'error', 'slot_no_disponible');
  end if;

  v_exencion := coalesce((p_entrada->>'exencion_adelanto')::boolean, false);
  v_deposito := case when v_exencion then 0 else v_variant.deposit_cents end;

  v_public_code := 'ALM-' || upper(translate(
    encode(extensions.gen_random_bytes(6), 'hex'),
    '0134567890abcdef',
    'ABCDEFGHJKLMNPQRSTUV'
  ));

  insert into bookings (
    service_id, service_variant_id, patient_id, professional_id,
    starts_at, ends_at, status, origin,
    public_code, access_token, access_token_hash, token_expires_at,
    amount_cents, deposit_required_cents, deposit_verified_cents, currency,
    utm_source, utm_medium, utm_campaign,
    notes, hold_expires_at,
    confirmed_at, confirmed_by
  ) values (
    v_service.id, v_variant.id, v_patient_id, null,
    (p_entrada->>'starts_at')::timestamptz, v_fin, 'CONFIRMED', 'IN_PERSON',
    v_public_code, null, null, now() + interval '7 days',
    v_variant.amount_cents, v_deposito, 0, v_settings.currency,
    p_entrada->>'utm_source', p_entrada->>'utm_medium', p_entrada->>'utm_campaign',
    coalesce(p_entrada->>'notes', '') || case when v_exencion
      then ' [Exención de adelanto: ' || coalesce(p_entrada->>'motivo_exencion', 'sin motivo') || ']'
      else '' end,
    null,
    now(), auth.uid()
  )
  returning id into v_booking_id;

  insert into booking_events (booking_id, to_status, actor, reason)
  values (v_booking_id, 'CONFIRMED', 'admin', 'reserva presencial');

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, after)
  values (auth.uid(), 'owner', 'reserva.presencial', 'bookings', v_booking_id,
          jsonb_build_object('exencion_adelanto', v_exencion));

  return jsonb_build_object(
    'ok', true,
    'id', v_booking_id,
    'public_code', v_public_code,
    'status', 'CONFIRMED'
  );
end;
$$;

revoke all on function crear_reserva_presencial(jsonb) from public, anon;
grant execute on function crear_reserva_presencial(jsonb) to authenticated;

-- =====================================================================
-- BLOQUEOS administrativos (con reporte de conflictos antes de bloquear)
-- =====================================================================
create or replace function crear_bloqueo_agenda(
  p_inicio timestamptz,
  p_fin timestamptz,
  p_tipo block_type,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_block_id uuid;
  v_conflictos jsonb;
begin
  if not es_owner_activo() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  if p_inicio >= p_fin then
    return jsonb_build_object('ok', false, 'error', 'rango_invalido');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'booking_id', o.booking_id,
    'public_code', b.public_code,
    'paciente', p.full_name,
    'estado', b.status,
    'inicio', b.starts_at at time zone 'America/Lima',
    'fin', b.ends_at at time zone 'America/Lima'
  )), '[]'::jsonb) into v_conflictos
  from agenda_occupancy o
  join bookings b on b.id = o.booking_id
  join patients p on p.id = b.patient_id
  where o.source = 'BOOKING'
    and o.rango && tstzrange(p_inicio, p_fin);

  if v_conflictos <> '[]'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'conflicto_con_citas', 'conflictos', v_conflictos);
  end if;

  insert into schedule_blocks (starts_at, ends_at, block_type, reason, created_by)
  values (p_inicio, p_fin, p_tipo, p_reason, auth.uid())
  returning id into v_block_id;

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, after)
  values (auth.uid(), 'owner', 'agenda.bloqueo_creado', 'schedule_blocks', v_block_id,
          jsonb_build_object('inicio', p_inicio, 'fin', p_fin, 'tipo', p_tipo));

  return jsonb_build_object('ok', true, 'block_id', v_block_id);
end;
$$;

revoke all on function crear_bloqueo_agenda(timestamptz, timestamptz, block_type, text) from public, anon;
grant execute on function crear_bloqueo_agenda(timestamptz, timestamptz, block_type, text) to authenticated;

create or replace function liberar_bloqueo_agenda(p_block_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not es_owner_activo() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  delete from schedule_blocks where id = p_block_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'bloqueo_no_encontrado');
  end if;

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id)
  values (auth.uid(), 'owner', 'agenda.bloqueo_retirado', 'schedule_blocks', p_block_id);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function liberar_bloqueo_agenda(uuid) from public, anon;
grant execute on function liberar_bloqueo_agenda(uuid) to authenticated;

-- =====================================================================
-- RLS de tablas nuevas
-- =====================================================================
alter table manual_payments enable row level security;
alter table schedule_blocks enable row level security;
alter table agenda_occupancy enable row level security;

create policy "pagos_manuales_owner" on manual_payments
  for all to authenticated
  using (es_owner_activo())
  with check (es_owner_activo());

create policy "bloqueos_owner" on schedule_blocks
  for all to authenticated
  using (es_owner_activo())
  with check (es_owner_activo());

create policy "ocupacion_owner_lectura" on agenda_occupancy
  for select to authenticated
  using (es_owner_activo());

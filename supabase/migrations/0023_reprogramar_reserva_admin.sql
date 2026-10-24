-- ALMAE DIGITAL — 0023: reprogramación administrativa transaccional
-- Migra la MISMA reserva a un nuevo inicio en una sola operación atómica:
-- valida estado, motivo, pasado, conflictos y ocupación; registra historial
-- (booking_events) y auditoría (audit_logs). Cualquier fallo revierte todo.

create or replace function reprogramar_reserva_admin(
  p_booking_id uuid,
  p_inicio timestamptz,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva record;
  v_variant record;
  v_settings record;
  v_nuevo_fin timestamptz;
  v_gap int;
  v_motivo_limpio text;
begin
  if not es_owner_activo() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  v_motivo_limpio := nullif(trim(coalesce(p_motivo, '')), '');
  if v_motivo_limpio is null or length(v_motivo_limpio) < 3 then
    return jsonb_build_object('ok', false, 'error', 'motivo_requerido');
  end if;

  if p_inicio is null or p_inicio < now() then
    return jsonb_build_object('ok', false, 'error', 'inicio_en_el_pasado');
  end if;

  select b.id, b.status, b.starts_at, b.ends_at, b.service_variant_id
  into v_reserva
  from bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_encontrada');
  end if;

  if v_reserva.status not in ('HELD', 'CONFIRMED') then
    return jsonb_build_object('ok', false, 'error', 'estado_no_reprogramable', 'status', v_reserva.status);
  end if;

  select duration_minutes, prep_buffer_minutes
  into v_variant
  from service_variants
  where id = v_reserva.service_variant_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'variante_no_encontrada');
  end if;

  select booking_gap_minutes into v_gap from business_settings limit 1;
  v_gap := coalesce(v_gap, 15);

  v_nuevo_fin := p_inicio + make_interval(
    mins => v_variant.duration_minutes + coalesce(v_variant.prep_buffer_minutes, 0));

  if hay_conflicto_agenda(p_inicio, v_nuevo_fin, v_reserva.id, v_gap) then
    return jsonb_build_object('ok', false, 'error', 'horario_ocupado');
  end if;

  update bookings
  set starts_at = p_inicio, ends_at = v_nuevo_fin
  where id = v_reserva.id;

  insert into booking_events (booking_id, from_status, to_status, actor, reason)
  values (
    v_reserva.id,
    v_reserva.status,
    v_reserva.status,
    'admin',
    'reprogramada: ' || to_char(v_reserva.starts_at, 'DD/MM/YYYY HH24:MI') ||
      ' → ' || to_char(p_inicio, 'DD/MM/YYYY HH24:MI') || ' — ' || v_motivo_limpio
  );

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    'owner',
    'reserva.reprogramada',
    'bookings',
    v_reserva.id,
    jsonb_build_object('starts_at', v_reserva.starts_at, 'ends_at', v_reserva.ends_at),
    jsonb_build_object('starts_at', p_inicio, 'ends_at', v_nuevo_fin, 'motivo', v_motivo_limpio)
  );

  return jsonb_build_object(
    'ok', true,
    'nuevo_inicio', p_inicio,
    'nuevo_fin', v_nuevo_fin
  );

exception
  when exclusion_violation then
    return jsonb_build_object('ok', false, 'error', 'horario_ocupado');
end;
$$;

revoke all on function reprogramar_reserva_admin(uuid, timestamptz, text) from public, anon;
grant execute on function reprogramar_reserva_admin(uuid, timestamptz, text) to authenticated;

-- =====================================================================
-- CANCELACIÓN administrativa con motivo obligatorio y auditoría.
-- Nunca borra la reserva: solo cambia de estado (el trigger libera la
-- ocupación de agenda) y deja trazabilidad completa.
-- =====================================================================
create or replace function cancelar_reserva_admin(
  p_booking_id uuid,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva record;
  v_motivo_limpio text;
begin
  if not es_owner_activo() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  v_motivo_limpio := nullif(trim(coalesce(p_motivo, '')), '');
  if v_motivo_limpio is null or length(v_motivo_limpio) < 3 then
    return jsonb_build_object('ok', false, 'error', 'motivo_requerido');
  end if;

  select b.id, b.status, b.starts_at, b.ends_at
  into v_reserva
  from bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_encontrada');
  end if;

  if v_reserva.status = 'CANCELLED' then
    return jsonb_build_object('ok', false, 'error', 'ya_cancelada');
  end if;

  if v_reserva.status not in ('HELD', 'CONFIRMED') then
    return jsonb_build_object('ok', false, 'error', 'estado_no_cancelable', 'status', v_reserva.status);
  end if;

  perform set_config('app.booking_reason', 'cancelación administrativa: ' || v_motivo_limpio, true);

  begin
    update bookings set status = 'CANCELLED' where id = v_reserva.id;
  exception
    when check_violation then
      return jsonb_build_object('ok', false, 'error', 'transicion_invalida', 'status', v_reserva.status);
  end;

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    'owner',
    'reserva.cancelada',
    'bookings',
    v_reserva.id,
    jsonb_build_object('status', v_reserva.status, 'starts_at', v_reserva.starts_at),
    jsonb_build_object('status', 'CANCELLED', 'motivo', v_motivo_limpio)
  );

  return jsonb_build_object('ok', true, 'status', 'CANCELLED');
end;
$$;

revoke all on function cancelar_reserva_admin(uuid, text) from public, anon;
grant execute on function cancelar_reserva_admin(uuid, text) to authenticated;

-- =====================================================================
-- CONTROL DE ASISTENCIA: COMPLETED (asistió) u NO_SHOW (no asistió).
-- Solo desde CONFIRMED; motivo opcional registrado en historial/auditoría.
-- =====================================================================
create or replace function registrar_asistencia_admin(
  p_booking_id uuid,
  p_estado booking_status,
  p_motivo text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva record;
  v_motivo text;
begin
  if not es_owner_activo() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  if p_estado not in ('COMPLETED', 'NO_SHOW') then
    return jsonb_build_object('ok', false, 'error', 'estado_invalido');
  end if;

  v_motivo := nullif(trim(coalesce(p_motivo, '')), '');

  select b.id, b.status, b.starts_at
  into v_reserva
  from bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'reserva_no_encontrada');
  end if;

  if v_reserva.status not in ('CONFIRMED', 'COMPLETED', 'NO_SHOW') then
    return jsonb_build_object('ok', false, 'error', 'transicion_invalida', 'status', v_reserva.status);
  end if;

  if v_reserva.status = p_estado then
    return jsonb_build_object('ok', false, 'error', 'asistencia_ya_registrada', 'status', p_estado);
  end if;

  if v_reserva.status <> 'CONFIRMED' then
    return jsonb_build_object('ok', false, 'error', 'transicion_invalida', 'status', v_reserva.status);
  end if;

  perform set_config(
    'app.booking_reason',
    case when p_estado = 'COMPLETED' then 'asistencia registrada' else 'inasistencia registrada' end
      || coalesce(' — ' || v_motivo, ''),
    true
  );

  begin
    update bookings set status = p_estado where id = v_reserva.id;
  exception
    when check_violation then
      return jsonb_build_object('ok', false, 'error', 'transicion_invalida', 'status', v_reserva.status);
  end;

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    'owner',
    'reserva.' || case when p_estado = 'COMPLETED' then 'completada' else 'no_show' end,
    'bookings',
    v_reserva.id,
    jsonb_build_object('status', v_reserva.status),
    jsonb_build_object('status', p_estado, 'motivo', v_motivo, 'fecha_registro', now())
  );

  return jsonb_build_object('ok', true, 'status', p_estado);
end;
$$;

revoke all on function registrar_asistencia_admin(uuid, booking_status, text) from public, anon;
grant execute on function registrar_asistencia_admin(uuid, booking_status, text) to authenticated;

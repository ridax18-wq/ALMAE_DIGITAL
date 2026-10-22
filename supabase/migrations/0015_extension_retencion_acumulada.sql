-- ALMAE DIGITAL — 0015: tope ACUMULADO de extensiones de retención (Hito 3.2-A2)
-- y evitación de eventos duplicados en la bitácora de estados.
-- 1) extender_retencion limitaba solo cada operación; el máximo aplica al total
--    extendido: (vencimiento actual - creación - TTL inicial).
-- 2) confirmar_reserva_admin registra su propio evento y el trigger de estado
--    registraba otro en la misma transacción: el trigger omite el duplicado.

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
  if exists (
    select 1 from booking_events e
    where e.booking_id = new.id
      and e.to_status = new.status
      and e.created_at = now()
  ) then
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
  v_ttl int;
  v_acumulado int;
  v_disponible int;
begin
  if not es_owner_activo() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  if p_minutos_extra is null or p_minutos_extra <= 0 then
    return jsonb_build_object('ok', false, 'error', 'minutos_invalidos');
  end if;

  select max_hold_extension_minutes, booking_hold_ttl_minutes
    into v_max, v_ttl
  from business_settings limit 1;

  if v_max is not null and p_minutos_extra > v_max then
    return jsonb_build_object('ok', false, 'error', 'extension_excede_maximo', 'max_minutos', v_max);
  end if;

  select b.id, b.status, b.hold_expires_at, b.created_at into v_reserva
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

  v_acumulado := greatest(0, floor(extract(epoch from (
    v_reserva.hold_expires_at - v_reserva.created_at - make_interval(mins => v_ttl)
  )) / 60)::int);
  v_disponible := greatest(0, coalesce(v_max, 0) - v_acumulado);

  if v_max is not null and p_minutos_extra > v_disponible then
    return jsonb_build_object(
      'ok', false,
      'error', 'extension_excede_maximo',
      'max_minutos', v_max,
      'acumulado_minutos', v_acumulado,
      'disponible_minutos', v_disponible
    );
  end if;

  update bookings
  set hold_expires_at = v_reserva.hold_expires_at + make_interval(mins => p_minutos_extra)
  where id = v_reserva.id;

  insert into booking_events (booking_id, to_status, actor, reason)
  values (v_reserva.id, null, 'admin',
          'extensión ' || p_minutos_extra::text || ' min — ' || coalesce(p_motivo, 'sin motivo'));

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, after)
  values (auth.uid(), 'owner', 'retencion.extendida', 'bookings', v_reserva.id,
          jsonb_build_object('minutos_extra', p_minutos_extra, 'motivo', p_motivo,
                             'acumulado_previo', v_acumulado));

  return jsonb_build_object(
    'ok', true,
    'nuevo_vencimiento', v_reserva.hold_expires_at + make_interval(mins => p_minutos_extra),
    'acumulado_minutos', v_acumulado + p_minutos_extra,
    'disponible_minutos', v_max - (v_acumulado + p_minutos_extra)
  );
end;
$$;

revoke all on function extender_retencion(uuid, int, text) from public, anon;
grant execute on function extender_retencion(uuid, int, text) to authenticated;

-- 2) confirmar_reserva_admin ya no inserta su propio evento: lo registra el
--    trigger de cambio de estado, con el motivo pasado vía app.booking_reason.
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

  perform set_config('app.booking_reason', coalesce(p_motivo, 'confirmación administrativa'), true);

  update bookings
  set status = 'CONFIRMED',
      confirmed_at = now(),
      confirmed_by = auth.uid(),
      deposit_verified_cents = v_verificado
  where id = v_reserva.id;

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, after)
  values (auth.uid(), 'owner', 'reserva.confirmada', 'bookings', v_reserva.id,
          jsonb_build_object('deposit_verified_cents', v_verificado));

  return jsonb_build_object('ok', true, 'status', 'CONFIRMED', 'deposit_verified_cents', v_verificado);
end;
$$;

revoke all on function confirmar_reserva_admin(uuid, text) from public, anon;
grant execute on function confirmar_reserva_admin(uuid, text) to authenticated;

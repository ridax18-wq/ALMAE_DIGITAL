-- ALMAE DIGITAL — 0022: tipos de bloqueo ampliados y control de solapes de bloqueos.
-- Reutiliza agenda_occupancy (exclusion agenda_no_overlap) como fuente de verdad.

alter type block_type add value if not exists 'LUNCH';
alter type block_type add value if not exists 'VACATION';
alter type block_type add value if not exists 'TRAINING';

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

  if p_inicio is null or p_fin is null or p_inicio >= p_fin then
    return jsonb_build_object('ok', false, 'error', 'rango_invalido');
  end if;

  if p_fin - p_inicio > interval '90 days' then
    return jsonb_build_object('ok', false, 'error', 'rango_excesivo');
  end if;

  if exists (
    select 1
    from agenda_occupancy o
    where o.source = 'BLOCK'
      and o.rango && tstzrange(p_inicio, p_fin, '[)')
  ) then
    return jsonb_build_object('ok', false, 'error', 'bloqueo_superpuesto');
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
    and o.rango && tstzrange(p_inicio, p_fin, '[)');

  if v_conflictos <> '[]'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'conflicto_con_citas', 'conflictos', v_conflictos);
  end if;

  begin
    insert into schedule_blocks (starts_at, ends_at, block_type, reason, created_by)
    values (p_inicio, p_fin, p_tipo, coalesce(p_reason, ''), auth.uid())
    returning id into v_block_id;
  exception when exclusion_violation then
    return jsonb_build_object('ok', false, 'error', 'bloqueo_superpuesto');
  end;

  insert into audit_logs (actor_user_id, actor_role, action, entity, entity_id, after)
  values (auth.uid(), 'owner', 'agenda.bloqueo_creado', 'schedule_blocks', v_block_id,
          jsonb_build_object('inicio', p_inicio, 'fin', p_fin, 'tipo', p_tipo));

  return jsonb_build_object('ok', true, 'block_id', v_block_id);
end;
$$;

revoke all on function crear_bloqueo_agenda(timestamptz, timestamptz, block_type, text) from public, anon;
grant execute on function crear_bloqueo_agenda(timestamptz, timestamptz, block_type, text) to authenticated;

-- ALMAE DIGITAL — 0012: utilidades de consulta de ocupación
-- hay_conflicto_agenda: valida si un intervalo (con margen/gap) choca con
-- cualquier ocupante activo, excluyendo una reserva dada (reprogramaciones).

create or replace function hay_conflicto_agenda(
  p_inicio timestamptz,
  p_fin timestamptz,
  p_excluir_booking uuid default null,
  p_margen_min int default 0
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from agenda_occupancy o
    where o.profesional_clave = 'unico'
      and (p_excluir_booking is null or o.booking_id is distinct from p_excluir_booking)
      and o.rango && tstzrange(
            p_inicio - make_interval(mins => p_margen_min),
            p_fin + make_interval(mins => p_margen_min))
  );
$$;

revoke all on function hay_conflicto_agenda(timestamptz, timestamptz, uuid, int) from public, anon;
grant execute on function hay_conflicto_agenda(timestamptz, timestamptz, uuid, int) to authenticated;
grant execute on function hay_conflicto_agenda(timestamptz, timestamptz, uuid, int) to service_role;

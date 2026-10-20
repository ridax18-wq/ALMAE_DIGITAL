-- ALMAE DIGITAL — 0011: horarios definitivos
-- Día ISO (1 = lunes … 7 = domingo), varios bloques por día,
-- y función de validación de la semana laboral.

alter table business_hours
  rename column weekday to day_of_week;

-- Normalización a ISO: 0 (domingo) -> 7; 1..6 coinciden
update business_hours
set day_of_week = 7
where day_of_week = 0;

alter table business_hours
  drop constraint business_hours_weekday_unico;

create or replace function validar_semana_laboral()
returns jsonb
language plpgsql
stable
as $$
declare
  v_solapes int;
begin
  select count(*) into v_solapes
  from business_hours a
  join business_hours b
    on a.id < b.id
   and a.day_of_week = b.day_of_week
   and a.opens_at < b.closes_at
   and b.opens_at < a.closes_at;

  return jsonb_build_object('ok', v_solapes = 0, 'solapes', v_solapes);
end;
$$;

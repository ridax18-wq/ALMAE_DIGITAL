-- ALMAE DIGITAL — 0024: endurece la matriz de transiciones de reservas
-- hallazgo de 3.3-E: bookings_valid_transitions no tenia RLS y anon podia
-- modificarla (UPDATE 1 verificado en psql), lo que permitia ampliar la
-- matriz que usan los triggers de estado. La aplicacion no la consulta por
-- REST (solo los triggers), por lo que se revocan los grants de los roles
-- de aplicacion y se activa RLS deny-all. service_role (BYPASSRLS) y las
-- funciones security definer siguen operando con normalidad.

revoke all on table bookings_valid_transitions from public, anon, authenticated;

alter table bookings_valid_transitions enable row level security;

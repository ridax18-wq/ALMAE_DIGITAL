-- =====================================================================
-- ALMAE DIGITAL — 4.3: limpieza de datos ficticios para producción
--
-- POR DEFECTO SE ABORTA. Confirmación obligatoria:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -v confirmar_limpieza_demo=1 \
--        -f scripts/limpiar-demo.sql
--
-- Solo borra registros ficticios identificados:
--   * marketing_sources con la marca literal '(demo)' del seed 0005
--   * services creados por pruebas e2e (marcas 'e2e'/'prueba'/'demo')
--     que NO tengan reservas asociadas
--
-- PROHIBIDO en este script (no aparece): borrar patients, bookings,
-- payments, services con reservas, business_settings, business_hours
-- ni cualquier otra tabla comercial o de datos personales.
-- =====================================================================

\if :{?confirmar_limpieza_demo}
  \if :confirmar_limpieza_demo
  \else
    \echo 'ABORTADO: confirmar_limpieza_demo debe valer 1'
    select pg_terminate_backend(pg_backend_pid());
  \endif
\else
  \echo 'ABORTADO (por defecto): re-ejecuta con -v confirmar_limpieza_demo=1'
  select pg_terminate_backend(pg_backend_pid());
\endif

begin;

delete from marketing_sources
where name like '%(demo)%';

delete from services s
where (
      lower(s.name) ~ 'demo|prueba|e2e'
   or lower(s.slug)  ~ 'demo|prueba|e2e'
)
and not exists (
  select 1
  from service_variants v
  join bookings b on b.service_variant_id = v.id
  where v.service_id = s.id
);

commit;

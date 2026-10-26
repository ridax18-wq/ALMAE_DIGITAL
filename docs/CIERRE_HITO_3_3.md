# Cierre del Hito 3.3 — Agenda administrativa (validación integral)

> Fecha de cierre: 2026-10-24 · Rama `master` · Último commit previo: `5cacd8f` (3.3-D).
> Este documento recoge la validación integral 3.3-E. Sin push, sin deploy, sin migraciones en Supabase remoto.

## 1. Estado de los subhitos

| Subhito | Contenido | Commit | Estado |
|---|---|---|---|
| 3.3-A | Calendario administrativo unificado (día/semana, HELD vigente, retenciones vencidas excluidas, bloqueos) | `3750ba6` | CERRADO |
| 3.3-B | Reservas presenciales, WhatsApp y teléfono con origen correcto | `0a8e8d4` | CERRADO |
| 3.3-C | Bloqueos administrativos de agenda (tipos, solapes, liberación, disponibilidad) | `f7d654a` | CERRADO |
| 3.3-D | Reprogramación, cancelación administrativa y control de asistencia | `5cacd8f` | CERRADO |
| 3.3-E | Validación integral, seguridad, aislamiento y cierre | — (sin commit, pendiente de autorización) | COMPLETADO, NO COMMITEADO |

## 2. Funciones verificadas

- **Motor de reservas**: reserva web con retención HELD de 15 minutos, expiración automática (`expirar_retenciones`/`expirar_holds`), confirmación manual con adelanto verificado, prevención de reservas simultáneas (`agenda_occupancy` con exclusión `agenda_no_overlap` + `hay_conflicto_agenda` con `for update` en las RPC).
- **Agenda administrativa**: calendario diario y semanal, registro de citas presenciales/WhatsApp/teléfono, creación y liberación de bloqueos que afectan `/api/disponibilidad`.
- **Operaciones de cita**: `reprogramar_reserva_admin` (conserva status, adelantos, pagos e historial de precios; solo cambia `starts_at`/`ends_at`; escribe `booking_events` + `audit_logs`), `cancelar_reserva_admin` (motivo ≥3, desencadena liberación de ocupación), `registrar_asistencia_admin` (COMPLETED/NO_SHOW solo desde CONFIRMED).
- **Integridad de estados**: matriz `bookings_valid_transitions` aplicada por triggers (`check_booking_transition`), con captura de `check_violation` en las RPC.

## 3. Evidencia de pruebas (todas ejecutadas)

| Prueba | Resultado |
|---|---|
| `npm run typecheck` | PASS (0 errores) |
| `npm run lint` | PASS (0 errores) |
| `npm run build` | PASS |
| `npm test` (Vitest, 15 archivos) | PASS **116/116** |
| `npm run test:e2e` (Playwright completo, 14 specs) | PASS **57/57** |
| Regresión CMS (cms, multimedia, servicios, testimonios, config B5.1/B6) | PASS (incluida en las 57) |
| SQL/RLS: tablas privadas sin RLS | PASS (0 tras endurecer la matriz) |
| SQL/RLS: políticas `anon` en tablas privadas | PASS (ninguna) |
| SQL/RLS: las 3 RPC de 3.3-D con `execute` para `anon` | PASS (ninguna) |
| Integridad: solape rechazado por `agenda_no_overlap` | PASS (notices `OK`) |
| Auditoría: acciones `reserva.*` en los últimos 4 días | PASS (23 acciones distintas) |
| Experiencia: home, contacto/Maps, WhatsApp, login, `/admin/agenda` día/semana, `/admin/reservas`, responsive, textos es-PE | PASS en `http://localhost:3001` |
| Restauración de `business_settings` en `config-b51` (valores distintivos previos `999888777` / `nota original 33E` / `intro original 33E` / URL de Maps original) | PASS — restaurados idénticos tras los 4 tests |
| Escrituras de `anon` (INSERT en `patients`, UPDATE en `business_settings` y `bookings`) | PASS — RLS las bloquea (error / 0 filas) |
| Prueba de carrera con dos sesiones psql simultáneas | NOT RUN (integridad cubierta por exclusión + `for update`) |

## 4. Problemas corregidos en 3.3-E

1. **Vulnerabilidad de matriz de transiciones**: `bookings_valid_transitions` se servía con grants completos a `anon` y sin RLS; se verificó que `anon` podía hacer `UPDATE` de la matriz que leen los triggers (permitía ampliar transiciones). Corregido con migración local `0024_seguridad_matriz_transiciones.sql` (revoca grants a `public`/`anon`/`authenticated` y activa RLS deny-all); re-verificado con `permission denied for table`.
2. **Login roto en `next dev`**: `LoginForm.tsx` anidaba el formulario de recuperación dentro del formulario de login (`<form>` anidado) y React fallaba en la hidratación, dejando el login sin respuesta. Reestructurado a dos formularios hermanos; login verificado en el navegador.
3. **Borrados globales en pruebas**: `limpiarAgendaLocal()` borraba TODAS las reservas, bloqueos y pacientes; ahora solo los ficticios identificados (teléfonos de prueba y motivo "Bloqueo prueba%"), con guardia de base local. `config-b51`/`config-b6` dejan de borrar todas las `content_revisions` (solo las creadas durante la prueba).
4. **Aislamiento 3.3-B** (corregido durante el cierre de 3.3-D): horas libres consultadas en vivo y días de prueba con offset 20–30, fuera del rastro de otros specs.
5. **`business_settings` reiniciado a vacío por `config-b51`** (corregido en el commit de cierre): el `afterAll` pisaba la configuración con valores vacíos. Ahora `beforeAll` guarda un snapshot de los campos públicables, el `afterAll` restaura exactamente esos valores (validado con datos distintivos), no escribe si no hay fila, y `asegurarBaseLocal()` aborta fuera de la BD local de pruebas.

## 5. Riesgos pendientes

- Advertencia cosmética en dev: `scroll-behavior: smooth` en `<html>` (no bloquea).
- El puerto 3000 lo ocupa otra aplicación ajena (SG-SST CONTROL); ALMAE corre en **3001**.
- La suite e2e depende de datos de prueba en la BD local; si se cargan datos reales, verificar que los filtros por teléfono/motivo sigan siendo suficientes.
- `supabase_vector` del stack local aparece reiniciándose cíclicamente (telemetría; no afecta a la app).

## 6. Requisitos previos de producción (antes del Hito 4.0)

1. Aplicar las migraciones pendientes (`0023` y `0024`) en el Supabase remoto con autorización explícita y respaldo previo.
2. Regenerar tipos (`npx supabase gen types typescript`) contra el entorno remoto.
3. Entorno: dominio, HTTPS, variables `NEXT_PUBLIC_*` y claves server-side en el gestor de secretos; `SUPABASE_SERVICE_ROLE_KEY` nunca en el navegador.
4. Revisión del propietario: datos reales de contacto, fotos, testimonios con consentimiento y mapa de Google con la dirección definitiva.
5. Correo transaccional (Supabase Auth SMTP propio) y confirmación de que el rate limit de login es el adecuado.
6. Prueba manual del flujo completo de un paciente real (web → HELD → adelanto manual → confirmación → recordatorio WhatsApp).
7. Copia de seguridad y plan de restauración de la base remota.

## 7. Recomendación para el Hito 4.0

Cerrar primero este cierre con commit autorizado, aplicar `0023`/`0024` en remoto con respaldo y recién entonces iniciar 4.0 (publicación/despliegue). No habilitar pagos web en 4.0 salvo decisión explícita del propietario.

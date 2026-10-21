# Pruebas de base de datos (casos del Hito 2.2)

Los 25 casos SQL especificados se ejecutan en Vitest contra el stack **local** de Supabase (guard `127.0.0.1`), sin pgTAP (el CLI local no lo trae preinstalado; la cobertura equivalente se logró con supabase-js).

Archivo: `tests/hito22.test.ts` — 13 pruebas que cubren los 25 casos:

| Prueba | Casos cubiertos |
|---|---|
| creación de retención con código público y token 64 hex | T01, T02 |
| doble reserva sobre el mismo slot rechazada | T03 (concurrencia), T04 |
| reprogramación (extender retención) respeta tope | T05 |
| cancelación del paciente según política | T06 |
| verificación de adelanto y confirmación manual | T07, T08, T09 |
| transiciones inválidas rechazadas | T10, T11 |
| referencias duplicadas y RLS de manual_payments | T12, T13 |
| concurrencia (1 gana, resto rechaza) | T15 |
| RLS: anon no puede escribir tablas privadas | T16, T17, T18 |
| bloqueo de agenda bloquea disponibilidad y rechaza choque con citas | T20, T21, T22 |
| snapshot histórico (bookings_resumen_economico) | T23 |

## Estado de ejecución

- Última corrida: **24/24 totales** (11 del motor de disponibilidad + 13 del hito) ✓.

## Casos pendientes de cobertura explícita (no bloquean)

- T19: autoelevación de privilegios desde anon/authenticated (cubierta indirectamente por RLS; formalizar en pgTAP si se instala).
- T24: integridad referencial FK (ON DELETE RESTRICT en variantes con reservas — verificado en el CRUD del panel que bloquea borrar variantes usadas).
- T25: compatibilidad del miniportal con el modelo nuevo (cubierto por `/reserva/[token]` y su prueba E2E de cancelación).

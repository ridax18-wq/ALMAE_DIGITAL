# Plan de pruebas — ALMAE DIGITAL 1.0

> Objetivo: pruebas automatizadas de los casos críticos + verificación manual documentada. No se afirma cobertura de algo no ejecutado.

## 1. Niveles

| Nivel | Herramienta | Alcance |
|---|---|---|
| Unitario (lógica pura) | Vitest | Motor de disponibilidad, mapeo de estados, tokens, formateo PEN/es-PE, validadores Zod |
| Integración (BD) | Vitest + Supabase local (CLI) | RPC transaccional, EXCLUDE, triggers de eventos, RLS (anon vs admin), idempotencia de webhooks |
| E2E | Playwright | Flujos completos contra build de preview |

## 2. Unitarios (motor de disponibilidad)

1. Slots base según `business_hours` por día de semana en hora Lima.
2. Excepciones: feriado completo, bloqueo parcial, rango de fechas.
3. Descanso (break) dentro del horario → no genera slot cruzado.
4. Duración + prep buffer + gap entre citas.
5. Citas existentes y holds vigentes ocupan slots.
6. Antelación mínima y horizonte máximo de agenda.
7. Zona horaria: cruce de medianoche UTC vs Lima (p. ej. cita 23:30 Lima).
8. Caso borde: slot que termina exactamente cuando inicia otro (gap 0 vs >0).

## 3. Integración (BD / reservas)

1. **Concurrencia:** N solicitudes simultáneas para el mismo slot → exactamente 1 gana, el resto recibe error de disponibilidad; sin superposición final (verificado con `SELECT` de rangos).
2. Hold → expira (avance del reloj/forzado) → EXPIRED → slot disponible nuevamente.
3. Reprogramación: misma fila migrada; evento registrado; antiguo slot liberado; sin duplicados.
4. Estados: transición inválida rechazada por constraint de pares válidos.
5. Webhook duplicado: segundo evento con mismo id externo → no crea pago ni evento adicional.
6. Pago tardío tras expiración → `RECONCILIATION` y NO auto-confirmación.
7. RLS: `anon` no puede SELECT/INSERT en `patients`, `bookings`, `payments`, `audit_logs`; sí puede leer `services` activos y disponibilidad.
8. Trigger `updated_at` y eventos de estado automáticos.

## 4. E2E (Playwright, contra preview con pagos mock)

| # | Escenario |
|---|---|
| E1 | Visitante: home → servicios → detalle → "Agendar" |
| E2 | Reserva completa feliz: seleccionar servicio/fecha/hora → datos → mock pago OK → pantalla confirmada → enlace token funciona |
| E3 | Pago fallido → estado no confirmado → slot liberado tras expiración |
| E4 | Hold expirado antes de pagar → mensaje claro, sin doble cobro |
| E5 | Reprogramación desde token → nueva hora, sin duplicidad |
| E6 | Cancelación desde token según política |
| E7 | Admin: login → agenda → bloquear horario → disponibilidad pública refleja bloqueo |
| E8 | Admin: cambiar estado a COMPLETED/NO_SHOW con auditoría |
| E9 | Accesibilidad: navegación por teclado en el flujo de reserva (chequeo básico) |
| E10 | Móvil 375 px: flujo E2 completo en viewport móvil |

## 5. Verificación manual documentada (por fase)

- Contraste y tipografía en dispositivo real.
- Compartir enlace en WhatsApp (vista previa OG).
- Prueba de pagos sandbox (FASE 5) con tarjetas de prueba del proveedor.
- Despliegue de ensayo con dominio propio (FASE 7).

## 6. Comandos

```bash
npm test                # Vitest unit + integración (local)
npm run test:watch
npm run test:e2e        # Playwright (requiere build/preview)
npm run lint && npm run typecheck && npm run build
```

## 7. Criterio de "hecho" para cada fase

- Validaciones del nivel correspondiente **ejecutadas** y en verde.
- Resultados registrados en `docs/progress.md` con fecha y alcance.
- Cualquier prueba pendiente queda declarada como tal, nunca como aprobada.

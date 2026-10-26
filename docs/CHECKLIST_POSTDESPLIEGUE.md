# Checklist de pruebas post-despliegue — ALMAE DIGITAL

> Ejecutar **en producción** inmediatamente después de publicar. Marcar cada punto. Cualquier FAIL → seguir `docs/BACKUP_RESTORE_ALMAE.md` §5 (rollback).

## Acceso y seguridad

- [ ] `https://<dominio>` responde con HTTPS válido (sin avisos del navegador)
- [ ] `admin@almae.demo` **NO** puede iniciar sesión (prueba real en el navegador)
- [ ] Login del propietario real funciona y `admin_profiles` muestra solo esa cuenta
- [ ] Recuperación de contraseña llega por SMTP (correo del propietario)
- [ ] Páginas `/admin/*` sin sesión redirigen a `/admin/login`
- [ ] `node scripts/verificar-sin-demo.mjs` con `NEXT_PUBLIC_ENV=production` → PASS
- [ ] `node scripts/verificar-rls.mjs` → PASS (anon solo lee servicios/variantes)
- [ ] Ninguna página pública expone `SUPABASE_SERVICE_ROLE_KEY` (ver `view-source`)

## Motor de reservas

- [ ] Wizard completo: servicio → horario → datos → HELD visible en la agenda
- [ ] Contador del cupo muestra **15 minutos**
- [ ] Ocupar un horario lo bloquea para una segunda reserva (exclusión de BD)
- [ ] Cron: crear HELD y confirmar en logs de Vercel que `/api/cron/expire-holds` corre cada minuto con 200
- [ ] HELD vencido pasa a `EXPIRED` y el cupo se libera
- [ ] Reprogramar y cancelar desde la agenda funcionan con motivo y auditoría

## Contenido y configuración

- [ ] Home, servicios, contacto y aviso de privacidad cargan con textos oficiales
- [ ] Datos oficiales cargados: teléfono, dirección (sin "provisional"), horarios, precios
- [ ] Imágenes del sitio en HTTPS (bucket `almae-media`), sin placeholders de personal
- [ ] Banner de datos de demostración **ausente**
- [ ] Banner de entorno **ausente** (build de producción)

## Operación

- [ ] Vercel Logs: sin errores (500) durante 24 h
- [ ] Cron visible en Vercel con última ejecución exitosa
- [ ] Respaldo: `pg_dump` post-despliegue completado y almacenado
- [ ] Respaldo: `node scripts/backup-storage.mjs` completado
- [ ] Alertas de uso / spend cap activos en Supabase y Vercel
- [ ] Pagos: `PAYMENTS_PROVIDER=mock` y sin checkout visible en el sitio

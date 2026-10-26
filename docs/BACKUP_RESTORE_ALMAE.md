# Backup y restauración — ALMAE DIGITAL

> Preparado en el Hito 4.3. Procedimientos para **Supabase Cloud**. Ejecutar los respaldos **siempre antes** de migraciones y con autorización del propietario. Ninguna operación se ejecuta de forma remota desde este hito.

## 1. Respaldo de base de datos (PostgreSQL)

```bash
# pg_dump completo (formato custom, comprimido)
pg_dump "$SUPABASE_DB_URL" -Fc -f "backups/almae_$(date +%F_%H%M).dump"

# Solo datos (útil para diagnóstico)
pg_dump "$SUPABASE_DB_URL" --data-only > "backups/almae_datos_$(date +%F).sql"
```

- Ejecutar **antes** de aplicar migraciones 0001–0024 (pre-migración) y como respaldo semanal programado.
- Guardar el `.dump` fuera de Supabase (disco propio / almacenamiento cifrado). Supabase Pro conserva PITR 7 días; el dump propio es adicional.

## 2. Restauración de base de datos

```bash
# Restaurar un dump completo (BD vacía nueva o recuperación)
pg_restore --clean --if-exists -d "$SUPABASE_DB_URL" backups/almae_YYYY-mm-dd_hhmm.dump
```

- En un desastre total: crear proyecto nuevo → aplicar el dump → verificar RLS con `scripts/verificar-rls.mjs`.
- Nunca restaurar sobre una BD con reservas reales sin confirmación del propietario (puede sobrescribir citas).

## 3. Respaldo separado de Supabase Storage

El respaldo de PostgreSQL **NO incluye** archivos del bucket. Ejecutar aparte:

```bash
SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup-storage.mjs
```

- Descarga todos los objetos de todos los buckets a `backups/storage/<fecha>/` (solo lectura, no borra ni modifica).
- Restauración: re-subir con `supabase storage` API o `rsync` hacia el bucket equivalente conservando rutas.
- Verificar periodicamente que las imágenes del sitio se sirven en HTTPS y con URLs públicas correctas.

## 4. Orden seguro de respaldo en cada despliegue

1. `pg_dump` (BD completa).
2. `node scripts/backup-storage.mjs` (bucket).
3. Aplicar migraciones / cambios.
4. Validar: `scripts/verificar-rls.mjs` + `scripts/verificar-sin-demo.mjs`.
5. Si algo falla → **rollback** (§5).

## 5. Estrategia de rollback

No existen migraciones "down"; el rollback se basa en el dump:

| Situación | Acción |
|---|---|
| Migración fallida a medias | Restaurar el `pg_dump` pre-migración y corregir el SQL |
| Bug en el código desplegado | `vercel rollback` (redeploy a la versión anterior) |
| Datos incorrectos post-carga | Restaurar desde dump reciente o corregir con scripts versionados |
| Incidente mayor | Proyecto nuevo → dump + `scripts/backup-storage.mjs` → DNS |

Mantener siempre un dump por despliegue hasta confirmar estabilidad (24–48 h).

# Checklist de cierre — Hito 3.2-B6 (CMS ALMAE DIGITAL)

Lista de verificación del cierre del CMS. Marcar cada punto solo tras verificación real.

## Funcionalidad del CMS

- [x] Contenidos: editar textos por bloque con borrador y publicación (`/admin/contenidos`).
- [x] Borradores invisibles para anónimos (RLS + prueba e2e).
- [x] Publicar refleja el cambio en la página pública sin rebuild (prueba e2e).
- [x] Multimedia: subir imágenes con texto alternativo, borrado controlado (`/admin/multimedia`).
- [x] Servicios: imagen principal desde Multimedia, modo de catálogo, reordenación (`/admin/servicios`).
- [x] Promociones: crear, publicar, pausar, eliminar; vigencia en America/Lima (`/admin/promociones`, página `/promociones`).
- [x] Testimonios: publicación exige consentimiento expreso (`/admin/testimonios`).
- [x] Ubicación y contacto publicables con borrador → publicar (`/admin/ubicacion`, `/admin/contacto`).
- [x] Horarios: texto visible `hours_note` con borrador → publicar (`/admin/horarios`).
- [x] Historial de versiones y restauración que crea una revisión nueva sin borrar el historial (`/admin/revisiones`).
- [x] Banner de entorno de prueba visible solo en desarrollo local; nunca en producción (prueba e2e).

## Seguridad

- [x] RLS activada en todas las tablas; el anon solo ve servicios activos, promociones vigentes publicadas, testimonios publicados y contenido publicado.
- [x] `content_revisions` solo accesible para administradores (política `revisiones_admin`); el anon ve 0 filas (prueba unitaria).
- [x] El propietario y los administradores están protegidos por roles; acciones sensibles registradas en auditoría (`audit_logs`).
- [x] Restaurar versión exige sesión de administrador, casilla de confirmación (cliente y servidor) y genera auditoría.
- [x] Sin secretos en el código; claves solo en `.env` local y server-side.

## Integridad funcional

- [x] Motor de reservas intacto: reserva de 15 minutos (HELD), sin cambios en el módulo (prueba e2e de reservas).
- [x] Adelantos y confirmaciones sin cambios (flujo manual del administrador no modificado).
- [x] Precios históricos conservados (sin cambios en catálogo/precios desde el hito de catálogo).
- [x] Imágenes y enlaces públicos funcionales (pruebas de multimedia y smoke de home).
- [x] Pagos web: no habilitados (regla intacta).

## Validaciones de cierre

- [x] `npm run lint` — sin errores.
- [x] `npm run typecheck` — sin errores.
- [x] `npm test` — 84/84.
- [x] `npx playwright test` — 36/36.
- [x] `npm run build` — correcto.

## Cierre autorizado

- [x] Commit del Hito 3.2-B6 creado localmente (sin push, sin deploy).
- [x] Aprobación del propietario para cerrar el CMS.

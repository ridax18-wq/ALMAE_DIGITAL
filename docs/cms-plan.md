# CMS privado — diagnóstico y plan (propuesta para autorización)

> Requerimiento del propietario: CMS privado y fácil de usar para administrar multimedia, banners, testimonios, promociones, servicios, precios y horarios; con vista previa, roles y RLS; cambios reflejados en el sitio público **sin reconstruir la aplicación**. Nada destructivo sin autorización.

## 0. B1 — Estructura aprobada (Hito 3.2-B1)

Auditoría realizada sobre el stack local: no existían tablas de contenido (solo `promotions`, con `active` y sin imagen/publicado/orden); sin bucket de Storage; catálogo público ya lee BD desde el hito 3.1 (`catalogo-publico.ts`, `catalog.ts` retirado); textos de home/nosotros/contacto hardcodeados en componentes.

Migración **0016_cms_contenidos.sql** (aplicada localmente; aditiva):

- `media_assets` — metadata de imágenes (bucket `almae-media` se crea en B3): `storage_path` único, dimensiones, `bytes ≤ 2 MB`, `alt_text`, `created_by`.
- `content_blocks` — textos/banners por `block_key` único (`hero_home`, `intro_nosotros`, `cta_contacto`, `faq_section`): título, subtítulo, `body` jsonb, imagen asociada y **estado `draft`/`published`** (enum `cms_status`).
- `content_revisions` — historial genérico de versiones (`entity_type` + `snapshot` jsonb) para restaurar en B6.
- `testimonials` — con `patient_consent` + `consent_at`; restricción CHECK impide publicar sin consentimiento.
- `promotions` — columnas nuevas: `image_media_id`, `published` (default true), `sort_order`.
- RLS: anon/autenticado solo SELECT de filas **published** (testimonios además exigen consentimiento); escritura solo con `es_administrador()`; revisiones solo panel.
- RPC `publicar_contenido`: guarda revisión y devuelve el `path` a revalidar (`revalidatePath`) — publicación sin rebuild.

Decisiones B1:
- Reutilizar tablas existentes (servicios, horarios, promociones, configuración); sin duplicados.
- Borrador/publicado por fila + revisiones auditables; nada se publica por defecto salvo promociones (`published` default true para no romper la página existente).
- Subida de binarios solo server-side (B3); anon lee metadata de medios (sin secretos).

Subetapas siguientes: B2 textos/secciones desde `content_blocks`; B3 Storage + galería `/admin/multimedia`; B4 fotos de servicios y promociones; B5 ubicación/Mapa/contacto como bloques; B6 vista previa, publicación y restauración de revisiones.

---

## 1. Diagnóstico de la aplicación (estado actual)

| Módulo | Panel (BD) | Sitio público | Diagnóstico |
|---|---|---|---|
| Servicios + precios | ✓ CRUD completo (`services`, `service_variants`) | ✗ renderiza desde `src/lib/catalog.ts` estático | **Inconsistencia principal**: lo que el admin edita no se publica; el catálogo público es una copia congelada en el build |
| Promociones | Tabla `promotions` existe | Página `/promociones` pendiente | Falta pantalla admin + página desde BD |
| Horarios + excepciones | ✓ (ISO 1–7, excepciones, bloqueos) | Nota provisional en pie | Reutilizar; publicar el horario real en el sitio |
| Testimonios | — | Sección deshabilitada (correcto) | Crear con **consentimiento explícito** antes de publicar |
| Banners/textos (home, nosotros, contacto) | — | Hardcodeados en componentes | Sin forma de editar sin tocar código |
| Multimedia | — | Archivos en `public/` (solo en build) | Sin Storage, sin galería, sin alt-text |
| Roles | Solo `owner` en uso | — | Enum ya trae admin/professional/receptionist (0008); falta UI de roles |
| Storage | — | — | Bucket no configurado |

## 2. Modelo de datos propuesto (aditivo, no destructivo)

Nuevas tablas (migración nueva `0014_cms.sql`):

- **`media_assets`** — biblioteca: `id`, `storage_path`, `mime_type`, `width`, `height`, `bytes`, `alt_text`, `created_by`, `created_at`. Bucket de Storage `almae-media` (lectura pública, escritura solo owner activo vía RLS de `storage.objects`).
- **`content_blocks`** — textos/banners por clave (`hero_home`, `intro_nosotros`, `cta_contacto`, …): `block_key` (único), `title`, `subtitle`, `body` (jsonb), `image_media_id → media_assets`, `published`, `updated_at`.
- **`testimonials`** — `patient_name`, `quote`, `rating`, `media_id`, `published`, `patient_consent` + `consent_at` (solo se puede publicar con consentimiento marcado).
- `promotions`: se reutiliza; solo se agregan columnas `image_media_id`, `published`, `sort_order` (nullable, con default — sin tocar datos).
- Los servicios/horarios/configuración **ya están en BD** — el CMS solo edita, no duplica.

RLS: `anon` solo SELECT de filas publicadas/activas; escritura solo vía panel (service client + RPCs con `es_owner_activo()`).

## 3. Pantallas administrativas

- `/admin/multimedia` — galería: subir, reemplazar, alt-text, ver uso (qué bloque/servicio la usa), eliminar no usadas.
- `/admin/contenidos` — lista de `content_blocks` con edición y **vista previa** (render previo al publicar).
- `/admin/testimonios` — alta con consentimiento (checkbox obligatorio + fecha) y publicar/despublicar.
- `/admin/promociones` — CRUD + publicado/orden.
- Reutilizar: Servicios (CRUD existente), Horarios, Configuración.

## 4. Sitio público (sin rebuild)

- Páginas `/servicios`, `/servicios/[slug]`, `/` y `/promociones` pasan a leer la BD (componentes servidor dinámicos con revalidación por path al guardar en el panel) — el cambio se publica al instante, sin reconstruir.
- `catalog.ts` se elimina cuando ya nadie lo usa.

## 5. Plan de implementación por módulos (una fase por intervención)

| Módulo | Alcance | Validación |
|---|---|---|
| **M1 — Catálogo desde BD** | `/servicios`, `/servicios/[slug]`, home destacados y nota de horario leen BD; se retira `catalog.ts` | E2E: editar servicio en panel ⇒ visible en sitio |
| **M2 — Storage y multimedia** | Bucket `almae-media` + políticas; galería admin; límites: jpg/png/webp ≤ 2 MB; subida solo server-side | Subida/eliminación con owner; anon solo lectura |
| **M3 — Contenidos y banners** | `content_blocks` + pantallas + hero home/textos desde BD con vista previa | E2E: editar hero ⇒ visible |
| **M4 — Promociones** | Pantalla CRUD + página pública desde BD | E2E: crear promo ⇒ visible |
| **M5 — Testimonios** | Alta con consentimiento; publicación condicionada | Anon no ve no consentidas |
| **M6 — Roles** | UI para gestionar admin_profiles (owner) | RLS: receptionist no ve configuración |

## 6. Nota de portabilidad (GitHub Pages)

GitHub Pages solo sirve **sitios estáticos**: no puede ejecutar el CMS, las RPCs ni las APIs de reserva. La portabilidad real del proyecto es vía **Cloudflare Workers (OpenNext)** — el stack ya configurado. Para un destino GitHub Pages habría que congelar el sitio como estático puro (sin CMS ni reservas). Decisión del propietario; documentada en `docs/deployment.md`.

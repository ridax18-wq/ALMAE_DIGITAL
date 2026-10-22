-- ALMAE DIGITAL — 0016: modelo de contenido del CMS (Hito 3.2-B1).
-- Aditivo: no toca datos existentes. Textos/banners por clave, biblioteca de
-- imágenes, testimonios con consentimiento, borrador/publicado y revisiones.

-- =====================================================================
-- ENUM de estado de contenido (borrador / publicado)
-- =====================================================================
do $$ begin
  create type cms_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- BIBLIOTECA DE IMÁGENES (Metadata de Storage; los binarios van al bucket)
-- =====================================================================
create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  mime_type text not null,
  width int check (width > 0),
  height int check (height > 0),
  bytes int not null check (bytes > 0 and bytes <= 2 * 1024 * 1024),
  alt_text text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column media_assets.alt_text is
  'Descripción accesible obligatoria antes de publicar el medio en el sitio.';

-- =====================================================================
-- BLOQUES DE CONTENIDO (textos y banners por clave)
-- =====================================================================
create table if not exists content_blocks (
  id uuid primary key default gen_random_uuid(),
  block_key text not null unique,
  title text not null default '',
  subtitle text not null default '',
  body jsonb not null default '{}'::jsonb,
  image_media_id uuid references media_assets(id) on delete set null,
  status cms_status not null default 'draft',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table content_blocks is
  'Claves conocidas: hero_home, intro_nosotros, cta_contacto, faq_section.';

-- =====================================================================
-- REVISIONES (historial de versiones para restaurar; genérico por entidad)
-- =====================================================================
create table if not exists content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('content_block', 'promotion', 'testimonial', 'media_asset')),
  entity_id uuid not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_revisions_entity
  on content_revisions (entity_type, entity_id, created_at desc);

-- =====================================================================
-- TESTIMONIOS (solo publicables con consentimiento explícito)
-- =====================================================================
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  quote text not null,
  rating smallint check (rating between 1 and 5),
  media_id uuid references media_assets(id) on delete set null,
  patient_consent boolean not null default false,
  consent_at timestamptz,
  status cms_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonio_consentimiento_fecha
    check (not patient_consent or consent_at is not null),
  constraint testimonio_publicado_consentido
    check (status <> 'published' or patient_consent)
);

-- =====================================================================
-- PROMOCIONES: columnas nuevas aditivas (imagen, publicado, orden)
-- =====================================================================
alter table promotions add column if not exists image_media_id uuid references media_assets(id) on delete set null;
alter table promotions add column if not exists published boolean not null default true;
alter table promotions add column if not exists sort_order int;

-- =====================================================================
-- TRIGGERS DE updated_at (mismo patrón que el resto del esquema)
-- =====================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_media_assets_updated_at on media_assets;
create trigger trg_media_assets_updated_at
  before update on media_assets
  for each row execute function set_updated_at();

drop trigger if exists trg_content_blocks_updated_at on content_blocks;
create trigger trg_content_blocks_updated_at
  before update on content_blocks
  for each row execute function set_updated_at();

drop trigger if exists trg_testimonials_updated_at on testimonials;
create trigger trg_testimonials_updated_at
  before update on testimonials
  for each row execute function set_updated_at();

-- =====================================================================
-- RLS: anon solo lectura de contenido publicado; escritura del panel
-- =====================================================================
alter table media_assets enable row level security;
alter table content_blocks enable row level security;
alter table content_revisions enable row level security;
alter table testimonials enable row level security;

drop policy if exists media_lectura_publica on media_assets;
create policy media_lectura_publica on media_assets
  for select to anon, authenticated using (true);

drop policy if exists media_admin on media_assets;
create policy media_admin on media_assets
  for all to authenticated using (es_administrador()) with check (es_administrador());

drop policy if exists contenidos_publicos on content_blocks;
create policy contenidos_publicos on content_blocks
  for select to anon, authenticated using (status = 'published');

drop policy if exists contenidos_admin on content_blocks;
create policy contenidos_admin on content_blocks
  for all to authenticated using (es_administrador()) with check (es_administrador());

drop policy if exists testimonios_publicos on testimonials;
create policy testimonios_publicos on testimonials
  for select to anon, authenticated
  using (status = 'published' and patient_consent);

drop policy if exists testimonios_admin on testimonials;
create policy testimonios_admin on testimonials
  for all to authenticated using (es_administrador()) with check (es_administrador());

drop policy if exists revisiones_admin on content_revisions;
create policy revisiones_admin on content_revisions
  for all to authenticated using (es_administrador()) with check (es_administrador());

drop policy if exists promociones_publicadas on promotions;
create policy promociones_publicadas on promotions
  for select to anon, authenticated using (active and published);

-- =====================================================================
-- PUBLICACIÓN SIN REBUILD: RPC que guarda y revalide el path del sitio
-- =====================================================================
create or replace function publicar_contenido(
  p_entity_type text,
  p_entity_id uuid,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
begin
  if not es_owner_activo() and not es_administrador() then
    return jsonb_build_object('ok', false, 'error', 'no_autorizado');
  end if;

  insert into content_revisions (entity_type, entity_id, snapshot, created_by)
  values (p_entity_type, p_entity_id, p_snapshot, auth.uid());

  v_path := case p_entity_type
    when 'content_block' then '/'
    when 'promotion' then '/promociones'
    else null
  end;

  return jsonb_build_object('ok', true, 'revalidate_path', v_path);
end;
$$;

revoke all on function publicar_contenido(text, uuid, jsonb) from public, anon;
grant execute on function publicar_contenido(text, uuid, jsonb) to authenticated;

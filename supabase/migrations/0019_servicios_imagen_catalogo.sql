-- ALMAE DIGITAL — 0019: imagenes y modo de catalogo en servicios; indice promociones (Hito 3.2-B4).
-- Servicios con imagen principal desde media_assets; modo visible/reservable/consulta.
-- Promociones: indice para listado publico.

alter table public.services
  add column if not exists image_media_id uuid references public.media_assets(id) on delete set null;

alter table public.services
  add column if not exists catalog_mode text not null default 'reservable';

alter table public.services drop constraint if exists services_catalog_mode_check;
alter table public.services
  add constraint services_catalog_mode_check
  check (catalog_mode in ('reservable', 'visible', 'consulta'));

create index if not exists promotions_publicas_idx
  on public.promotions (active, published, valid_from, valid_to);

alter table public.media_assets
  add column if not exists content_hash text;

create index if not exists media_assets_hash_idx
  on public.media_assets (content_hash)
  where content_hash is not null;

alter table public.promotions drop constraint if exists promotions_value_check;
alter table public.promotions
  add constraint promotions_value_check
  check (
    value > 0
    and (kind = 'fixed' or (kind = 'percent' and value <= 100))
  );

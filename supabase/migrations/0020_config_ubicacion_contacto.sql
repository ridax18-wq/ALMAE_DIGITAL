-- ALMAE DIGITAL — 0020: configuración pública de ubicación, contacto y horarios (Hito 3.2-B5.1).
-- business_settings ampliadas; borradores de configuración se guardan en content_revisions
-- (RLS solo admin) para que el anon nunca vea borradores.

alter table public.business_settings
  add column if not exists address_street text not null default '',
  add column if not exists address_district text not null default '',
  add column if not exists address_province text not null default '',
  add column if not exists address_department text not null default '',
  add column if not exists address_reference text not null default '',
  add column if not exists maps_url text not null default '',
  add column if not exists local_intro text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists email text not null default '',
  add column if not exists instagram_url text not null default '',
  add column if not exists facebook_url text not null default '',
  add column if not exists whatsapp_message text not null default '',
  add column if not exists hours_note text not null default '';

-- Dirección inicial confirmada por el propietario (sin coordenadas inventadas).
update public.business_settings
set address_street = 'Altos del Rímac 250',
    address_district = 'Rímac',
    address_province = 'Lima',
    address_department = 'Lima',
    address_public = 'Altos del Rímac 250, Rímac, Lima, Perú'
where address_street = '';

-- content_revisions acepta revisiones de configuración (borradores y publicaciones).
alter table public.content_revisions drop constraint if exists content_revisions_entity_type_check;
alter table public.content_revisions
  add constraint content_revisions_entity_type_check
  check (entity_type in ('content_block', 'promotion', 'testimonial', 'media_asset', 'business_settings'));

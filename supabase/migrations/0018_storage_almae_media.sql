-- ALMAE DIGITAL — 0018: bucket almae-media (Hito 3.2-B3).
-- Imagenes comerciales del CMS: JPG/PNG/WebP, maximo 5 MB.
-- Lectura publica del bucket; escritura/borrado solo panel autenticado.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'almae-media',
  'almae-media',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists media_objects_lectura on storage.objects;
create policy media_objects_lectura on storage.objects
  for select to public
  using (bucket_id = 'almae-media');

drop policy if exists media_objects_escritura on storage.objects;
create policy media_objects_escritura on storage.objects
  for insert to authenticated
  with check (bucket_id = 'almae-media' and es_administrador());

drop policy if exists media_objects_actualizacion on storage.objects;
create policy media_objects_actualizacion on storage.objects
  for update to authenticated
  using (bucket_id = 'almae-media' and es_administrador())
  with check (bucket_id = 'almae-media' and es_administrador());

drop policy if exists media_objects_borrado on storage.objects;
create policy media_objects_borrado on storage.objects
  for delete to authenticated
  using (bucket_id = 'almae-media' and es_administrador());

-- Apply in the intended Supabase project, after enabling anonymous sign-ins.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booth-photos','booth-photos',false,10485760,array['image/png'])
on conflict (id) do nothing;

do $$
begin
  if exists (select 1 from storage.buckets where id='booth-photos' and public) then
    raise exception 'booth-photos must be a private bucket';
  end if;
end $$;

drop policy if exists booth_photos_insert_own on storage.objects;
create policy booth_photos_insert_own on storage.objects for insert to authenticated
with check (
  bucket_id='booth-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
  and storage.extension(name)='png'
);

drop policy if exists booth_photos_select_own on storage.objects;
create policy booth_photos_select_own on storage.objects for select to authenticated
using (bucket_id='booth-photos' and owner_id=(select auth.uid())::text);
commit;

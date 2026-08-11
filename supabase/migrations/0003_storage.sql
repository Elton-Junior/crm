-- ============================================================
-- 0003_storage.sql
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts', 'contracts', false, 26214400,  -- 25 MB
  array['application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png','image/jpeg']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Convenção de caminho: contracts/{org_id}/{contract_id}/{filename}
create policy "contracts read by org member" on storage.objects
  for select using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy "contracts write by org member" on storage.objects
  for insert with check (
    bucket_id = 'contracts'
    and public.can_write((storage.foldername(name))[1]::uuid)
  );

create policy "contracts delete by org admin" on storage.objects
  for delete using (
    bucket_id = 'contracts'
    and public.user_role_in((storage.foldername(name))[1]::uuid) in ('owner','admin')
  );

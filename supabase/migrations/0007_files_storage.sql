-- ============================================================
-- 0007_files_storage.sql
-- Bucket único "files" para o primitivo compartilhado (ARQUITETURA-
-- EXPANSAO.md §3.1), substituindo o bucket "contracts" — não há
-- nenhum arquivo real nele ainda, então a troca é segura.
-- Convenção de caminho: files/{org_id}/{yyyy}/{mm}/{file_id}-{slug}.ext
-- ============================================================

-- Supabase bloqueia DELETE direto em storage.buckets via SQL ("Direct
-- deletion from storage tables is not allowed. Use the Storage API
-- instead."). O bucket "contracts" fica órfão (sem policies, sem uso) —
-- removê-lo de fato exigiria a Storage API/dashboard, não uma migration.
drop policy if exists "contracts read by org member" on storage.objects;
drop policy if exists "contracts write by org member" on storage.objects;
drop policy if exists "contracts delete by org admin" on storage.objects;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'files', 'files', false, 26214400,  -- 25 MB
  array['application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png','image/jpeg']
)
on conflict (id) do nothing;

create policy "files read by org member" on storage.objects
  for select using (
    bucket_id = 'files'
    and (storage.foldername(name))[1]::uuid in (select public.user_org_ids())
  );

create policy "files write by org member" on storage.objects
  for insert with check (
    bucket_id = 'files'
    and public.can_write((storage.foldername(name))[1]::uuid)
  );

create policy "files delete by org admin" on storage.objects
  for delete using (
    bucket_id = 'files'
    and public.user_role_in((storage.foldername(name))[1]::uuid) in ('owner','admin')
  );

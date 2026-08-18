-- ============================================================
-- 0005_avatars_storage.sql — policies do bucket "avatars" (§7.9)
-- ============================================================
-- O bucket "avatars" já existe desde a 0003_storage.sql (público, 2MB,
-- png/jpeg/webp) mas nunca ganhou policies de escrita — só "contracts"
-- tinha. Leitura funciona via URL pública (bucket público), mas upload
-- exige uma policy de INSERT/UPDATE/DELETE explícita mesmo assim.
--
-- Convenção de caminho: avatars/{user_id}/{filename}

create policy "avatars insert by owner" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars update by owner" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars delete by owner" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export const BUCKET = "files";

export type FileMeta = {
  id: string;
  name: string;
  size: number;
  mime: string;
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/**
 * Gera o caminho de Storage a partir de um id decidido agora (não pelo
 * default da coluna) — o mesmo id é reaproveitado em confirmUpload() para
 * que o registro em `files` bata com o objeto já enviado.
 * Convenção: files/{org_id}/{yyyy}/{mm}/{file_id}-{slug} (§3.1).
 */
function buildPath(orgId: string, fileName: string): { id: string; path: string } {
  const id = randomUUID();
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return { id, path: `${orgId}/${yyyy}/${mm}/${id}-${slugify(fileName)}` };
}

export async function createUploadUrl(
  supabase: Supabase,
  params: { orgId: string; fileName: string },
) {
  const { id, path } = buildPath(params.orgId, params.fileName);

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const, data: { fileId: id, path, token: data.token } };
}

/** Cria o registro em `files` — chamado depois que o objeto já subiu ao Storage. */
export async function confirmUpload(
  supabase: Supabase,
  params: {
    id: string;
    orgId: string;
    actorId: string;
    folderId?: string | null;
    path: string;
    name: string;
    size: number;
    mime: string;
  },
): Promise<{ ok: true; data: FileMeta } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("files")
    .insert({
      id: params.id,
      org_id: params.orgId,
      folder_id: params.folderId ?? null,
      name: params.name,
      storage_path: params.path,
      size: params.size,
      mime: params.mime,
      created_by: params.actorId,
    })
    .select("id, name, size, mime")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function getSignedUrl(
  supabase: Supabase,
  params: { orgId: string; fileId: string },
): Promise<{ url: string; mime: string; name: string } | null> {
  const { data: file, error } = await supabase
    .from("files")
    .select("storage_path, mime, name")
    .eq("id", params.fileId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!file) return null;

  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, 60);
  if (signErr) throw signErr;

  return { url: data.signedUrl, mime: file.mime, name: file.name };
}

/** Vincula um arquivo a uma entidade via `file_links` — anexos polimórficos
 * (tarefa, mensagem, etc.). Contratos usam `contracts.file_id` direto (1:1),
 * não este vínculo. */
export async function linkToEntity(
  supabase: Supabase,
  params: { fileId: string; entityType: string; entityId: string },
) {
  const { error } = await supabase
    .from("file_links")
    .insert({ file_id: params.fileId, entity_type: params.entityType, entity_id: params.entityId });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

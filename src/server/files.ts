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

/** Anexos de uma entidade via `file_links` (ex.: tarefa, item 28). */
export async function listByEntity(
  supabase: Supabase,
  params: { entityType: string; entityId: string },
): Promise<FileMeta[]> {
  const { data, error } = await supabase
    .from("file_links")
    .select("file:files!inner(id, name, size, mime)")
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .is("files.deleted_at", null);

  if (error) throw error;
  return (data ?? []).map((row) => row.file as unknown as FileMeta);
}

export type DriveFile = {
  id: string;
  name: string;
  size: number;
  mime: string;
  version: number;
  created_at: string;
};

/** Arquivos direto numa pasta (§5.4) — só a versão atual de cada um (as antigas ficam com deleted_at, ver createVersion). */
export async function listInFolder(
  supabase: Supabase,
  orgId: string,
  folderId: string | null,
): Promise<DriveFile[]> {
  let query = supabase
    .from("files")
    .select("id, name, size, mime, version, created_at")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  query = folderId ? query.eq("folder_id", folderId) : query.is("folder_id", null);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Busca por nome (§5.1) — global, não escopada a uma pasta. */
export async function search(supabase: Supabase, orgId: string, term: string): Promise<DriveFile[]> {
  const sanitized = term.replace(/[%_]/g, " ").trim();
  if (!sanitized) return [];

  const { data, error } = await supabase
    .from("files")
    .select("id, name, size, mime, version, created_at")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .ilike("name", `%${sanitized}%`)
    .order("name", { ascending: true })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function rename(
  supabase: Supabase,
  params: { orgId: string; fileId: string; name: string },
) {
  const { error } = await supabase
    .from("files")
    .update({ name: params.name })
    .eq("id", params.fileId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function move(
  supabase: Supabase,
  params: { orgId: string; fileId: string; folderId: string | null },
) {
  const { error } = await supabase
    .from("files")
    .update({ folder_id: params.folderId })
    .eq("id", params.fileId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function softDelete(supabase: Supabase, params: { orgId: string; fileId: string }) {
  const { error } = await supabase
    .from("files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.fileId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function restore(supabase: Supabase, params: { orgId: string; fileId: string }) {
  const { error } = await supabase
    .from("files")
    .update({ deleted_at: null })
    .eq("id", params.fileId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export type TrashedFile = { id: string; name: string; deleted_at: string };

export async function listTrash(supabase: Supabase, orgId: string): Promise<TrashedFile[]> {
  const { data, error } = await supabase
    .from("files")
    .select("id, name, deleted_at")
    .eq("org_id", orgId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TrashedFile[];
}

/**
 * Nova versão de um arquivo existente (§5.1 "versionamento simples") —
 * insere uma linha nova ligada por `replaces_id` e esconde a anterior
 * (deleted_at) da listagem normal, mas sem apagar do Storage: dá pra ver
 * o histórico com listVersions() e restaurar uma versão antiga se precisar.
 */
export async function createVersion(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    previousFileId: string;
    id: string;
    path: string;
    name: string;
    size: number;
    mime: string;
  },
): Promise<{ ok: true; data: FileMeta } | { ok: false; error: string }> {
  const { data: previous, error: prevErr } = await supabase
    .from("files")
    .select("folder_id, version")
    .eq("id", params.previousFileId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (prevErr) return { ok: false as const, error: prevErr.message };
  if (!previous) return { ok: false as const, error: "Arquivo original não encontrado." };

  const { data, error } = await supabase
    .from("files")
    .insert({
      id: params.id,
      org_id: params.orgId,
      folder_id: previous.folder_id,
      name: params.name,
      storage_path: params.path,
      size: params.size,
      mime: params.mime,
      created_by: params.actorId,
      replaces_id: params.previousFileId,
      version: previous.version + 1,
    })
    .select("id, name, size, mime")
    .single();

  if (error) return { ok: false as const, error: error.message };

  const { error: hideErr } = await supabase
    .from("files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.previousFileId)
    .eq("org_id", params.orgId);

  if (hideErr) return { ok: false as const, error: hideErr.message };

  return { ok: true as const, data };
}

export type FileVersion = {
  id: string;
  name: string;
  size: number;
  mime: string;
  version: number;
  created_at: string;
  deleted_at: string | null;
};

type VersionRow = FileVersion & { replaces_id: string | null };

async function getVersionRow(
  supabase: Supabase,
  orgId: string,
  fileId: string,
): Promise<VersionRow | null> {
  const { data, error } = await supabase
    .from("files")
    .select("id, name, size, mime, version, created_at, deleted_at, replaces_id")
    .eq("id", fileId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Histórico de versões a partir da atual, andando pra trás por replaces_id. */
export async function listVersions(
  supabase: Supabase,
  orgId: string,
  fileId: string,
): Promise<FileVersion[]> {
  const versions: FileVersion[] = [];
  let currentId: string | null = fileId;
  let guard = 0;

  while (currentId && guard < 50) {
    guard += 1;
    const row = await getVersionRow(supabase, orgId, currentId);
    if (!row) break;

    const { replaces_id, ...version } = row;
    versions.push(version);
    currentId = replaces_id;
  }

  return versions;
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

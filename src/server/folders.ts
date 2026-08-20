import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type FolderItem = {
  id: string;
  name: string;
  parent_id: string | null;
  is_private: boolean;
};

/** Filhos diretos de uma pasta (carregamento lazy, §5.2) — `parentId=null` lista a raiz. */
export async function listChildren(
  supabase: Supabase,
  orgId: string,
  parentId: string | null,
): Promise<FolderItem[]> {
  let query = supabase
    .from("folders")
    .select("id, name, parent_id, is_private")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type BreadcrumbSegment = { id: string; name: string };

/** Caminho até a raiz via folder_ancestors() (§5.2) — mais recente primeiro na RPC, invertido aqui. */
export async function getBreadcrumb(
  supabase: Supabase,
  folderId: string,
): Promise<BreadcrumbSegment[]> {
  const { data, error } = await supabase.rpc("folder_ancestors", { p_folder: folderId });
  if (error) throw error;
  return [...(data ?? [])].reverse().map((row) => ({ id: row.id, name: row.name }));
}

export async function create(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    name: string;
    parentId: string | null;
    isPrivate: boolean;
  },
) {
  const { data, error } = await supabase
    .from("folders")
    .insert({
      org_id: params.orgId,
      name: params.name,
      parent_id: params.parentId,
      is_private: params.isPrivate,
      created_by: params.actorId,
    })
    .select("id, name, parent_id, is_private")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Já existe uma pasta com esse nome aqui." };
    }
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, data };
}

/** Pasta "Privado" única por usuário (§5.3) — raiz, sem aninhamento (reforçado na UI/actions). */
export async function getOrCreatePrivateFolder(
  supabase: Supabase,
  orgId: string,
  userId: string,
): Promise<FolderItem> {
  const { data: existing, error: existingErr } = await supabase
    .from("folders")
    .select("id, name, parent_id, is_private")
    .eq("org_id", orgId)
    .eq("created_by", userId)
    .eq("is_private", true)
    .is("parent_id", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingErr) throw existingErr;
  if (existing) return existing;

  const { data, error } = await supabase
    .from("folders")
    .insert({
      org_id: orgId,
      name: "Privado",
      parent_id: null,
      is_private: true,
      created_by: userId,
    })
    .select("id, name, parent_id, is_private")
    .single();

  if (error) throw error;
  return data;
}

export async function rename(
  supabase: Supabase,
  params: { orgId: string; folderId: string; name: string },
) {
  const { error } = await supabase
    .from("folders")
    .update({ name: params.name })
    .eq("id", params.folderId)
    .eq("org_id", params.orgId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Já existe uma pasta com esse nome aqui." };
    }
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function move(
  supabase: Supabase,
  params: { orgId: string; folderId: string; parentId: string | null },
) {
  if (params.parentId === params.folderId) {
    return { ok: false as const, error: "Uma pasta não pode ser movida para dentro dela mesma." };
  }

  const { error } = await supabase
    .from("folders")
    .update({ parent_id: params.parentId })
    .eq("id", params.folderId)
    .eq("org_id", params.orgId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, error: "Já existe uma pasta com esse nome ali." };
    }
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export async function softDelete(
  supabase: Supabase,
  params: { orgId: string; folderId: string },
) {
  const { error } = await supabase
    .from("folders")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.folderId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function restore(supabase: Supabase, params: { orgId: string; folderId: string }) {
  const { error } = await supabase
    .from("folders")
    .update({ deleted_at: null })
    .eq("id", params.folderId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export type FolderOption = { id: string; name: string; parent_id: string | null };

/** Lista achatada de pastas não privadas, pro seletor "Mover para" (§5.4) — a UI monta o caminho completo por parent_id. */
export async function listAllFlat(supabase: Supabase, orgId: string): Promise<FolderOption[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name, parent_id")
    .eq("org_id", orgId)
    .eq("is_private", false)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type TrashedFolder = { id: string; name: string; deleted_at: string };

export async function listTrash(supabase: Supabase, orgId: string): Promise<TrashedFolder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name, deleted_at")
    .eq("org_id", orgId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TrashedFolder[];
}

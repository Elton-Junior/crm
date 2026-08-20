import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type CommentItem = {
  id: string;
  body: string;
  mentions: string[];
  edited_at: string | null;
  created_at: string;
  author: { id: string; full_name: string | null } | null;
};

/**
 * Primitivo compartilhado (ARQUITETURA-EXPANSAO.md §3.2) — usado pelo
 * `<CommentThread>` em qualquer ficha (por enquanto só na tarefa, item 28;
 * client/proposta/contrato ficam para quando o item 24 completo entrar).
 * Sem paginação por cursor no MVP: threads internas tendem a ser curtas.
 */
export async function listByEntity(
  supabase: Supabase,
  params: { orgId: string; entityType: string; entityId: string },
): Promise<CommentItem[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, body, mentions, edited_at, created_at, author:profiles!comments_author_id_fkey(id, full_name)",
    )
    .eq("org_id", params.orgId)
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as CommentItem[];
}

export async function create(
  supabase: Supabase,
  params: {
    orgId: string;
    authorId: string;
    entityType: string;
    entityId: string;
    body: string;
    mentions: string[];
  },
) {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      org_id: params.orgId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      author_id: params.authorId,
      body: params.body,
      mentions: params.mentions,
    })
    .select("id, body, mentions, edited_at, created_at, author:profiles!comments_author_id_fkey(id, full_name)")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data as unknown as CommentItem };
}

/** Só o autor apaga o próprio comentário — checado na Server Action antes de chamar isto. */
export async function softDelete(
  supabase: Supabase,
  params: { orgId: string; commentId: string; authorId: string },
) {
  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.commentId)
    .eq("org_id", params.orgId)
    .eq("author_id", params.authorId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

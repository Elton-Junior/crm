"use server";

import { revalidatePath } from "next/cache";

import { requireOrg } from "@/lib/auth";
import * as commentsService from "@/server/comments";

const MAX_BODY_LENGTH = 5000;

export async function listComments(entityType: string, entityId: string) {
  const { supabase, orgId } = await requireOrg();
  const data = await commentsService.listByEntity(supabase, { orgId, entityType, entityId });
  return { ok: true as const, data };
}

export async function createComment(
  entityType: string,
  entityId: string,
  body: string,
  mentions: string[],
  revalidate: string,
) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > MAX_BODY_LENGTH) {
    return { ok: false as const, errors: { _form: ["Escreva um comentário válido."] } };
  }

  const { supabase, user, orgId } = await requireOrg();
  const result = await commentsService.create(supabase, {
    orgId,
    authorId: user.id,
    entityType,
    entityId,
    body: trimmed,
    mentions,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath(revalidate);
  return { ok: true as const, data: result.data };
}

export async function deleteComment(commentId: string, revalidate: string) {
  const { supabase, user, orgId } = await requireOrg();
  const result = await commentsService.softDelete(supabase, {
    orgId,
    commentId,
    authorId: user.id,
  });

  if (!result.ok) {
    return { ok: false as const, errors: { _form: [result.error] } };
  }

  revalidatePath(revalidate);
  return { ok: true as const, data: null };
}

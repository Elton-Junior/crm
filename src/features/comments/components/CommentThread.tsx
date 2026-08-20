"use client";

import { useEffect, useRef, useState } from "react";
import { AtSignIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { firstErrorMessage } from "@/lib/action-errors";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { createComment, deleteComment, listComments } from "../actions";

type Member = { id: string; full_name: string | null };
type Comment = {
  id: string;
  body: string;
  mentions: string[];
  edited_at: string | null;
  created_at: string;
  author: Member | null;
};

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Primitivo compartilhado (§3.2) — editor simples (textarea + `@`
 * autocomplete de membros), sem rich text. Notificação de menção fica
 * para o motor de automação (Fase 8) — não é espalhada por Server Action.
 */
export function CommentThread({
  entityType,
  entityId,
  members,
  revalidatePath,
}: {
  entityType: string;
  entityId: string;
  members: Member[];
  revalidatePath: string;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listComments(entityType, entityId).then((result) => {
      if (result.ok) setComments(result.data);
    });
    createClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [entityType, entityId]);

  const mentionCandidates =
    mentionQuery === null
      ? []
      : members.filter((m) =>
          (m.full_name ?? "").toLowerCase().includes(mentionQuery.toLowerCase()),
        );

  function handleTextChange(value: string) {
    setText(value);

    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const uptoCursor = value.slice(0, cursor);
    const match = uptoCursor.match(/(?:^|\s)@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(member: Member) {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? text.length;
    const uptoCursor = text.slice(0, cursor);
    const match = uptoCursor.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match) return;

    const start = uptoCursor.length - match[0].length + (match[0].startsWith(" ") ? 1 : 0);
    const name = member.full_name ?? "Sem nome";
    const next = `${text.slice(0, start)}@${name} ${text.slice(cursor)}`;
    setText(next);
    setMentionedIds((prev) => new Set(prev).add(member.id));
    setMentionQuery(null);
    requestAnimationFrame(() => textarea?.focus());
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    const result = await createComment(
      entityType,
      entityId,
      trimmed,
      [...mentionedIds],
      revalidatePath,
    );
    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível comentar."));
      return;
    }

    setComments((prev) => [...(prev ?? []), result.data]);
    setText("");
    setMentionedIds(new Set());
  }

  async function handleDelete(commentId: string) {
    const result = await deleteComment(commentId, revalidatePath);
    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível excluir o comentário."));
      return;
    }
    setComments((prev) => (prev ?? []).filter((c) => c.id !== commentId));
  }

  return (
    <div className="space-y-3">
      {comments === null ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
      ) : (
        <ol className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2">
              <Avatar size="sm">
                <AvatarFallback>{initials(comment.author?.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-md bg-muted/40 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">
                    {comment.author?.full_name ?? "Sem nome"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(comment.created_at)}
                    </span>
                    {comment.author?.id === currentUserId ? (
                      <button
                        type="button"
                        aria-label="Excluir comentário"
                        onClick={() => handleDelete(comment.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Escreva um comentário... use @ para mencionar alguém"
          rows={2}
        />
        {mentionQuery !== null && mentionCandidates.length > 0 ? (
          <div className="absolute bottom-full left-0 z-10 mb-1 w-56 rounded-md border bg-popover p-1 shadow-md">
            {mentionCandidates.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => insertMention(member)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                )}
              >
                <AtSignIcon className="size-3.5 text-muted-foreground" />
                {member.full_name ?? "Sem nome"}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting || !text.trim()}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Enviando..." : "Comentar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

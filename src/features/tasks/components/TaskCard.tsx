import { FlagIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardTask } from "@/server/tasks";

import { TASK_PRIORITY_LABELS } from "../schema";

const PRIORITY_STYLES: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-muted-foreground",
  high: "text-amber-600 dark:text-amber-500",
  urgent: "text-destructive",
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

/** Conteúdo do card — o casco arrastável vem do KanbanCard genérico (src/components/kanban/). */
export function TaskCard({ task }: { task: BoardTask }) {
  const isOverdue =
    task.due_on && task.status !== "done" && task.status !== "cancelled" &&
    new Date(task.due_on) < new Date();

  return (
    <>
      <p className="text-sm font-medium">{task.title}</p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {task.priority !== "normal" ? (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                PRIORITY_STYLES[task.priority],
              )}
              title={TASK_PRIORITY_LABELS[task.priority]}
            >
              <FlagIcon className="size-3" />
            </span>
          ) : null}
          {task.due_on ? (
            <span
              className={cn(
                "text-xs",
                isOverdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {formatDate(task.due_on)}
            </span>
          ) : null}
        </div>
        {task.assignee ? (
          <Avatar size="sm">
            <AvatarFallback>{initials(task.assignee.full_name)}</AvatarFallback>
          </Avatar>
        ) : null}
      </div>

      {task.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

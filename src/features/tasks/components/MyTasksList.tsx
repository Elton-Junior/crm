"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2Icon, FlagIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MyTask } from "@/server/tasks";

import type { MyTasksGroups } from "../queries";
import { TASK_PRIORITY_LABELS } from "../schema";
import { TaskDetailDialog } from "./TaskDetailDialog";

type Member = { id: string; full_name: string | null };

const PRIORITY_STYLES: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-muted-foreground",
  high: "text-amber-600 dark:text-amber-500",
  urgent: "text-destructive",
};

function TaskRow({
  task,
  overdue,
  onSelect,
}: {
  task: MyTask;
  overdue?: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm hover:bg-accent"
      >
        {task.project ? (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: task.project.color }}
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate font-medium">{task.title}</span>
        {task.project ? (
          <Link
            href={`/projetos/${task.project.id}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 truncate text-xs text-muted-foreground hover:underline"
          >
            {task.project.name}
          </Link>
        ) : null}
        {task.priority !== "normal" ? (
          <FlagIcon
            className={cn("size-3.5 shrink-0", PRIORITY_STYLES[task.priority])}
            aria-label={TASK_PRIORITY_LABELS[task.priority]}
          />
        ) : null}
        {task.due_on ? (
          <span
            className={cn(
              "shrink-0 text-xs",
              overdue ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {formatDate(task.due_on)}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function Section({
  title,
  tasks,
  overdue,
  onSelect,
}: {
  title: string;
  tasks: MyTask[];
  overdue?: boolean;
  onSelect: (task: MyTask) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {title} ({tasks.length})
      </h2>
      <ul className="space-y-1.5">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} overdue={overdue} onSelect={() => onSelect(task)} />
        ))}
      </ul>
    </div>
  );
}

export function MyTasksList({ groups, members }: { groups: MyTasksGroups; members: Member[] }) {
  const [selected, setSelected] = useState<{ taskId: string; projectId: string } | null>(null);

  const total =
    groups.overdue.length + groups.today.length + groups.week.length + groups.later.length;

  if (total === 0) {
    return (
      <EmptyState
        icon={CheckCircle2Icon}
        title="Nenhuma tarefa atribuída a você"
        description="Tarefas com você como responsável aparecem aqui, agrupadas por prazo."
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Section
          title="Atrasadas"
          tasks={groups.overdue}
          overdue
          onSelect={(task) =>
            task.project && setSelected({ taskId: task.id, projectId: task.project.id })
          }
        />
        <Section
          title="Hoje"
          tasks={groups.today}
          onSelect={(task) =>
            task.project && setSelected({ taskId: task.id, projectId: task.project.id })
          }
        />
        <Section
          title="Esta semana"
          tasks={groups.week}
          onSelect={(task) =>
            task.project && setSelected({ taskId: task.id, projectId: task.project.id })
          }
        />
        <Section
          title="Depois"
          tasks={groups.later}
          onSelect={(task) =>
            task.project && setSelected({ taskId: task.id, projectId: task.project.id })
          }
        />
      </div>

      <TaskDetailDialog
        taskId={selected?.taskId ?? null}
        projectId={selected?.projectId ?? ""}
        members={members}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}

import Link from "next/link";
import { FolderKanbanIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/EmptyState";
import { PROJECT_STATUS_LABELS } from "@/features/projects/schema";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type ClientProject = { id: string; name: string; status: string; color: string; due_on: string | null };

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  archived: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function ClientProjectsTab({ projects }: { projects: ClientProject[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanbanIcon}
        title="Nenhum projeto vinculado"
        description="Projetos criados para este cliente aparecem aqui."
      />
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {projects.map((project) => (
        <li key={project.id} className="flex items-center justify-between gap-4 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
            <Link href={`/projetos/${project.id}`} className="truncate text-sm font-medium hover:underline">
              {project.name}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {project.due_on ? (
              <span className="text-xs text-muted-foreground">{formatDate(project.due_on)}</span>
            ) : null}
            <Badge
              variant="outline"
              className={cn("border-transparent", STATUS_STYLES[project.status])}
            >
              {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

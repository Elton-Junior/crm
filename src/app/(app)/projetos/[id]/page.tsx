import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TasksBoard } from "@/features/tasks/components/TasksBoard";
import { getProjectDetail } from "@/features/projects/queries";
import { PROJECT_STATUS_LABELS } from "@/features/projects/schema";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  archived: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default async function ProjetoDetalhePage({
  params,
}: PageProps<"/projetos/[id]">) {
  const { id } = await params;
  const { project, members } = await getProjectDetail(id);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/projetos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Projetos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <Badge variant="outline" className={cn("border-transparent", STATUS_STYLES[project.status])}>
            {PROJECT_STATUS_LABELS[project.status]}
          </Badge>
        </div>
        {project.clientName ? (
          <p className="mt-1 text-sm text-muted-foreground">{project.clientName}</p>
        ) : null}
      </div>

      <TasksBoard projectId={project.id} members={members} />
    </div>
  );
}

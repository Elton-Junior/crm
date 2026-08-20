import { FolderKanbanIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { NewProjectButton } from "@/features/projects/components/NewProjectButton";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { ProjectsFilters } from "@/features/projects/components/ProjectsFilters";
import { getProjectsList } from "@/features/projects/queries";

export default async function ProjetosPage({
  searchParams,
}: PageProps<"/projetos">) {
  const resolvedSearchParams = await searchParams;
  const { projects, members, params, hasFilters } = await getProjectsList(
    resolvedSearchParams,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
          </p>
        </div>
        <NewProjectButton members={members} />
      </div>

      <ProjectsFilters defaultQuery={{ q: params.q, status: params.status }} />

      {projects.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={FolderKanbanIcon}
            title="Nenhum projeto encontrado"
            description="Ajuste os filtros ou limpe a busca para ver mais resultados."
          />
        ) : (
          <EmptyState
            icon={FolderKanbanIcon}
            title="Nenhum projeto cadastrado ainda"
            description="Crie o primeiro projeto para começar a organizar tarefas em Kanban."
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} members={members} />
          ))}
        </div>
      )}
    </div>
  );
}

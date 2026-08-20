import Link from "next/link";
import { CalendarIcon } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/server/projects";

import { PROJECT_STATUS_LABELS } from "../schema";
import { ProjectRowActions } from "./ProjectRowActions";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  done: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  archived: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const MAX_VISIBLE_AVATARS = 4;

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type Member = { id: string; full_name: string | null };

export function ProjectCard({
  project,
  members,
}: {
  project: ProjectListItem;
  members: Member[];
}) {
  const progress =
    project.totalTasks === 0 ? 0 : Math.round((project.doneTasks / project.totalTasks) * 100);
  const isOverdue =
    project.due_on && project.status === "active" && new Date(project.due_on) < new Date();

  const visibleMembers = project.members.slice(0, MAX_VISIBLE_AVATARS);
  const extraMembersCount = project.members.length - visibleMembers.length;

  return (
    <Card className="relative">
      <span
        className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
        style={{ backgroundColor: project.color }}
      />
      <CardHeader className="flex flex-row items-start justify-between gap-2 pl-5">
        <div className="min-w-0 space-y-1">
          <Link href={`/projetos/${project.id}`} className="hover:underline">
            <h3 className="truncate text-sm font-semibold">{project.name}</h3>
          </Link>
          {project.client ? (
            <p className="truncate text-xs text-muted-foreground">{project.client.name}</p>
          ) : null}
        </div>
        <ProjectRowActions
          projectId={project.id}
          projectName={project.name}
          members={members}
        />
      </CardHeader>
      <CardContent className="space-y-3 pl-5">
        <Badge variant="outline" className={cn("border-transparent", STATUS_STYLES[project.status])}>
          {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
        </Badge>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {project.doneTasks}/{project.totalTasks} tarefas
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <div className="flex items-center justify-between">
          {project.due_on ? (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-destructive" : "text-muted-foreground",
              )}
            >
              <CalendarIcon className="size-3.5" />
              {formatDate(project.due_on)}
            </span>
          ) : (
            <span />
          )}

          {visibleMembers.length > 0 ? (
            <AvatarGroup>
              {visibleMembers.map((member) => (
                <Avatar key={member.id} size="sm">
                  <AvatarFallback>{initials(member.full_name)}</AvatarFallback>
                </Avatar>
              ))}
              {extraMembersCount > 0 ? (
                <AvatarGroupCount className="size-6 text-xs">
                  +{extraMembersCount}
                </AvatarGroupCount>
              ) : null}
            </AvatarGroup>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

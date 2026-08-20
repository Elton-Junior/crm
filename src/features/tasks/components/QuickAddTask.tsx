"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { positionForIndex } from "@/components/kanban/ordering";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardTask } from "@/server/tasks";

import { useCreateTask } from "../hooks";

export function QuickAddTask({
  projectId,
  columnId,
  tasks,
}: {
  projectId: string;
  columnId: string;
  tasks: BoardTask[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const createTask = useCreateTask(projectId);

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;

    const position = positionForIndex(tasks, tasks.length);
    createTask.mutate(
      { columnId, title: trimmed, position },
      {
        onSuccess: () => {
          setTitle("");
          setOpen(false);
        },
      },
    );
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <PlusIcon /> Nova tarefa
      </Button>
    );
  }

  return (
    <div className="space-y-1.5">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da tarefa"
        disabled={createTask.isPending}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") {
            setTitle("");
            setOpen(false);
          }
        }}
        onBlur={() => {
          if (!title.trim()) setOpen(false);
        }}
      />
      <div className="flex gap-1.5">
        <Button size="sm" onClick={handleSubmit} disabled={createTask.isPending || !title.trim()}>
          {createTask.isPending ? "Criando..." : "Criar"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setTitle("");
            setOpen(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

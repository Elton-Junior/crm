"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { positionForIndex } from "@/components/kanban/ordering";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { firstErrorMessage } from "@/lib/action-errors";

import { createSubtask, toggleSubtaskStatus } from "../actions";

export type SubtaskItem = { id: string; title: string; status: string; position: string };

export function TaskSubtasks({
  taskId,
  projectId,
  columnId,
  initialItems,
}: {
  taskId: string;
  projectId: string;
  columnId: string;
  initialItems: SubtaskItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsAdding(true);
    const position = positionForIndex(items, items.length);
    const result = await createSubtask(taskId, projectId, columnId, trimmed, position);
    setIsAdding(false);

    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível criar a subtarefa."));
      return;
    }

    setItems((prev) => [...prev, result.data]);
    setTitle("");
  }

  async function handleToggle(subtaskId: string, done: boolean) {
    setItems((prev) =>
      prev.map((i) => (i.id === subtaskId ? { ...i, status: done ? "done" : "todo" } : i)),
    );
    const result = await toggleSubtaskStatus(subtaskId, done);
    if (!result.ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === subtaskId ? { ...i, status: done ? "todo" : "done" } : i)),
      );
      toast.error(firstErrorMessage(result.errors, "Não foi possível atualizar a subtarefa."));
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <Checkbox
              checked={item.status === "done"}
              onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
            />
            <span
              className={
                item.status === "done"
                  ? "flex-1 text-sm text-muted-foreground line-through"
                  : "flex-1 text-sm"
              }
            >
              {item.title}
            </span>
          </li>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma subtarefa ainda.</p>
        ) : null}
      </ul>

      <div className="flex gap-1.5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nova subtarefa"
          disabled={isAdding}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAdd();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={handleAdd} disabled={isAdding || !title.trim()}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}

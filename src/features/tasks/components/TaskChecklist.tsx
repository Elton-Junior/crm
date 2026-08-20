"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { positionForIndex } from "@/components/kanban/ordering";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { firstErrorMessage } from "@/lib/action-errors";

import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "../actions";

export type ChecklistItem = { id: string; title: string; done: boolean; position: string };

export function TaskChecklist({
  taskId,
  initialItems,
}: {
  taskId: string;
  initialItems: ChecklistItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [title, setTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const done = items.filter((i) => i.done).length;
  const progress = items.length === 0 ? 0 : Math.round((done / items.length) * 100);

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsAdding(true);
    const position = positionForIndex(items, items.length);
    const result = await addChecklistItem(taskId, trimmed, position);
    setIsAdding(false);

    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível adicionar o item."));
      return;
    }

    setItems((prev) => [...prev, result.data]);
    setTitle("");
  }

  async function handleToggle(itemId: string, next: boolean) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, done: next } : i)));
    const result = await toggleChecklistItem(itemId, next);
    if (!result.ok) {
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, done: !next } : i)));
      toast.error(firstErrorMessage(result.errors, "Não foi possível atualizar o item."));
    }
  }

  async function handleDelete(itemId: string) {
    const prev = items;
    setItems((current) => current.filter((i) => i.id !== itemId));
    const result = await deleteChecklistItem(itemId);
    if (!result.ok) {
      setItems(prev);
      toast.error(firstErrorMessage(result.errors, "Não foi possível excluir o item."));
    }
  }

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {done}/{items.length} concluídos
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      ) : null}

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2">
            <Checkbox
              checked={item.done}
              onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
            />
            <span className={item.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>
              {item.title}
            </span>
            <button
              type="button"
              aria-label={`Excluir "${item.title}"`}
              onClick={() => handleDelete(item.id)}
              className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-1.5">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Novo item"
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

"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { firstErrorMessage } from "@/lib/action-errors";
import { formatDate } from "@/lib/format";

import { addTimeEntry } from "../actions";

export type TimeEntryItem = {
  id: string;
  minutes: number;
  note: string | null;
  logged_on: string;
  user: { id: string; full_name: string | null } | null;
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

export function TaskTimeTracking({
  taskId,
  spentMin,
  estimateMin,
  initialItems,
}: {
  taskId: string;
  spentMin: number;
  estimateMin: number | null;
  initialItems: TimeEntryItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [totalSpent, setTotalSpent] = useState(spentMin);
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd() {
    const parsed = Number(minutes);
    if (!parsed || parsed <= 0) {
      toast.error("Informe uma duração válida.");
      return;
    }

    setIsAdding(true);
    const loggedOn = new Date().toISOString().slice(0, 10);
    const result = await addTimeEntry(taskId, parsed, note, loggedOn);
    setIsAdding(false);

    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível registrar o apontamento."));
      return;
    }

    setItems((prev) => [
      { id: crypto.randomUUID(), minutes: parsed, note: note || null, logged_on: loggedOn, user: null },
      ...prev,
    ]);
    setTotalSpent((prev) => prev + parsed);
    setMinutes("");
    setNote("");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {formatMinutes(totalSpent)} apontados
        {estimateMin ? ` de ${formatMinutes(estimateMin)} estimados` : ""}
      </p>

      <ul className="space-y-1.5">
        {items.map((entry) => (
          <li key={entry.id} className="flex items-center justify-between text-sm">
            <span>
              {entry.user?.full_name ?? "Você"} — {formatMinutes(entry.minutes)}
              {entry.note ? ` (${entry.note})` : ""}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(entry.logged_on)}</span>
          </li>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum apontamento ainda.</p>
        ) : null}
      </ul>

      <div className="flex gap-1.5">
        <Input
          type="number"
          min={1}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="Minutos"
          className="w-24"
          disabled={isAdding}
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          disabled={isAdding}
        />
        <Button type="button" size="sm" onClick={handleAdd} disabled={isAdding || !minutes}>
          {isAdding ? "..." : "Apontar"}
        </Button>
      </div>
    </div>
  );
}

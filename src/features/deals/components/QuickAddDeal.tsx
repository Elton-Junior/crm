"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { positionForIndex } from "@/components/kanban/ordering";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardDeal } from "@/server/deals";

import { useCreateDeal } from "../hooks";

export function QuickAddDeal({
  pipelineId,
  stageId,
  deals,
}: {
  pipelineId: string;
  stageId: string;
  deals: BoardDeal[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const createDeal = useCreateDeal(pipelineId);

  function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;

    const position = positionForIndex(deals, deals.length);
    createDeal.mutate(
      { stageId, title: trimmed, position },
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
        <PlusIcon /> Nova proposta
      </Button>
    );
  }

  return (
    <div className="space-y-1.5">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da proposta"
        disabled={createDeal.isPending}
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
        <Button size="sm" onClick={handleSubmit} disabled={createDeal.isPending || !title.trim()}>
          {createDeal.isPending ? "Criando..." : "Criar"}
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

"use client";

import { useState } from "react";

import { KanbanBoard } from "./KanbanBoard";
import { DEFAULT_KANBAN_FILTERS, KanbanFilters } from "./KanbanFilters";

type Member = { id: string; full_name: string | null };

export function PropostasBoard({
  pipelineId,
  members,
}: {
  pipelineId: string;
  members: Member[];
}) {
  const [filters, setFilters] = useState(DEFAULT_KANBAN_FILTERS);

  return (
    <div className="space-y-4">
      <KanbanFilters members={members} value={filters} onChange={setFilters} />
      <KanbanBoard pipelineId={pipelineId} filters={filters} />
    </div>
  );
}

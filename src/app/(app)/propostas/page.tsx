import { KanbanSquareIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { PropostasBoard } from "@/features/deals/components/PropostasBoard";
import { requireOrg } from "@/lib/auth";
import * as clientsService from "@/server/clients";
import * as dealsService from "@/server/deals";

export default async function PropostasPage() {
  const { supabase, orgId } = await requireOrg();

  const [pipelineId, members] = await Promise.all([
    dealsService.getDefaultPipelineId(supabase, orgId),
    clientsService.listMembers(supabase, orgId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Propostas</h1>
        <p className="text-sm text-muted-foreground">
          Arraste os cards entre as colunas para atualizar o pipeline.
        </p>
      </div>

      {pipelineId ? (
        <PropostasBoard pipelineId={pipelineId} members={members} />
      ) : (
        <EmptyState
          icon={KanbanSquareIcon}
          title="Nenhum pipeline configurado"
          description="Crie um pipeline em Configurações para começar a usar o Kanban."
        />
      )}
    </div>
  );
}

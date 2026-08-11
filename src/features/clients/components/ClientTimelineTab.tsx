import {
  ClipboardEditIcon,
  FileTextIcon,
  HistoryIcon,
  KanbanSquareIcon,
  StickyNoteIcon,
  TrophyIcon,
  UserPlusIcon,
  XCircleIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { ClientActivity } from "@/server/activities";
import type { Database } from "@/types/database";

type ActivityKind = Database["public"]["Enums"]["activity_kind"];

const ACTIVITY_META: Record<ActivityKind, { label: string; icon: LucideIcon }> = {
  client_created: { label: "Cliente cadastrado", icon: UserPlusIcon },
  client_updated: { label: "Cliente atualizado", icon: ClipboardEditIcon },
  deal_created: { label: "Proposta criada", icon: KanbanSquareIcon },
  deal_moved: { label: "Proposta movida", icon: KanbanSquareIcon },
  deal_won: { label: "Proposta ganha", icon: TrophyIcon },
  deal_lost: { label: "Proposta perdida", icon: XCircleIcon },
  contract_uploaded: { label: "Contrato enviado", icon: FileTextIcon },
  contract_status_changed: { label: "Status do contrato alterado", icon: FileTextIcon },
  event_created: { label: "Evento criado", icon: HistoryIcon },
  note_added: { label: "Observação adicionada", icon: StickyNoteIcon },
};

function payloadAction(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "action" in payload) {
    const action = (payload as { action?: unknown }).action;
    if (action === "deleted") return "Cliente excluído";
  }
  return null;
}

export function ClientTimelineTab({ activities }: { activities: ClientActivity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={HistoryIcon}
        title="Sem atividades registradas"
        description="Alterações relevantes neste cliente aparecem aqui."
      />
    );
  }

  return (
    <ol className="space-y-4">
      {activities.map((activity) => {
        const meta = ACTIVITY_META[activity.kind];
        const Icon = meta.icon;
        const label = payloadAction(activity.payload) ?? meta.label;

        return (
          <li key={activity.id} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 pt-1">
              <p className="text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">
                {activity.actor?.full_name ?? "Sistema"} ·{" "}
                {formatDateTime(activity.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

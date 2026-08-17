import { LayoutDashboardIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <EmptyState
        icon={LayoutDashboardIcon}
        title="Em construção"
        description="KPIs, funil de propostas e listas acionáveis chegam na Fase 3."
      />
    </div>
  );
}

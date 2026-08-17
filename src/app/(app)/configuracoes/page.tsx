import { SettingsIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <EmptyState
        icon={SettingsIcon}
        title="Em construção"
        description="Perfil, organização, equipe e pipeline chegam na Fase 4."
      />
    </div>
  );
}

import { SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";

export default function AppNotFound() {
  return (
    <EmptyState
      icon={SearchXIcon}
      title="Página não encontrada"
      description="O item que você procura não existe ou foi removido."
      action={{ label: "Voltar ao Dashboard", href: "/dashboard" }}
      className="mt-12"
    />
  );
}

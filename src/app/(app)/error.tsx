"use client";

import { useEffect } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangleIcon}
      title="Algo deu errado"
      description="Não foi possível carregar esta página. Tente novamente em alguns instantes."
      action={{ label: "Tentar novamente", onClick: reset }}
      className="mt-12"
    />
  );
}

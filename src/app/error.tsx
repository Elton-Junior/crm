"use client";

import { useEffect } from "react";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function RootError({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangleIcon className="size-10 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="text-lg font-medium">Algo deu errado</p>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar esta página. Tente novamente em alguns instantes.
        </p>
      </div>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}

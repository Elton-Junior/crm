"use client";

import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

import { getClient } from "../actions";
import type { ClientFormInput } from "../schema";
import { ClientForm } from "./ClientForm";

type Member = { id: string; full_name: string | null };

export function ClientEditSheet({
  open,
  onOpenChange,
  clientId,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  members: Member[];
}) {
  const [defaultValues, setDefaultValues] = useState<ClientFormInput | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    getClient(clientId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.errors._form?.[0] ?? "Não foi possível carregar o cliente.");
        return;
      }
      setDefaultValues(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset é feito aqui (handler de evento), não no effect acima —
      // setState síncrono dentro de um effect dispara a regra
      // react-hooks/set-state-in-effect.
      setDefaultValues(null);
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Editar cliente</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : defaultValues ? (
            <ClientForm
              mode="edit"
              clientId={clientId}
              defaultValues={defaultValues}
              members={members}
              onSuccess={() => onOpenChange(false)}
            />
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

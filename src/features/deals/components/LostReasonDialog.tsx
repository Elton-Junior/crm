"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function LostReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo da perda</DialogTitle>
          <DialogDescription>
            Antes de marcar a proposta como perdida, registre o motivo.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: preço, concorrência, timing..."
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={isPending || !reason.trim()}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? "Salvando..." : "Marcar como perdida"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

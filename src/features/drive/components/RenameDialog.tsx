"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { firstErrorMessage } from "@/lib/action-errors";

type ActionResult =
  | { ok: true; data: unknown }
  | { ok: false; errors: { _form?: string[]; [key: string]: string[] | undefined } };

export function RenameDialog({
  open,
  onOpenChange,
  currentName,
  onRename,
  onRenamed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onRename: (name: string) => Promise<ActionResult>;
  onRenamed: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSaving(true);
    const result = await onRename(trimmed);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível renomear."));
      return;
    }

    toast.success("Renomeado.");
    onOpenChange(false);
    onRenamed();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Renomear</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-input">Nome</Label>
          <Input
            id="rename-input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSaving || !name.trim()}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

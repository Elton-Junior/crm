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

import { createFolder } from "../actions";

export function NewFolderDialog({
  open,
  onOpenChange,
  parentId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSaving(true);
    const result = await createFolder(trimmed, parentId);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível criar a pasta."));
      return;
    }

    toast.success("Pasta criada.");
    setName("");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova pasta</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="new-folder-name">Nome</Label>
          <Input
            id="new-folder-name"
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
            {isSaving ? "Criando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

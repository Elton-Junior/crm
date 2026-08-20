"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { firstErrorMessage } from "@/lib/action-errors";

import { listMoveTargets } from "../actions";

const ROOT = "__root__";

type ActionResult =
  | { ok: true; data: unknown }
  | { ok: false; errors: { _form?: string[]; [key: string]: string[] | undefined } };
type FolderOption = { id: string; name: string; parent_id: string | null };

function buildPathLabel(folder: FolderOption, byId: Map<string, FolderOption>): string {
  const segments = [folder.name];
  let current = folder.parent_id ? byId.get(folder.parent_id) : undefined;
  while (current) {
    segments.unshift(current.name);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return segments.join(" / ");
}

export function MoveDialog({
  open,
  onOpenChange,
  excludeFolderId,
  onMove,
  onMoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ao mover uma pasta, exclui ela mesma (e idealmente seus descendentes) da lista de destinos. */
  excludeFolderId?: string;
  onMove: (folderId: string | null) => Promise<ActionResult>;
  onMoved: () => void;
}) {
  const [options, setOptions] = useState<FolderOption[]>([]);
  const [selected, setSelected] = useState(ROOT);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    listMoveTargets().then((data) => {
      setOptions(excludeFolderId ? data.filter((f) => f.id !== excludeFolderId) : data);
    });
  }, [open, excludeFolderId]);

  const byId = new Map(options.map((f) => [f.id, f]));

  async function handleSubmit() {
    setIsMoving(true);
    const result = await onMove(selected === ROOT ? null : selected);
    setIsMoving(false);

    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível mover."));
      return;
    }

    toast.success("Movido.");
    onOpenChange(false);
    onMoved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mover para</DialogTitle>
        </DialogHeader>

        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROOT}>Todos os arquivos (raiz)</SelectItem>
            {options.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {buildPathLabel(folder, byId)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isMoving}>
            {isMoving ? "Movendo..." : "Mover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

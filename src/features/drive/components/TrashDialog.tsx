"use client";

import { useEffect, useState } from "react";
import { FileIcon, FolderIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { firstErrorMessage } from "@/lib/action-errors";
import { formatDateTime } from "@/lib/format";

import { getTrash, restoreFile, restoreFolder } from "../actions";

type TrashedItem = { id: string; name: string; deleted_at: string };

export function TrashDialog({
  open,
  onOpenChange,
  onRestored,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
}) {
  const [folders, setFolders] = useState<TrashedItem[] | null>(null);
  const [files, setFiles] = useState<TrashedItem[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getTrash().then((data) => {
      if (cancelled) return;
      setFolders(data.folders);
      setFiles(data.files);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleRestoreFolder(id: string) {
    const result = await restoreFolder(id);
    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível restaurar."));
      return;
    }
    toast.success("Pasta restaurada.");
    setFolders((prev) => (prev ?? []).filter((f) => f.id !== id));
    onRestored();
  }

  async function handleRestoreFile(id: string) {
    const result = await restoreFile(id);
    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível restaurar."));
      return;
    }
    toast.success("Arquivo restaurado.");
    setFiles((prev) => (prev ?? []).filter((f) => f.id !== id));
    onRestored();
  }

  const isLoading = folders === null || files === null;
  const isEmpty = !isLoading && folders.length === 0 && files.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lixeira</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isEmpty ? (
          <EmptyState icon={Trash2Icon} title="Lixeira vazia" />
        ) : (
          <ul className="divide-y">
            {folders.map((folder) => (
              <li key={folder.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{folder.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(folder.deleted_at)}
                  </span>
                </span>
                <Button size="sm" variant="outline" onClick={() => handleRestoreFolder(folder.id)}>
                  Restaurar
                </Button>
              </li>
            ))}
            {files.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(file.deleted_at)}
                  </span>
                </span>
                <Button size="sm" variant="outline" onClick={() => handleRestoreFile(file.id)}>
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

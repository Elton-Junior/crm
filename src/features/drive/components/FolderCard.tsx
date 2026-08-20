"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FolderIcon,
  LockIcon,
  MoreHorizontalIcon,
  MoveIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { firstErrorMessage } from "@/lib/action-errors";

import { deleteFolder, moveFolder, renameFolder } from "../actions";
import { MoveDialog } from "./MoveDialog";
import { RenameDialog } from "./RenameDialog";

type Folder = { id: string; name: string; is_private: boolean };

export function FolderCard({
  folder,
  currentPath,
  onChanged,
}: {
  folder: Folder;
  currentPath: string | null;
  onChanged: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function handleDelete() {
    const result = await deleteFolder(folder.id, currentPath);
    if (!result.ok) {
      toast.error(firstErrorMessage(result.errors, "Não foi possível excluir."));
      return;
    }
    toast.success("Pasta movida para a lixeira.");
    setConfirmDeleteOpen(false);
    onChanged();
  }

  return (
    <Card className="relative flex-row items-center gap-2 p-3">
      <Link
        href={`/drive/${folder.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 hover:underline"
      >
        {folder.is_private ? (
          <LockIcon className="size-5 shrink-0 text-muted-foreground" />
        ) : (
          <FolderIcon className="size-5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-sm font-medium">{folder.name}</span>
      </Link>

      {folder.is_private ? null : (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ações de ${folder.name}`}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setRenameOpen(true);
              }}
            >
              <PencilIcon /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setMoveOpen(true);
              }}
            >
              <MoveIcon /> Mover
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setConfirmDeleteOpen(true);
              }}
            >
              <Trash2Icon /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        currentName={folder.name}
        onRename={(name) => renameFolder(folder.id, name, currentPath)}
        onRenamed={onChanged}
      />
      <MoveDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        excludeFolderId={folder.id}
        onMove={(parentId) => moveFolder(folder.id, parentId, currentPath)}
        onMoved={onChanged}
      />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {folder.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A pasta vai para a lixeira e pode ser restaurada depois. Os arquivos dentro
              dela continuam vinculados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

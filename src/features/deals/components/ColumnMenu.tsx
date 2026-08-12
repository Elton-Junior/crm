"use client";

import { useState } from "react";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PipelineStage } from "@/server/deals";

import { useDeleteStage, useUpdateStage } from "../hooks";

export function ColumnMenu({
  pipelineId,
  stage,
}: {
  pipelineId: string;
  stage: PipelineStage;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(stage.name);
  const [color, setColor] = useState(stage.color);
  const [wipLimit, setWipLimit] = useState(stage.wip_limit?.toString() ?? "");

  const updateStage = useUpdateStage(pipelineId);
  const deleteStage = useDeleteStage(pipelineId);

  function openEdit() {
    setName(stage.name);
    setColor(stage.color);
    setWipLimit(stage.wip_limit?.toString() ?? "");
    setMenuOpen(false);
    setEditOpen(true);
  }

  function handleSave() {
    updateStage.mutate(
      {
        stageId: stage.id,
        name,
        color,
        wipLimit: wipLimit.trim() === "" ? null : Number(wipLimit),
      },
      { onSuccess: () => setEditOpen(false) },
    );
  }

  function handleDelete() {
    deleteStage.mutate(stage.id, { onSuccess: () => setConfirmOpen(false) });
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Ações da coluna ${stage.name}`}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={openEdit}>
            <PencilIcon /> Renomear / cor / limite
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              setConfirmOpen(true);
            }}
          >
            <Trash2Icon /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stage-name">Nome</Label>
              <Input id="stage-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage-color">Cor</Label>
              <Input
                id="stage-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-16 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage-wip">Limite de cards (opcional)</Label>
              <Input
                id="stage-wip"
                type="number"
                min={1}
                value={wipLimit}
                onChange={(e) => setWipLimit(e.target.value)}
                placeholder="Sem limite"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={updateStage.isPending || !name.trim()}>
              {updateStage.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coluna &quot;{stage.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Só é possível excluir colunas sem cards. Mova os cards para outra
              coluna antes de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStage.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteStage.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteStage.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

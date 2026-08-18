"use client";

import { useState, useTransition } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { firstErrorMessage } from "@/lib/action-errors";
import type { PipelineStage } from "@/server/deals";

import {
  createPipelineStage,
  deletePipelineStage,
  movePipelineStage,
  updatePipelineStage,
} from "../actions";
import { STAGE_FORM_DEFAULTS, type StageFormInput } from "../schema";

type Kind = "normal" | "won" | "lost";

function kindFrom(stage: { is_won: boolean; is_lost: boolean }): Kind {
  if (stage.is_won) return "won";
  if (stage.is_lost) return "lost";
  return "normal";
}

function toInput(stage: PipelineStage): StageFormInput {
  return {
    name: stage.name,
    color: stage.color,
    wipLimit: stage.wip_limit?.toString() ?? "",
    isWon: stage.is_won,
    isLost: stage.is_lost,
  };
}

export function PipelineEditor({
  pipelineId,
  stages,
}: {
  pipelineId: string;
  stages: PipelineStage[];
}) {
  const [dialogStage, setDialogStage] = useState<PipelineStage | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Colunas do funil de propostas, na ordem em que aparecem no Kanban.
        </p>
        <Button size="sm" onClick={() => setDialogStage("new")}>
          <PlusIcon /> Nova coluna
        </Button>
      </div>

      <ul className="divide-y rounded-md border">
        {stages.map((stage, index) => (
          <StageRow
            key={stage.id}
            pipelineId={pipelineId}
            stage={stage}
            isFirst={index === 0}
            isLast={index === stages.length - 1}
            onEdit={() => setDialogStage(stage)}
          />
        ))}
        {stages.length === 0 && (
          <li className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma coluna ainda.
          </li>
        )}
      </ul>

      <StageFormDialog
        pipelineId={pipelineId}
        stage={dialogStage === "new" ? null : dialogStage}
        open={dialogStage !== null}
        onOpenChange={(open) => !open && setDialogStage(null)}
      />
    </div>
  );
}

function StageRow({
  pipelineId,
  stage,
  isFirst,
  isLast,
  onEdit,
}: {
  pipelineId: string;
  stage: PipelineStage;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const kind = kindFrom(stage);

  function move(direction: "up" | "down") {
    startTransition(async () => {
      const result = await movePipelineStage(pipelineId, stage.id, direction);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível mover."));
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePipelineStage(stage.id);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível excluir."));
        return;
      }
      toast.success("Coluna excluída.");
      setConfirmOpen(false);
    });
  }

  return (
    <li className="flex items-center gap-3 p-3">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: stage.color }}
        aria-hidden
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{stage.name}</span>
          {kind === "won" && <Badge className="bg-emerald-600 text-white">Ganho</Badge>}
          {kind === "lost" && <Badge variant="destructive">Perdido</Badge>}
        </div>
        {stage.wip_limit !== null && (
          <p className="text-xs text-muted-foreground">Limite: {stage.wip_limit} cards</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isFirst || isPending}
          onClick={() => move("up")}
          aria-label={`Mover ${stage.name} para cima`}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={isLast || isPending}
          onClick={() => move("down")}
          aria-label={`Mover ${stage.name} para baixo`}
        >
          <ArrowDownIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Editar ${stage.name}`}>
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive"
          onClick={() => setConfirmOpen(true)}
          aria-label={`Excluir ${stage.name}`}
        >
          <Trash2Icon />
        </Button>
      </div>

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
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function StageFormDialog({
  pipelineId,
  stage,
  open,
  onOpenChange,
}: {
  pipelineId: string;
  stage: PipelineStage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [input, setInput] = useState<StageFormInput>(STAGE_FORM_DEFAULTS);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      setInput(stage ? toInput(stage) : STAGE_FORM_DEFAULTS);
      setErrors({});
    }
    onOpenChange(next);
  }

  function setKind(kind: Kind) {
    setInput((prev) => ({ ...prev, isWon: kind === "won", isLost: kind === "lost" }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = stage
        ? await updatePipelineStage(stage.id, input)
        : await createPipelineStage(pipelineId, input);

      if (!result.ok) {
        const flat: Record<string, string | undefined> = {};
        for (const [field, messages] of Object.entries(result.errors)) {
          flat[field] = messages?.[0];
        }
        setErrors(flat);
        toast.error(firstErrorMessage(result.errors, "Não foi possível salvar."));
        return;
      }

      toast.success(stage ? "Coluna atualizada." : "Coluna criada.");
      onOpenChange(false);
    });
  }

  const kind = input.isWon ? "won" : input.isLost ? "lost" : "normal";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stage ? "Editar coluna" : "Nova coluna"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Nome</Label>
            <Input
              id="stage-name"
              value={input.name}
              onChange={(e) => setInput((prev) => ({ ...prev, name: e.target.value }))}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage-color">Cor</Label>
            <Input
              id="stage-color"
              type="color"
              value={input.color}
              onChange={(e) => setInput((prev) => ({ ...prev, color: e.target.value }))}
              className="h-9 w-16 p-1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage-wip">Limite de cards (opcional)</Label>
            <Input
              id="stage-wip"
              type="number"
              min={1}
              value={input.wipLimit}
              onChange={(e) => setInput((prev) => ({ ...prev, wipLimit: e.target.value }))}
              placeholder="Sem limite"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as Kind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="won">Ganho — fecha a proposta como ganha</SelectItem>
                <SelectItem value="lost">Perdido — fecha a proposta como perdida</SelectItem>
              </SelectContent>
            </Select>
            {errors.isLost && <p className="text-sm text-destructive">{errors.isLost}</p>}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isPending || !input.name.trim()}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

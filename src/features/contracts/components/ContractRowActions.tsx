"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CopyIcon,
  EyeIcon,
  MoreHorizontalIcon,
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { firstErrorMessage } from "@/lib/action-errors";

import { deleteContract, duplicateContract } from "../actions";

export function ContractRowActions({
  contractId,
  contractTitle,
}: {
  contractId: string;
  contractTitle: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteContract(contractId);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível excluir o contrato."));
        return;
      }
      toast.success("Contrato excluído.");
      setConfirmOpen(false);
    });
  }

  function handleDuplicate() {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await duplicateContract(contractId);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível duplicar o contrato."));
        return;
      }
      toast.success("Contrato duplicado como rascunho.");
    });
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Ações de ${contractTitle}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/contratos/${contractId}`}>
              <EyeIcon /> Ver
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDuplicate} disabled={isPending}>
            <CopyIcon /> Duplicar
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {contractTitle}?</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato sai das listagens. O arquivo permanece no Storage.
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
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagsInput } from "@/features/clients/components/TagsInput";
import { ClientCombobox } from "@/features/deals/components/ClientCombobox";
import { firstErrorMessage } from "@/lib/action-errors";
import { formatFileSize } from "@/lib/format";
import type { ContractDetail } from "@/server/contracts";

import { deleteContract, duplicateContract, updateContract } from "../actions";
import { CONTRACT_STATUS_LABELS, contractFormSchema, type ContractFormInput } from "../schema";
import { DealCombobox } from "./DealCombobox";
import { FileUploadDropzone } from "./FileUploadDropzone";

export function ContractMetadataPanel({ contract }: { contract: ContractDetail }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [clientName, setClientName] = useState<string | null>(contract.clientName);
  const [dealTitle, setDealTitle] = useState<string | null>(contract.dealTitle);
  const [showReplaceFile, setShowReplaceFile] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const form = useForm<ContractFormInput>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      title: contract.title,
      contractNo: contract.contractNo,
      clientId: contract.clientId,
      dealId: contract.dealId,
      status: contract.status,
      value: contract.valueCents ? (contract.valueCents / 100).toString() : "",
      startDate: contract.startDate,
      endDate: contract.endDate,
      signedAt: contract.signedAt,
      renewalNoticeDays:
        contract.renewalNoticeDays === null ? "" : String(contract.renewalNoticeDays),
      notes: contract.notes,
      tags: contract.tags,
    },
  });

  const clientId = useWatch({ control: form.control, name: "clientId" });

  function handleSave(values: ContractFormInput) {
    setIsSaving(true);
    updateContract(contract.id, values).then((result) => {
      setIsSaving(false);
      if (!result.ok) {
        for (const [field, messages] of Object.entries(result.errors)) {
          if (field === "_form") {
            toast.error(messages?.[0] ?? "Não foi possível salvar.");
            continue;
          }
          form.setError(field as keyof ContractFormInput, { message: messages?.[0] });
        }
        return;
      }
      toast.success("Contrato atualizado.");
      router.refresh();
    });
  }

  function handleDuplicate() {
    setIsDuplicating(true);
    duplicateContract(contract.id).then((result) => {
      setIsDuplicating(false);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível duplicar."));
        return;
      }
      toast.success("Contrato duplicado como rascunho.");
      router.push(`/contratos/${result.data.id}`);
    });
  }

  function handleDelete() {
    setIsDeleting(true);
    deleteContract(contract.id).then((result) => {
      setIsDeleting(false);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível excluir."));
        return;
      }
      toast.success("Contrato excluído.");
      router.push("/contratos");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Arquivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contract.file && !showReplaceFile ? (
            <div className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{contract.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(contract.file.size)}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowReplaceFile(true)}>
                Substituir
              </Button>
            </div>
          ) : (
            <FileUploadDropzone
              contractId={contract.id}
              onUploaded={() => {
                setShowReplaceFile(false);
                router.refresh();
              }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <ClientCombobox
                        value={field.value}
                        selectedName={clientName}
                        onChange={(client) => {
                          field.onChange(client?.id ?? "");
                          setClientName(client?.name ?? null);
                          form.setValue("dealId", "");
                          setDealTitle(null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dealId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposta vinculada</FormLabel>
                    <FormControl>
                      <DealCombobox
                        clientId={clientId}
                        value={field.value}
                        selectedTitle={dealTitle}
                        onChange={(deal) => {
                          field.onChange(deal?.id ?? "");
                          setDealTitle(deal?.title ?? null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="signedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de assinatura</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="renewalNoticeDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aviso de renovação (dias)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <TagsInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anotações</FormLabel>
                    <FormControl>
                      <Textarea rows={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDuplicate}
          disabled={isDuplicating}
        >
          {isDuplicating ? "Duplicando..." : "Duplicar"}
        </Button>
        <Button
          variant="outline"
          className="flex-1 text-destructive hover:text-destructive"
          onClick={() => setConfirmDeleteOpen(true)}
        >
          Excluir
        </Button>
      </div>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {contract.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              O contrato sai das listagens. O arquivo permanece no Storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

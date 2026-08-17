"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

import { createContract } from "../actions";
import {
  CONTRACT_FORM_DEFAULTS,
  CONTRACT_STATUS_LABELS,
  contractFormSchema,
  type ContractFormInput,
} from "../schema";
import { DealCombobox } from "./DealCombobox";
import { FileUploadDropzone } from "./FileUploadDropzone";

export function ContractForm() {
  const [isSaving, setIsSaving] = useState(false);
  const [clientName, setClientName] = useState<string | null>(null);
  const [dealTitle, setDealTitle] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const form = useForm<ContractFormInput>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: CONTRACT_FORM_DEFAULTS,
  });

  const clientId = useWatch({ control: form.control, name: "clientId" });

  function handleSubmit(values: ContractFormInput) {
    setIsSaving(true);
    createContract(values).then((result) => {
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
      toast.success("Contrato cadastrado.");
      setCreatedId(result.data.id);
    });
  }

  if (createdId) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          Contrato cadastrado. Agora, se quiser, anexe o arquivo.
        </div>

        {uploadedFileName ? (
          <p className="text-sm text-muted-foreground">
            Arquivo enviado: <span className="font-medium">{uploadedFileName}</span>
          </p>
        ) : (
          <FileUploadDropzone
            contractId={createdId}
            onUploaded={(file) => setUploadedFileName(file.name)}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/contratos">Ir para a lista</Link>
          </Button>
          <Button asChild>
            <Link href={`/contratos/${createdId}`}>Ver contrato</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Título *</FormLabel>
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
                <FormLabel>Número do contrato</FormLabel>
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
                  <Input inputMode="decimal" placeholder="0,00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Início da vigência</FormLabel>
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
                <FormLabel>Fim da vigência</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                <FormLabel>Aviso de renovação (dias antes)</FormLabel>
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
              <FormItem className="sm:col-span-2">
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
              <FormItem className="sm:col-span-2">
                <FormLabel>Anotações</FormLabel>
                <FormControl>
                  <Textarea rows={6} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Salvando..." : "Cadastrar contrato"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

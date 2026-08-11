"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDocument, formatPhone, formatZipCode } from "@/lib/format";

import {
  checkDocumentAvailable,
  createClient,
  lookupCep,
  updateClient,
} from "../actions";
import {
  BRAZIL_STATES,
  CLIENT_FORM_DEFAULTS,
  CLIENT_STATUS_LABELS,
  SOURCE_OPTIONS,
  clientFormSchema,
  type ClientFormInput,
} from "../schema";
import { MaskedDigitsInput } from "./MaskedDigitsInput";
import { TagsInput } from "./TagsInput";

const NONE = "__none__";

type Member = { id: string; full_name: string | null };

export function ClientForm({
  mode,
  clientId,
  defaultValues,
  members,
  onSuccess,
}: {
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: ClientFormInput;
  members: Member[];
  onSuccess?: (client: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCheckingCep, setIsCheckingCep] = useState(false);
  const [documentWarning, setDocumentWarning] = useState<string | null>(null);

  const form = useForm<ClientFormInput>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: defaultValues ?? CLIENT_FORM_DEFAULTS,
  });

  const kind = useWatch({ control: form.control, name: "kind" });

  function onSubmit(values: ClientFormInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createClient(values)
          : await updateClient(clientId!, values);

      if (!result.ok) {
        for (const [field, messages] of Object.entries(result.errors)) {
          if (field === "_form") {
            toast.error(messages?.[0] ?? "Não foi possível salvar.");
            continue;
          }
          form.setError(field as keyof ClientFormInput, {
            message: messages?.[0],
          });
        }
        return;
      }

      toast.success(mode === "create" ? "Cliente cadastrado." : "Cliente atualizado.");
      onSuccess?.(result.data);
      if (mode === "create") {
        router.push("/clientes");
      } else {
        router.refresh();
      }
    });
  }

  async function handleCepBlur(rawZipCode: string) {
    const digits = rawZipCode.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setIsCheckingCep(true);
    const result = await lookupCep(digits);
    setIsCheckingCep(false);

    if (!result.ok) {
      toast.error(result.errors.zipCode?.[0] ?? "CEP não encontrado.");
      return;
    }

    form.setValue("street", result.data.street, { shouldDirty: true });
    form.setValue("district", result.data.district, { shouldDirty: true });
    form.setValue("city", result.data.city, { shouldDirty: true });
    form.setValue("state", result.data.state, { shouldDirty: true });
  }

  async function handleDocumentBlur(rawDocument: string) {
    setDocumentWarning(null);
    const digits = rawDocument.replace(/\D/g, "");
    const expectedLength = kind === "pf" ? 11 : 14;
    if (digits.length !== expectedLength) return;

    const result = await checkDocumentAvailable(digits, clientId);
    if (result.ok && !result.data.available) {
      setDocumentWarning(
        "Já existe um cliente com este documento nesta organização.",
      );
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Identificação
          </h3>

          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <FormControl>
                  <RadioGroup
                    className="flex gap-4"
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("document", "");
                      setDocumentWarning(null);
                    }}
                  >
                    <label className="flex items-center gap-2 text-sm font-normal">
                      <RadioGroupItem value="pj" /> Pessoa jurídica
                    </label>
                    <label className="flex items-center gap-2 text-sm font-normal">
                      <RadioGroupItem value="pf" /> Pessoa física
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>
                    {kind === "pf" ? "Nome" : "Razão social"} *
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tradeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome fantasia</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{kind === "pf" ? "CPF" : "CNPJ"}</FormLabel>
                  <FormControl>
                    <MaskedDigitsInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={(e) => {
                        field.onBlur();
                        void handleDocumentBlur(e.target.value);
                      }}
                      format={formatDocument}
                      maxDigits={kind === "pf" ? 11 : 14}
                    />
                  </FormControl>
                  {documentWarning ? (
                    <p className="text-sm text-amber-600 dark:text-amber-500">
                      {documentWarning}
                    </p>
                  ) : null}
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
                      {Object.entries(CLIENT_STATUS_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Contato
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site</FormLabel>
                  <FormControl>
                    <Input placeholder="https://" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <MaskedDigitsInput
                      value={field.value}
                      onChange={field.onChange}
                      format={formatPhone}
                      maxDigits={11}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <MaskedDigitsInput
                      value={field.value}
                      onChange={field.onChange}
                      format={formatPhone}
                      maxDigits={11}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Endereço
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    CEP {isCheckingCep ? "· buscando..." : null}
                  </FormLabel>
                  <FormControl>
                    <MaskedDigitsInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={(e) => {
                        field.onBlur();
                        void handleCepBlur(e.target.value);
                      }}
                      format={formatZipCode}
                      maxDigits={8}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Rua</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="number"
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
              name="complement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UF</FormLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) =>
                      field.onChange(value === NONE ? "" : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {BRAZIL_STATES.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Comercial
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="segment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Segmento</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem</FormLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) =>
                      field.onChange(value === NONE ? "" : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {SOURCE_OPTIONS.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
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
              name="ownerId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Responsável</FormLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) =>
                      field.onChange(value === NONE ? "" : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sem responsável" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sem responsável</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name ?? "Sem nome"}
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
              name="tags"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <TagsInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Digite e pressione Enter"
                    />
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
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea rows={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Salvando..."
              : mode === "create"
                ? "Cadastrar cliente"
                : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

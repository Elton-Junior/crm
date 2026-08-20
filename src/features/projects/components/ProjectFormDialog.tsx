"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ClientCombobox } from "@/features/deals/components/ClientCombobox";
import { MembersMultiSelect } from "@/features/events/components/MembersMultiSelect";
import { firstErrorMessage } from "@/lib/action-errors";
import { cn } from "@/lib/utils";

import { createProject, getProject, updateProject } from "../actions";
import {
  PROJECT_COLOR_OPTIONS,
  PROJECT_FORM_DEFAULTS,
  PROJECT_STATUS_LABELS,
  projectFormSchema,
  type ProjectFormInput,
} from "../schema";

const NONE = "__none__";

type Member = { id: string; full_name: string | null };

/**
 * Um dialog por abertura via `key` no chamador (mesma convenção do
 * EventFormDialog) — evita precisar resetar o form num effect.
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  projectId,
  members,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  members: Member[];
  onSuccess?: (project: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(projectId === null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProjectFormInput>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: PROJECT_FORM_DEFAULTS,
  });

  useEffect(() => {
    if (!projectId) return;

    getProject(projectId).then((result) => {
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível carregar o projeto."));
        onOpenChange(false);
        return;
      }

      const p = result.data;
      form.reset({
        name: p.name,
        description: p.description,
        color: p.color,
        status: p.status,
        clientId: p.clientId,
        ownerId: p.ownerId,
        startsOn: p.startsOn,
        dueOn: p.dueOn,
        memberIds: p.memberIds,
      });
      setClientName(p.clientName);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function handleSubmit(values: ProjectFormInput) {
    setIsSaving(true);
    (async () => {
      const result = projectId
        ? await updateProject(projectId, values)
        : await createProject(values);

      setIsSaving(false);

      if (!result.ok) {
        for (const [field, messages] of Object.entries(result.errors)) {
          if (field === "_form") {
            toast.error(messages?.[0] ?? "Não foi possível salvar.");
            continue;
          }
          form.setError(field as keyof ProjectFormInput, { message: messages?.[0] });
        }
        return;
      }

      toast.success(projectId ? "Projeto atualizado." : "Projeto criado.");
      onOpenChange(false);
      if (!projectId && result.data) onSuccess?.(result.data);
      router.refresh();
    })();
  }

  const isLoading = projectId !== null && !loaded;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{projectId ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {PROJECT_COLOR_OPTIONS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            aria-label={`Cor ${color}`}
                            onClick={() => field.onChange(color)}
                            className={cn(
                              "size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                              field.value === color && "ring-2 ring-foreground",
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
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
                          {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
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
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <Select
                        value={field.value || NONE}
                        onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
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
              </div>

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente vinculado</FormLabel>
                    <FormControl>
                      <ClientCombobox
                        value={field.value}
                        selectedName={clientName}
                        onChange={(client) => {
                          field.onChange(client?.id ?? "");
                          setClientName(client?.name ?? null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startsOn"
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
                  name="dueOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo</FormLabel>
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
                name="memberIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membros</FormLabel>
                    <FormControl>
                      <MembersMultiSelect
                        members={members}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

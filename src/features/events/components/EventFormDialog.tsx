"use client";

import { useEffect, useState } from "react";
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
import { DealCombobox } from "@/features/contracts/components/DealCombobox";
import { ClientCombobox } from "@/features/deals/components/ClientCombobox";
import { firstErrorMessage } from "@/lib/action-errors";
import type { EventConflict } from "@/server/events";

import { checkEventConflict, getEvent } from "../actions";
import { useCreateEvent, useDeleteEvent, useUpdateEvent } from "../hooks";
import {
  EVENT_FORM_DEFAULTS,
  EVENT_KIND_LABELS,
  RECURRENCE_LABELS,
  eventFormSchema,
  rruleToRecurrence,
  type EventFormInput,
} from "../schema";
import { MembersMultiSelect } from "./MembersMultiSelect";

const NONE = "__none__";

type Member = { id: string; full_name: string | null };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDatetimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateOnly(date: Date): string {
  return toDatetimeLocal(date).slice(0, 10);
}

/**
 * Sempre montado com uma `key` nova pelo chamador (ver AgendaPageClient) —
 * um dialog por abertura, criação ou edição. Isso evita precisar de um
 * effect pra "resetar" o form ao reabrir (que dispararia a regra
 * react-hooks/set-state-in-effect, como no ClientEditSheet/DealDetailDialog).
 */
export function EventFormDialog({
  open,
  onOpenChange,
  eventId,
  prefill,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string | null;
  prefill: { start: Date; end: Date; allDay: boolean } | null;
  members: Member[];
}) {
  const [loaded, setLoaded] = useState(eventId === null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [dealTitle, setDealTitle] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<EventConflict[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const form = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: eventId
      ? EVENT_FORM_DEFAULTS
      : {
          ...EVENT_FORM_DEFAULTS,
          allDay: prefill?.allDay ?? false,
          startsAt: prefill
            ? prefill.allDay
              ? toDateOnly(prefill.start)
              : toDatetimeLocal(prefill.start)
            : "",
          endsAt: prefill
            ? prefill.allDay
              ? toDateOnly(prefill.end)
              : toDatetimeLocal(prefill.end)
            : "",
        },
  });

  const allDay = useWatch({ control: form.control, name: "allDay" });
  const clientId = useWatch({ control: form.control, name: "clientId" });
  const isLoading = eventId !== null && !loaded;

  useEffect(() => {
    if (!eventId) return;

    getEvent(eventId).then((result) => {
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível carregar o evento."));
        onOpenChange(false);
        return;
      }

      const ev = result.data;
      form.reset({
        title: ev.title,
        kind: ev.kind,
        startsAt: ev.allDay
          ? toDateOnly(new Date(ev.startsAt))
          : toDatetimeLocal(new Date(ev.startsAt)),
        endsAt: ev.allDay
          ? toDateOnly(new Date(ev.endsAt))
          : toDatetimeLocal(new Date(ev.endsAt)),
        allDay: ev.allDay,
        location: ev.location,
        clientId: ev.clientId,
        dealId: ev.dealId,
        ownerId: ev.ownerId,
        attendeeIds: ev.attendeeIds,
        description: ev.description,
        recurrence: rruleToRecurrence(ev.rrule),
      });
      setClientName(ev.clientName);
      setDealTitle(ev.dealTitle);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function toIso(value: string, isEnd: boolean): string {
    if (!value) return "";
    if (allDay) {
      return new Date(`${value}T${isEnd ? "23:59:59" : "00:00:00"}`).toISOString();
    }
    return new Date(value).toISOString();
  }

  async function handleConflictCheck() {
    const values = form.getValues();
    if (!values.ownerId || !values.startsAt || !values.endsAt) {
      setConflicts([]);
      return;
    }
    const result = await checkEventConflict(
      values.ownerId,
      toIso(values.startsAt, false),
      toIso(values.endsAt, true),
      eventId ?? undefined,
    );
    setConflicts(result.ok ? result.data : []);
  }

  function handleSubmit(values: EventFormInput) {
    const payload: EventFormInput = {
      ...values,
      startsAt: toIso(values.startsAt, false),
      endsAt: toIso(values.endsAt, true),
    };

    if (eventId) {
      updateEvent.mutate(
        { eventId, values: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createEvent.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  function handleDelete() {
    if (!eventId) return;
    deleteEvent.mutate(eventId, {
      onSuccess: () => {
        setConfirmDeleteOpen(false);
        onOpenChange(false);
      },
    });
  }

  const isSaving = createEvent.isPending || updateEvent.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{eventId ? "Editar evento" : "Novo evento"}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  name="kind"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(EVENT_KIND_LABELS).map(([value, label]) => (
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
                  name="allDay"
                  render={({ field }) => (
                    <FormItem>
                      <label className="flex items-center gap-2 text-sm font-normal">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="size-4 rounded border-input"
                        />
                        Dia inteiro
                      </label>
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startsAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início</FormLabel>
                        <FormControl>
                          <Input
                            type={allDay ? "date" : "datetime-local"}
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              void handleConflictCheck();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endsAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim</FormLabel>
                        <FormControl>
                          <Input
                            type={allDay ? "date" : "datetime-local"}
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              void handleConflictCheck();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {conflicts.length > 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    Conflito de horário com &quot;{conflicts[0].title}&quot; do mesmo
                    responsável.
                  </p>
                ) : null}

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local ou link da chamada</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                            form.setValue("dealId", "");
                            setDealTitle(null);
                            if (client && !form.getValues("title")) {
                              form.setValue("title", `Reunião — ${client.name}`);
                            }
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
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <Select
                        value={field.value || NONE}
                        onValueChange={(v) => {
                          field.onChange(v === NONE ? "" : v);
                          void handleConflictCheck();
                        }}
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
                  name="attendeeIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Participantes internos</FormLabel>
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
                  name="recurrence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recorrência</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
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

                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                  {eventId ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDeleteOpen(true)}
                    >
                      Excluir
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              O evento sai da agenda para todos os participantes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEvent.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteEvent.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteEvent.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

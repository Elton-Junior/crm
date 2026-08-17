"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ClientContractsTab } from "@/features/clients/components/ClientContractsTab";
import { ClientTimelineTab } from "@/features/clients/components/ClientTimelineTab";
import { TagsInput } from "@/features/clients/components/TagsInput";
import { firstErrorMessage } from "@/lib/action-errors";
import type { ClientActivity } from "@/server/activities";
import type { ClientContract } from "@/server/contracts";
import type { Board, PipelineStage } from "@/server/deals";

import { getDealDetail, updateDeal } from "../actions";
import { boardKey, useMoveDeal } from "../hooks";
import { positionForIndex } from "../ordering";
import { DEAL_FORM_DEFAULTS, dealFormSchema, type DealFormInput } from "../schema";
import { ClientCombobox } from "./ClientCombobox";
import { LostReasonDialog } from "./LostReasonDialog";

const NONE = "__none__";

type Member = { id: string; full_name: string | null };

export function DealDetailDialog({
  dealId,
  pipelineId,
  stages,
  members,
  onOpenChange,
}: {
  dealId: string | null;
  pipelineId: string;
  stages: PipelineStage[];
  members: Member[];
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const moveDeal = useMoveDeal(pipelineId);

  // Sem estado `isLoading` separado — sincronizar isso via setState direto
  // no corpo do effect dispara a regra react-hooks/set-state-in-effect (ver
  // nota igual no ClientEditSheet). Em vez disso, `isLoading` é derivado:
  // é true sempre que o dialog está aberto e ainda não carregamos os dados
  // deste dealId específico.
  const [loadedDealId, setLoadedDealId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [clientName, setClientName] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [currentStageId, setCurrentStageId] = useState<string | null>(null);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);

  const form = useForm<DealFormInput>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: DEAL_FORM_DEFAULTS,
  });

  const open = dealId !== null;
  const isLoading = open && loadedDealId !== dealId;

  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;

    getDealDetail(dealId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        toast.error(
          firstErrorMessage(result.errors, "Não foi possível carregar a proposta."),
        );
        onOpenChange(false);
        return;
      }

      const { deal, contracts: dealContracts, activities: dealActivities } =
        result.data;
      form.reset({
        title: deal.title,
        clientId: deal.clientId,
        value: deal.valueCents ? (deal.valueCents / 100).toString() : "",
        probability: deal.probability,
        ownerId: deal.ownerId,
        expectedClose: deal.expectedClose,
        description: deal.description,
        tags: deal.tags,
      });
      setClientName(deal.clientName);
      setContracts(dealContracts);
      setActivities(dealActivities);
      setCurrentStageId(deal.stageId);
      setLoadedDealId(dealId);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  function handleSave(values: DealFormInput) {
    if (!dealId) return;
    setIsSaving(true);
    updateDeal(dealId, values).then((result) => {
      setIsSaving(false);
      if (!result.ok) {
        toast.error(firstErrorMessage(result.errors, "Não foi possível salvar."));
        return;
      }
      toast.success("Proposta atualizada.");
      qc.invalidateQueries({ queryKey: boardKey(pipelineId) });
      onOpenChange(false);
    });
  }

  function stageDeals(stageId: string) {
    const board = qc.getQueryData<Board>(boardKey(pipelineId));
    return (board?.dealsByStage[stageId] ?? []).filter((d) => d.id !== dealId);
  }

  const wonStage = stages.find((s) => s.is_won);
  const lostStage = stages.find((s) => s.is_lost);
  const currentStage = stages.find((s) => s.id === currentStageId);

  function handleMarkWon() {
    if (!dealId || !wonStage || !currentStageId) return;
    const dest = stageDeals(wonStage.id);
    moveDeal.mutate(
      {
        dealId,
        fromStageId: currentStageId,
        toStageId: wonStage.id,
        position: positionForIndex(dest, dest.length),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  function handleMarkLost(reason: string) {
    if (!dealId || !lostStage || !currentStageId) return;
    const dest = stageDeals(lostStage.id);
    moveDeal.mutate(
      {
        dealId,
        fromStageId: currentStageId,
        toStageId: lostStage.id,
        position: positionForIndex(dest, dest.length),
        lostReason: reason,
      },
      {
        onSuccess: () => {
          setLostDialogOpen(false);
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isLoading ? "Carregando..." : form.getValues("title") || "Proposta"}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="activities">Atividades</TabsTrigger>
                <TabsTrigger value="contracts">Contratos vinculados</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="pt-4">
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
                        name="expectedClose"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Previsão de fechamento</FormLabel>
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
                      name="probability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Probabilidade — {field.value ?? 0}%</FormLabel>
                          <FormControl>
                            <Slider
                              value={[field.value ?? 0]}
                              onValueChange={([v]) => field.onChange(v)}
                              max={100}
                              step={5}
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
                            onValueChange={(v) =>
                              field.onChange(v === NONE ? "" : v)
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
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea rows={4} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                      <div className="flex gap-2">
                        {currentStage && !currentStage.is_lost && lostStage ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setLostDialogOpen(true)}
                            disabled={moveDeal.isPending}
                          >
                            Marcar como perdida
                          </Button>
                        ) : null}
                        {currentStage && !currentStage.is_won && wonStage ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleMarkWon}
                            disabled={moveDeal.isPending}
                          >
                            Marcar como ganha
                          </Button>
                        ) : null}
                      </div>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="activities" className="pt-4">
                <ClientTimelineTab activities={activities} />
              </TabsContent>

              <TabsContent value="contracts" className="pt-4">
                <ClientContractsTab contracts={contracts} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <LostReasonDialog
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
        isPending={moveDeal.isPending}
        onCancel={() => setLostDialogOpen(false)}
        onConfirm={handleMarkLost}
      />
    </>
  );
}

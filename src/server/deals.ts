import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import * as activitiesService from "./activities";

type Supabase = SupabaseClient<Database>;

export type ClientDeal = {
  id: string;
  title: string;
  value_cents: number;
  status: Database["public"]["Enums"]["deal_status"];
  expected_close: string | null;
  created_at: string;
  stage: {
    name: string;
    color: string;
    is_won: boolean;
    is_lost: boolean;
  } | null;
};

/**
 * Lista de deals de um cliente para a página de detalhe (§7.5). Só leitura —
 * o CRUD completo do Kanban é o item 11 do roadmap.
 */
export async function listByClient(
  supabase: Supabase,
  orgId: string,
  clientId: string,
): Promise<ClientDeal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, title, value_cents, status, expected_close, created_at, stage:pipeline_stages!deals_stage_id_fkey(name, color, is_won, is_lost)",
    )
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ClientDeal[];
}

export type PipelineStage = {
  id: string;
  name: string;
  color: string;
  position: string;
  is_won: boolean;
  is_lost: boolean;
  wip_limit: number | null;
};

export type BoardDeal = {
  id: string;
  title: string;
  value_cents: number;
  currency: string;
  status: Database["public"]["Enums"]["deal_status"];
  probability: number | null;
  expected_close: string | null;
  stage_id: string;
  position: string;
  tags: string[];
  client: { id: string; name: string } | null;
  owner: { id: string; full_name: string | null } | null;
};

export type Board = {
  pipelineId: string;
  stages: PipelineStage[];
  dealsByStage: Record<string, BoardDeal[]>;
};

export async function getDefaultPipelineId(
  supabase: Supabase,
  orgId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("pipelines")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

/** Board completo do Kanban: colunas + cards agrupados (§7.6). */
export async function getBoard(
  supabase: Supabase,
  orgId: string,
  pipelineId: string,
): Promise<Board> {
  const [{ data: stages, error: stagesErr }, { data: deals, error: dealsErr }] =
    await Promise.all([
      supabase
        .from("pipeline_stages")
        .select("id, name, color, position, is_won, is_lost, wip_limit")
        .eq("org_id", orgId)
        .eq("pipeline_id", pipelineId)
        .order("position", { ascending: true }),
      supabase
        .from("deals")
        .select(
          "id, title, value_cents, currency, status, probability, expected_close, stage_id, position, tags, client:clients!deals_client_id_fkey(id, name), owner:profiles!deals_owner_id_fkey(id, full_name)",
        )
        .eq("org_id", orgId)
        .eq("pipeline_id", pipelineId)
        .is("deleted_at", null)
        .order("position", { ascending: true }),
    ]);

  if (stagesErr) throw stagesErr;
  if (dealsErr) throw dealsErr;

  const dealsByStage: Record<string, BoardDeal[]> = {};
  for (const stage of stages ?? []) dealsByStage[stage.id] = [];
  for (const deal of (deals ?? []) as unknown as BoardDeal[]) {
    (dealsByStage[deal.stage_id] ??= []).push(deal);
  }

  return { pipelineId, stages: stages ?? [], dealsByStage };
}

/**
 * Move um card — 1 UPDATE. Se a coluna de destino for terminal (is_won/
 * is_lost), ajusta status/closed_at/lost_reason; caso contrário, reabre o
 * deal (status='open') para não deixar `won`/`lost` obsoleto ao arrastar de
 * volta para uma coluna comum.
 */
export async function move(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    dealId: string;
    toStageId: string;
    position: string;
    lostReason?: string;
  },
) {
  const { data: stage, error: stageErr } = await supabase
    .from("pipeline_stages")
    .select("id, name, is_won, is_lost")
    .eq("id", params.toStageId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (stageErr) throw stageErr;
  if (!stage) return { ok: false as const, error: "Coluna não encontrada." };

  const update: Database["public"]["Tables"]["deals"]["Update"] = {
    stage_id: params.toStageId,
    position: params.position,
  };

  if (stage.is_won) {
    update.status = "won";
    update.closed_at = new Date().toISOString();
    update.lost_reason = null;
  } else if (stage.is_lost) {
    if (!params.lostReason) {
      return { ok: false as const, error: "Informe o motivo da perda." };
    }
    update.status = "lost";
    update.closed_at = new Date().toISOString();
    update.lost_reason = params.lostReason;
  } else {
    update.status = "open";
    update.closed_at = null;
    update.lost_reason = null;
  }

  const { data, error } = await supabase
    .from("deals")
    .update(update)
    .eq("id", params.dealId)
    .eq("org_id", params.orgId)
    .select("id, title, client_id")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Proposta não encontrada." };

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: stage.is_won ? "deal_won" : stage.is_lost ? "deal_lost" : "deal_moved",
    entityType: "deal",
    entityId: data.id,
    clientId: data.client_id,
    payload: { title: data.title, toStage: stage.name },
  });

  return { ok: true as const };
}

export async function moveStage(
  supabase: Supabase,
  params: { orgId: string; stageId: string; position: string },
) {
  const { error } = await supabase
    .from("pipeline_stages")
    .update({ position: params.position })
    .eq("id", params.stageId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function createQuick(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    pipelineId: string;
    stageId: string;
    title: string;
    position: string;
  },
) {
  const { data, error } = await supabase
    .from("deals")
    .insert({
      org_id: params.orgId,
      pipeline_id: params.pipelineId,
      stage_id: params.stageId,
      title: params.title,
      position: params.position,
      created_by: params.actorId,
    })
    .select("id, title, client_id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: "deal_created",
    entityType: "deal",
    entityId: data.id,
    clientId: data.client_id,
    payload: { title: data.title },
  });

  return { ok: true as const, data };
}

/** Colunas do pipeline para o editor em Configurações (§7.9). */
export async function listStages(
  supabase: Supabase,
  orgId: string,
  pipelineId: string,
): Promise<PipelineStage[]> {
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id, name, color, position, is_won, is_lost, wip_limit")
    .eq("org_id", orgId)
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Nova coluna do Kanban — fica em Configurações (§7.9), não no board (item 11). */
export async function createStage(
  supabase: Supabase,
  params: {
    orgId: string;
    pipelineId: string;
    name: string;
    color: string;
    position: string;
  },
) {
  const { data, error } = await supabase
    .from("pipeline_stages")
    .insert({
      org_id: params.orgId,
      pipeline_id: params.pipelineId,
      name: params.name,
      color: params.color,
      position: params.position,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

export async function updateStage(
  supabase: Supabase,
  params: {
    orgId: string;
    stageId: string;
    name?: string;
    color?: string;
    wipLimit?: number | null;
    isWon?: boolean;
    isLost?: boolean;
  },
) {
  const update: Database["public"]["Tables"]["pipeline_stages"]["Update"] = {};
  if (params.name !== undefined) update.name = params.name;
  if (params.color !== undefined) update.color = params.color;
  if (params.wipLimit !== undefined) update.wip_limit = params.wipLimit;
  if (params.isWon !== undefined) update.is_won = params.isWon;
  if (params.isLost !== undefined) update.is_lost = params.isLost;

  const { error } = await supabase
    .from("pipeline_stages")
    .update(update)
    .eq("id", params.stageId)
    .eq("org_id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteStage(
  supabase: Supabase,
  params: { orgId: string; stageId: string },
) {
  const { error } = await supabase
    .from("pipeline_stages")
    .delete()
    .eq("id", params.stageId)
    .eq("org_id", params.orgId);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false as const,
        error: "Mova ou exclua os cards desta coluna antes de excluí-la.",
      };
    }
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

export type DealInput = {
  title: string;
  clientId: string;
  valueCents: number;
  probability: number | null;
  ownerId: string;
  expectedClose: string;
  description: string;
  tags: string[];
};

export type DealDetail = DealInput & {
  id: string;
  stageId: string;
  status: Database["public"]["Enums"]["deal_status"];
  clientName: string | null;
};

/** Deal completo para o dialog de detalhe (§7.6, aba "Detalhes"). */
export async function getById(
  supabase: Supabase,
  orgId: string,
  dealId: string,
): Promise<DealDetail | null> {
  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, title, client_id, value_cents, probability, owner_id, expected_close, description, tags, stage_id, status, client:clients!deals_client_id_fkey(name)",
    )
    .eq("id", dealId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const client = data.client as unknown as { name: string } | null;

  return {
    id: data.id,
    title: data.title,
    clientId: data.client_id ?? "",
    clientName: client?.name ?? null,
    valueCents: data.value_cents,
    probability: data.probability,
    ownerId: data.owner_id ?? "",
    expectedClose: data.expected_close ?? "",
    description: data.description ?? "",
    tags: data.tags ?? [],
    stageId: data.stage_id,
    status: data.status,
  };
}

/**
 * Atualiza os campos "de conteúdo" do deal (não mexe em stage/status —
 * isso é papel de move(), acionado pelo drag ou pelos botões
 * ganhar/perder). Sem log de activity: não há um `deal_updated` no enum
 * `activity_kind` (só create/moved/won/lost), e inventar um valor novo
 * exigiria alterar a migration — fora do escopo deste item.
 */
export async function update(
  supabase: Supabase,
  params: { orgId: string; dealId: string; input: DealInput },
) {
  const { data, error } = await supabase
    .from("deals")
    .update({
      title: params.input.title,
      client_id: params.input.clientId || null,
      value_cents: params.input.valueCents,
      probability: params.input.probability,
      owner_id: params.input.ownerId || null,
      expected_close: params.input.expectedClose || null,
      description: params.input.description || null,
      tags: params.input.tags,
    })
    .eq("id", params.dealId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Proposta não encontrada." };
  return { ok: true as const };
}

/** Busca leve para o combobox "Proposta vinculada" do cadastro de contrato (§7.7). */
export async function searchByClient(
  supabase: Supabase,
  orgId: string,
  clientId: string,
  query: string,
  limit = 10,
) {
  let request = supabase
    .from("deals")
    .select("id, title")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  const term = query.trim();
  if (term) request = request.ilike("title", `%${term}%`);

  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import * as activitiesService from "./activities";

type Supabase = SupabaseClient<Database>;
type ContractStatus = Database["public"]["Enums"]["contract_status"];

export const PAGE_SIZE = 25;
const BUCKET = "contracts";

export type ClientContract = {
  id: string;
  title: string;
  status: Database["public"]["Enums"]["contract_status"];
  value_cents: number;
  end_date: string | null;
  created_at: string;
};

/**
 * Lista de contratos de um cliente para a página de detalhe (§7.5). Só
 * leitura — cadastro, upload e viewer são os itens 13-14 do roadmap.
 */
export async function listByClient(
  supabase: Supabase,
  orgId: string,
  clientId: string,
): Promise<ClientContract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("id, title, status, value_cents, end_date, created_at")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export type ContractListItem = {
  id: string;
  title: string;
  contract_no: string | null;
  status: ContractStatus;
  value_cents: number;
  start_date: string | null;
  end_date: string | null;
  tags: string[];
  created_at: string;
  client: { id: string; name: string } | null;
};

export type ContractListFilters = {
  search?: string;
  status?: ContractStatus;
  clientId?: string;
  tag?: string;
  page: number;
  sort: "title" | "end_date" | "created_at";
  dir: "asc" | "desc";
};

function sanitizeOrTerm(term: string): string {
  return term.replace(/[,()"]/g, " ").trim();
}

export async function list(
  supabase: Supabase,
  orgId: string,
  filters: ContractListFilters,
) {
  let query = supabase
    .from("contracts")
    .select(
      "id, title, contract_no, status, value_cents, start_date, end_date, tags, created_at, client:clients!contracts_client_id_fkey(id, name)",
      { count: "exact" },
    )
    .eq("org_id", orgId)
    .is("deleted_at", null);

  const search = filters.search ? sanitizeOrTerm(filters.search) : "";
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,contract_no.ilike.%${search}%`,
    );
  }

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);
  if (filters.tag) query = query.contains("tags", [filters.tag]);

  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await query
    .order(filters.sort, { ascending: filters.dir === "asc" })
    .range(from, to);

  if (error) throw error;

  return {
    contracts: (data ?? []) as unknown as ContractListItem[],
    total: count ?? 0,
  };
}

export type ContractInput = {
  title: string;
  contractNo: string;
  clientId: string;
  dealId: string;
  status: ContractStatus;
  valueCents: number;
  startDate: string;
  endDate: string;
  signedAt: string;
  renewalNoticeDays: number | null;
  notes: string;
  tags: string[];
};

export type ContractDetail = ContractInput & {
  id: string;
  clientName: string | null;
  dealTitle: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileMime: string | null;
};

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

export async function getById(
  supabase: Supabase,
  orgId: string,
  id: string,
): Promise<ContractDetail | null> {
  const { data, error } = await supabase
    .from("contracts")
    .select(
      "id, title, contract_no, client_id, deal_id, status, value_cents, start_date, end_date, signed_at, renewal_notice_days, notes, tags, file_path, file_name, file_size, file_mime, client:clients!contracts_client_id_fkey(name), deal:deals!contracts_deal_id_fkey(title)",
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const client = data.client as unknown as { name: string } | null;
  const deal = data.deal as unknown as { title: string } | null;

  return {
    id: data.id,
    title: data.title,
    contractNo: data.contract_no ?? "",
    clientId: data.client_id ?? "",
    clientName: client?.name ?? null,
    dealId: data.deal_id ?? "",
    dealTitle: deal?.title ?? null,
    status: data.status,
    valueCents: data.value_cents,
    startDate: data.start_date ?? "",
    endDate: data.end_date ?? "",
    signedAt: data.signed_at ?? "",
    renewalNoticeDays: data.renewal_notice_days,
    notes: data.notes ?? "",
    tags: data.tags ?? [],
    filePath: data.file_path,
    fileName: data.file_name,
    fileSize: data.file_size,
    fileMime: data.file_mime,
  };
}

function toRow(input: ContractInput) {
  return {
    title: input.title,
    contract_no: emptyToNull(input.contractNo),
    client_id: input.clientId || null,
    deal_id: input.dealId || null,
    status: input.status,
    value_cents: input.valueCents,
    start_date: emptyToNull(input.startDate),
    end_date: emptyToNull(input.endDate),
    signed_at: emptyToNull(input.signedAt),
    renewal_notice_days: input.renewalNoticeDays,
    notes: emptyToNull(input.notes),
    tags: input.tags,
  };
}

export async function create(
  supabase: Supabase,
  params: { orgId: string; actorId: string; input: ContractInput },
) {
  const { data, error } = await supabase
    .from("contracts")
    .insert({ ...toRow(params.input), org_id: params.orgId, created_by: params.actorId })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

/**
 * Atualiza metadados. Se `status` mudou, loga `contract_status_changed`
 * (é o único evento do enum `activity_kind` que cobre uma edição de
 * contrato — demais campos não têm um kind próprio, então não geram log).
 */
export async function update(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    contractId: string;
    input: ContractInput;
  },
) {
  const { data: before, error: beforeErr } = await supabase
    .from("contracts")
    .select("status, title")
    .eq("id", params.contractId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (beforeErr) return { ok: false as const, error: beforeErr.message };
  if (!before) return { ok: false as const, error: "Contrato não encontrado." };

  const { data, error } = await supabase
    .from("contracts")
    .update(toRow(params.input))
    .eq("id", params.contractId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Contrato não encontrado." };

  if (before.status !== params.input.status) {
    await activitiesService.log(supabase, {
      orgId: params.orgId,
      actorId: params.actorId,
      kind: "contract_status_changed",
      entityType: "contract",
      entityId: data.id,
      payload: { title: before.title, from: before.status, to: params.input.status },
    });
  }

  return { ok: true as const, data };
}

export async function softDelete(
  supabase: Supabase,
  params: { orgId: string; contractId: string },
) {
  const { data, error } = await supabase
    .from("contracts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.contractId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Contrato não encontrado." };
  return { ok: true as const };
}

/** Duplica os metadados como um novo rascunho — o arquivo NÃO é copiado. */
export async function duplicate(
  supabase: Supabase,
  params: { orgId: string; actorId: string; contractId: string },
) {
  const original = await getById(supabase, params.orgId, params.contractId);
  if (!original) return { ok: false as const, error: "Contrato não encontrado." };

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      org_id: params.orgId,
      created_by: params.actorId,
      title: `${original.title} (cópia)`,
      contract_no: null,
      client_id: original.clientId || null,
      deal_id: original.dealId || null,
      status: "draft",
      value_cents: original.valueCents,
      start_date: emptyToNull(original.startDate),
      end_date: emptyToNull(original.endDate),
      renewal_notice_days: original.renewalNoticeDays,
      notes: emptyToNull(original.notes),
      tags: original.tags,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    // remove diacríticos combinantes (ex.: "é" -> "e") após normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function createUploadUrl(
  supabase: Supabase,
  params: { orgId: string; contractId: string; fileName: string },
) {
  const path = `${params.orgId}/${params.contractId}/${slugify(params.fileName)}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: { path, token: data.token, signedUrl: data.signedUrl } };
}

export async function confirmUpload(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    contractId: string;
    path: string;
    fileName: string;
    size: number;
    mime: string;
  },
) {
  const { data, error } = await supabase
    .from("contracts")
    .update({
      file_path: params.path,
      file_name: params.fileName,
      file_size: params.size,
      file_mime: params.mime,
    })
    .eq("id", params.contractId)
    .eq("org_id", params.orgId)
    .select("id, title")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Contrato não encontrado." };

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: "contract_uploaded",
    entityType: "contract",
    entityId: data.id,
    payload: { title: data.title, fileName: params.fileName },
  });

  return { ok: true as const };
}

export async function getSignedViewUrl(
  supabase: Supabase,
  params: { orgId: string; contractId: string },
): Promise<{ url: string; mime: string; fileName: string } | null> {
  const { data: contract, error: contractErr } = await supabase
    .from("contracts")
    .select("file_path, file_name, file_mime")
    .eq("id", params.contractId)
    .eq("org_id", params.orgId)
    .maybeSingle();

  if (contractErr) throw contractErr;
  if (!contract?.file_path) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(contract.file_path, 60);

  if (error) throw error;

  return {
    url: data.signedUrl,
    mime: contract.file_mime ?? "application/octet-stream",
    fileName: contract.file_name ?? "arquivo",
  };
}

/** Contratos vinculados a uma proposta (aba "Contratos vinculados" do dialog de detalhe do deal, §7.6). */
export async function listByDeal(
  supabase: Supabase,
  orgId: string,
  dealId: string,
): Promise<ClientContract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("id, title, status, value_cents, end_date, created_at")
    .eq("org_id", orgId)
    .eq("deal_id", dealId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

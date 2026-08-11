import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import * as activitiesService from "./activities";

type Supabase = SupabaseClient<Database>;
type ClientStatus = Database["public"]["Enums"]["client_status"];

export const PAGE_SIZE = 25;

export type ClientListItem = {
  id: string;
  kind: Database["public"]["Enums"]["client_kind"];
  name: string;
  trade_name: string | null;
  document: string | null;
  status: ClientStatus;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  owner_id: string | null;
  created_at: string;
  owner: { id: string; full_name: string | null } | null;
};

export type ClientListFilters = {
  search?: string;
  status?: ClientStatus;
  ownerId?: string;
  tag?: string;
  page: number;
  sort: "name" | "created_at" | "status";
  dir: "asc" | "desc";
};

/**
 * Sanitiza um termo antes de usá-lo dentro de `.or()` do PostgREST — vírgula,
 * parênteses e aspas têm significado sintático nesse mini-DSL e quebrariam
 * (ou permitiriam injetar) outras condições do filtro.
 */
function sanitizeOrTerm(term: string): string {
  return term.replace(/[,()"]/g, " ").trim();
}

export async function list(
  supabase: Supabase,
  orgId: string,
  filters: ClientListFilters,
) {
  let query = supabase
    .from("clients")
    .select(
      "id, kind, name, trade_name, document, status, email, phone, whatsapp, owner_id, created_at, owner:profiles!clients_owner_id_fkey(id, full_name)",
      { count: "exact" },
    )
    .eq("org_id", orgId)
    .is("deleted_at", null);

  const search = filters.search ? sanitizeOrTerm(filters.search) : "";
  if (search) {
    const digits = search.replace(/\D/g, "");
    const orParts = [`name.ilike.%${search}%`, `email.ilike.%${search}%`];
    if (digits) orParts.push(`document.ilike.%${digits}%`);
    query = query.or(orParts.join(","));
  }

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.tag) query = query.contains("tags", [filters.tag]);

  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await query
    .order(filters.sort, { ascending: filters.dir === "asc" })
    .range(from, to);

  if (error) throw error;

  return {
    clients: (data ?? []) as unknown as ClientListItem[],
    total: count ?? 0,
  };
}

export async function listMembers(supabase: Supabase, orgId: string) {
  const { data, error } = await supabase
    .from("memberships")
    .select("profile:profiles!memberships_user_id_fkey(id, full_name)")
    .eq("org_id", orgId);

  if (error) throw error;

  return (data ?? [])
    .map((m) => m.profile)
    .filter((p): p is { id: string; full_name: string | null } => p !== null);
}

export type ClientInput = {
  kind: Database["public"]["Enums"]["client_kind"];
  name: string;
  tradeName: string;
  document: string;
  status: ClientStatus;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  segment: string;
  source: string;
  ownerId: string;
  tags: string[];
  notes: string;
};

export type ClientDetail = ClientInput & { id: string };

const DUPLICATE_DOCUMENT_ERROR = {
  document: ["Já existe um cliente com este documento nesta organização."],
};

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

function toRow(input: ClientInput) {
  return {
    kind: input.kind,
    name: input.name,
    trade_name: emptyToNull(input.tradeName),
    document: emptyToNull(input.document),
    status: input.status,
    email: emptyToNull(input.email),
    phone: emptyToNull(input.phone),
    whatsapp: emptyToNull(input.whatsapp),
    website: emptyToNull(input.website),
    zip_code: emptyToNull(input.zipCode),
    street: emptyToNull(input.street),
    number: emptyToNull(input.number),
    complement: emptyToNull(input.complement),
    district: emptyToNull(input.district),
    city: emptyToNull(input.city),
    state: emptyToNull(input.state),
    segment: emptyToNull(input.segment),
    source: emptyToNull(input.source),
    owner_id: input.ownerId || null,
    tags: input.tags,
    notes: emptyToNull(input.notes),
  };
}

export async function create(
  supabase: Supabase,
  params: { orgId: string; actorId: string; input: ClientInput },
) {
  const { data, error } = await supabase
    .from("clients")
    .insert({ ...toRow(params.input), org_id: params.orgId, created_by: params.actorId })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, errors: DUPLICATE_DOCUMENT_ERROR };
    }
    return { ok: false as const, errors: { _form: [error.message] } };
  }

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: "client_created",
    entityType: "client",
    entityId: data.id,
    clientId: data.id,
    payload: { name: data.name },
  });

  return { ok: true as const, data };
}

export async function update(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    clientId: string;
    input: ClientInput;
  },
) {
  const { data, error } = await supabase
    .from("clients")
    .update(toRow(params.input))
    .eq("id", params.clientId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select("id, name")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, errors: DUPLICATE_DOCUMENT_ERROR };
    }
    return { ok: false as const, errors: { _form: [error.message] } };
  }
  if (!data) {
    return { ok: false as const, errors: { _form: ["Cliente não encontrado."] } };
  }

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: "client_updated",
    entityType: "client",
    entityId: data.id,
    clientId: data.id,
    payload: { name: data.name },
  });

  return { ok: true as const, data };
}

export async function getById(
  supabase: Supabase,
  orgId: string,
  id: string,
): Promise<ClientDetail | null> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, kind, name, trade_name, document, status, email, phone, whatsapp, website, zip_code, street, number, complement, district, city, state, segment, source, owner_id, tags, notes",
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    kind: data.kind,
    name: data.name,
    tradeName: data.trade_name ?? "",
    document: data.document ?? "",
    status: data.status,
    email: data.email ?? "",
    phone: data.phone ?? "",
    whatsapp: data.whatsapp ?? "",
    website: data.website ?? "",
    zipCode: data.zip_code ?? "",
    street: data.street ?? "",
    number: data.number ?? "",
    complement: data.complement ?? "",
    district: data.district ?? "",
    city: data.city ?? "",
    state: data.state ?? "",
    segment: data.segment ?? "",
    source: data.source ?? "",
    ownerId: data.owner_id ?? "",
    tags: data.tags ?? [],
    notes: data.notes ?? "",
  };
}

export async function documentExists(
  supabase: Supabase,
  params: { orgId: string; document: string; excludeId?: string },
): Promise<boolean> {
  if (!params.document) return false;

  let query = supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("org_id", params.orgId)
    .eq("document", params.document)
    .is("deleted_at", null);

  if (params.excludeId) query = query.neq("id", params.excludeId);

  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function softDelete(
  supabase: Supabase,
  params: { orgId: string; clientId: string; actorId: string },
) {
  const { data, error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.clientId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .select("id, name")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: "Cliente não encontrado." };

  await activitiesService.log(supabase, {
    orgId: params.orgId,
    actorId: params.actorId,
    kind: "client_updated",
    entityType: "client",
    entityId: data.id,
    clientId: data.id,
    payload: { action: "deleted", name: data.name },
  });

  return { ok: true as const };
}

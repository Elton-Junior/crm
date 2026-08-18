import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database";

type Supabase = SupabaseClient<Database>;
type ActivityKind = Database["public"]["Enums"]["activity_kind"];

export async function log(
  supabase: Supabase,
  params: {
    orgId: string;
    actorId: string;
    kind: ActivityKind;
    entityType: string;
    entityId: string;
    clientId?: string | null;
    payload?: { [key: string]: Json | undefined };
  },
) {
  const { error } = await supabase.from("activities").insert({
    org_id: params.orgId,
    actor_id: params.actorId,
    kind: params.kind,
    entity_type: params.entityType,
    entity_id: params.entityId,
    client_id: params.clientId ?? null,
    payload: params.payload ?? {},
  });

  if (error) throw error;
}

export type ClientActivity = {
  id: string;
  kind: ActivityKind;
  entity_type: string;
  entity_id: string;
  payload: Json;
  created_at: string;
  actor: { id: string; full_name: string | null } | null;
};

/** Timeline de um cliente, mais recente primeiro (§7.5). */
export async function listByClient(
  supabase: Supabase,
  orgId: string,
  clientId: string,
  limit = 30,
): Promise<ClientActivity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select(
      "id, kind, entity_type, entity_id, payload, created_at, actor:profiles!activities_actor_id_fkey(id, full_name)",
    )
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as ClientActivity[];
}

/** Timeline de qualquer entidade (ex.: aba "Atividades" do dialog de detalhe do deal). */
export async function listByEntity(
  supabase: Supabase,
  orgId: string,
  entityType: string,
  entityId: string,
  limit = 30,
): Promise<ClientActivity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select(
      "id, kind, entity_type, entity_id, payload, created_at, actor:profiles!activities_actor_id_fkey(id, full_name)",
    )
    .eq("org_id", orgId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as ClientActivity[];
}

/** Feed de atividade recente da org inteira (Dashboard, item 16). */
export async function listRecent(
  supabase: Supabase,
  orgId: string,
  limit = 15,
): Promise<ClientActivity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select(
      "id, kind, entity_type, entity_id, payload, created_at, actor:profiles!activities_actor_id_fkey(id, full_name)",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as ClientActivity[];
}

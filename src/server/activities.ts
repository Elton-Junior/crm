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

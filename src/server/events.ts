import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type ClientEvent = {
  id: string;
  title: string;
  kind: Database["public"]["Enums"]["event_kind"];
  status: string;
  starts_at: string;
  ends_at: string;
};

/**
 * Lista de eventos de um cliente para a página de detalhe (§7.5). Só
 * leitura — o calendário completo é o item 15 do roadmap.
 */
export async function listByClient(
  supabase: Supabase,
  orgId: string,
  clientId: string,
): Promise<ClientEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, kind, status, starts_at, ends_at")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

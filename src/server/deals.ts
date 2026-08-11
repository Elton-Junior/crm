import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

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

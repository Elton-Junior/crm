import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

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

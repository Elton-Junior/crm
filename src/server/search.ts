import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

function sanitizeTerm(term: string): string {
  return term.replace(/[,()"]/g, " ").trim();
}

export type SearchHit = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

export type GlobalSearchResult = {
  clients: SearchHit[];
  deals: SearchHit[];
  contracts: SearchHit[];
};

/** Busca leve para a paleta de comando (⌘K) — §7.2, item 18 do roadmap. */
export async function globalSearch(
  supabase: Supabase,
  orgId: string,
  query: string,
  limitPerGroup = 5,
): Promise<GlobalSearchResult> {
  const term = sanitizeTerm(query);
  if (!term) return { clients: [], deals: [], contracts: [] };

  const [clientsRes, dealsRes, contractsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .ilike("name", `%${term}%`)
      .order("name", { ascending: true })
      .limit(limitPerGroup),
    supabase
      .from("deals")
      .select("id, title, client:clients!deals_client_id_fkey(name)")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .ilike("title", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(limitPerGroup),
    supabase
      .from("contracts")
      .select("id, title, client:clients!contracts_client_id_fkey(name)")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .ilike("title", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(limitPerGroup),
  ]);

  if (clientsRes.error) throw clientsRes.error;
  if (dealsRes.error) throw dealsRes.error;
  if (contractsRes.error) throw contractsRes.error;

  return {
    clients: (clientsRes.data ?? []).map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: null,
      href: `/clientes/${c.id}`,
    })),
    deals: (dealsRes.data ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      subtitle: (d.client as unknown as { name: string } | null)?.name ?? null,
      href: `/propostas?deal=${d.id}`,
    })),
    contracts: (contractsRes.data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: (c.client as unknown as { name: string } | null)?.name ?? null,
      href: `/contratos/${c.id}`,
    })),
  };
}

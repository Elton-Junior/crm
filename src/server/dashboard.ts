import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type FunnelStage = {
  stageId: string;
  name: string;
  color: string;
  count: number;
  valueCents: number;
};

export type DashboardSummary = {
  wonValue: number;
  wonCount: number;
  lostCount: number;
  openValue: number;
  openCount: number;
  newClients: number;
  conversionRate: number;
  funnel: FunnelStage[];
};

type RpcResult = {
  won_value: number;
  won_count: number;
  lost_count: number;
  open_value: number;
  open_count: number;
  new_clients: number;
  conversion_rate: number;
  funnel:
    | { stage_id: string; name: string; color: string; count: number; value_cents: number }[]
    | null;
};

/** Wrapper tipado da RPC dashboard_summary (§7.4 — evita 8 round-trips). */
export async function getSummary(
  supabase: Supabase,
  orgId: string,
  from: string,
  to: string,
): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc("dashboard_summary", {
    p_org: orgId,
    p_from: from,
    p_to: to,
  });

  if (error) throw error;
  const raw = data as unknown as RpcResult;

  return {
    wonValue: raw.won_value,
    wonCount: raw.won_count,
    lostCount: raw.lost_count,
    openValue: raw.open_value,
    openCount: raw.open_count,
    newClients: raw.new_clients,
    conversionRate: raw.conversion_rate,
    funnel: (raw.funnel ?? []).map((f) => ({
      stageId: f.stage_id,
      name: f.name,
      color: f.color,
      count: f.count,
      valueCents: f.value_cents,
    })),
  };
}

export type MonthlyRevenue = { month: string; valueCents: number };

/** Receita ganha por mês, últimos 12 meses (linha 2 do Dashboard, §7.4). */
export async function getRevenueByMonth(
  supabase: Supabase,
  orgId: string,
): Promise<MonthlyRevenue[]> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const { data, error } = await supabase
    .from("deals")
    .select("value_cents, closed_at")
    .eq("org_id", orgId)
    .eq("status", "won")
    .is("deleted_at", null)
    .gte("closed_at", from.toISOString());

  if (error) throw error;

  const buckets = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }

  for (const row of data ?? []) {
    if (!row.closed_at) continue;
    const d = new Date(row.closed_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + row.value_cents);
    }
  }

  return Array.from(buckets.entries()).map(([month, valueCents]) => ({ month, valueCents }));
}

export type UpcomingEvent = {
  id: string;
  title: string;
  starts_at: string;
  client: { id: string; name: string } | null;
};

/** Próximas reuniões nos próximos `days` dias (lista acionável, §7.4). */
export async function getUpcomingEvents(
  supabase: Supabase,
  orgId: string,
  days = 7,
): Promise<UpcomingEvent[]> {
  const now = new Date();
  const to = new Date(now.getTime() + days * 86400_000);

  const { data, error } = await supabase
    .from("events")
    .select("id, title, starts_at, client:clients!events_client_id_fkey(id, name)")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at", { ascending: true })
    .limit(8);

  if (error) throw error;
  return (data ?? []) as unknown as UpcomingEvent[];
}

export type StaleDeal = {
  id: string;
  title: string;
  value_cents: number;
  updated_at: string;
  client: { id: string; name: string } | null;
};

/**
 * Propostas abertas sem atualização há mais de 14 dias — "o widget mais
 * valioso do dashboard" (§7.4).
 */
export async function getStaleDeals(
  supabase: Supabase,
  orgId: string,
): Promise<StaleDeal[]> {
  const threshold = new Date(Date.now() - 14 * 86400_000);

  const { data, error } = await supabase
    .from("deals")
    .select("id, title, value_cents, updated_at, client:clients!deals_client_id_fkey(id, name)")
    .eq("org_id", orgId)
    .eq("status", "open")
    .is("deleted_at", null)
    .lt("updated_at", threshold.toISOString())
    .order("updated_at", { ascending: true })
    .limit(8);

  if (error) throw error;
  return (data ?? []) as unknown as StaleDeal[];
}

export type ExpiringContract = {
  id: string;
  title: string;
  end_date: string;
  client: { id: string; name: string } | null;
};

/** Contratos ativos vencendo nos próximos `days` dias (§7.4). */
export async function getExpiringContracts(
  supabase: Supabase,
  orgId: string,
  days = 60,
): Promise<ExpiringContract[]> {
  const now = new Date();
  const to = new Date(now.getTime() + days * 86400_000);

  const { data, error } = await supabase
    .from("contracts")
    .select("id, title, end_date, client:clients!contracts_client_id_fkey(id, name)")
    .eq("org_id", orgId)
    .eq("status", "active")
    .is("deleted_at", null)
    .not("end_date", "is", null)
    .lte("end_date", to.toISOString().slice(0, 10))
    .gte("end_date", now.toISOString().slice(0, 10))
    .order("end_date", { ascending: true })
    .limit(8);

  if (error) throw error;
  return (data ?? []) as unknown as ExpiringContract[];
}

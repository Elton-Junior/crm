import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

export type OrganizationDetail = {
  id: string;
  name: string;
  logoUrl: string;
  timezone: string;
  currency: string;
};

export async function getOrganization(
  supabase: Supabase,
  orgId: string,
): Promise<OrganizationDetail | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, logo_url, timezone, currency")
    .eq("id", orgId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    logoUrl: data.logo_url ?? "",
    timezone: data.timezone,
    currency: data.currency,
  };
}

/** Só owner/admin — RLS (`org_update`) já garante isso no banco; o
 * requireRole() na Server Action garante uma mensagem amigável antes disso. */
export async function updateOrganization(
  supabase: Supabase,
  params: { orgId: string; name: string; logoUrl: string; timezone: string; currency: string },
) {
  const { error } = await supabase
    .from("organizations")
    .update({
      name: params.name,
      logo_url: params.logoUrl || null,
      timezone: params.timezone,
      currency: params.currency,
    })
    .eq("id", params.orgId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

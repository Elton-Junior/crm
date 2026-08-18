"use server";

import { requireOrg } from "@/lib/auth";
import * as searchService from "@/server/search";

export async function globalSearch(query: string) {
  const { supabase, orgId } = await requireOrg();
  const results = await searchService.globalSearch(supabase, orgId, query);
  return { ok: true as const, data: results };
}

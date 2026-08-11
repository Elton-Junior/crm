import "server-only";

import { requireOrg } from "@/lib/auth";
import * as clientsService from "@/server/clients";

import { clientListParamsSchema } from "./schema";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function getClientsList(rawParams: RawSearchParams) {
  const params = clientListParamsSchema.parse({
    q: first(rawParams.q),
    status: first(rawParams.status),
    ownerId: first(rawParams.ownerId),
    tag: first(rawParams.tag),
    page: first(rawParams.page),
    sort: first(rawParams.sort),
    dir: first(rawParams.dir),
  });

  const { supabase, orgId } = await requireOrg();

  const [{ clients, total }, members] = await Promise.all([
    clientsService.list(supabase, orgId, {
      search: params.q,
      status: params.status,
      ownerId: params.ownerId,
      tag: params.tag,
      page: params.page,
      sort: params.sort,
      dir: params.dir,
    }),
    clientsService.listMembers(supabase, orgId),
  ]);

  return {
    clients,
    total,
    pageSize: clientsService.PAGE_SIZE,
    members,
    params,
    hasFilters: Boolean(
      params.q || params.status || params.ownerId || params.tag,
    ),
  };
}

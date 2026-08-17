import "server-only";

import { notFound } from "next/navigation";

import { requireOrg } from "@/lib/auth";
import * as activitiesService from "@/server/activities";
import * as clientsService from "@/server/clients";
import * as contractsService from "@/server/contracts";

import { contractListParamsSchema } from "./schema";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function getContractsList(rawParams: RawSearchParams) {
  const params = contractListParamsSchema.parse({
    q: first(rawParams.q),
    status: first(rawParams.status),
    clientId: first(rawParams.clientId),
    tag: first(rawParams.tag),
    page: first(rawParams.page),
    sort: first(rawParams.sort),
    dir: first(rawParams.dir),
  });

  const { supabase, orgId } = await requireOrg();

  const [{ contracts, total }, members] = await Promise.all([
    contractsService.list(supabase, orgId, {
      search: params.q,
      status: params.status,
      clientId: params.clientId,
      tag: params.tag,
      page: params.page,
      sort: params.sort,
      dir: params.dir,
    }),
    clientsService.listMembers(supabase, orgId),
  ]);

  return {
    contracts,
    total,
    pageSize: contractsService.PAGE_SIZE,
    members,
    params,
    hasFilters: Boolean(params.q || params.status || params.clientId || params.tag),
  };
}

export async function getContractDetail(contractId: string) {
  const { supabase, orgId } = await requireOrg();

  const contract = await contractsService.getById(supabase, orgId, contractId);
  if (!contract) notFound();

  const [activities, file] = await Promise.all([
    activitiesService.listByEntity(supabase, orgId, "contract", contractId),
    contractsService.getSignedViewUrl(supabase, { orgId, contractId }),
  ]);

  return { contract, activities, file };
}

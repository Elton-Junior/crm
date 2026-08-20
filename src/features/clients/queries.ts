import "server-only";

import { notFound } from "next/navigation";

import { requireOrg } from "@/lib/auth";
import * as activitiesService from "@/server/activities";
import * as clientsService from "@/server/clients";
import * as contractsService from "@/server/contracts";
import * as dealsService from "@/server/deals";
import * as eventsService from "@/server/events";
import * as projectsService from "@/server/projects";

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

export async function getClientDetail(clientId: string) {
  const { supabase, orgId } = await requireOrg();

  const client = await clientsService.getById(supabase, orgId, clientId);
  if (!client) notFound();

  const [deals, contracts, events, activities, members, projects] = await Promise.all([
    dealsService.listByClient(supabase, orgId, clientId),
    contractsService.listByClient(supabase, orgId, clientId),
    eventsService.listByClient(supabase, orgId, clientId),
    activitiesService.listByClient(supabase, orgId, clientId),
    clientsService.listMembers(supabase, orgId),
    projectsService.listByClient(supabase, orgId, clientId),
  ]);

  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.ends_at) >= now);
  const pastEvents = [...events]
    .filter((e) => new Date(e.ends_at) < now)
    .reverse();

  const wonValueCents = deals
    .filter((d) => d.status === "won")
    .reduce((sum, d) => sum + d.value_cents, 0);
  const openDealsCount = deals.filter((d) => d.status === "open").length;
  const owner = members.find((m) => m.id === client.ownerId) ?? null;

  return {
    client,
    deals,
    contracts,
    projects,
    events: { upcoming: upcomingEvents, past: pastEvents },
    activities,
    members,
    summary: {
      wonValueCents,
      openDealsCount,
      nextEvent: upcomingEvents[0] ?? null,
      owner,
    },
  };
}

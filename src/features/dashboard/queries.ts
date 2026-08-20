import "server-only";

import { requireOrg } from "@/lib/auth";
import * as activitiesService from "@/server/activities";
import * as dashboardService from "@/server/dashboard";
import * as tasksService from "@/server/tasks";

import { dashboardParamsSchema, resolvePeriodRange } from "./schema";

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function getDashboardData(rawParams: RawSearchParams) {
  const params = dashboardParamsSchema.parse({
    period: first(rawParams.period),
    from: first(rawParams.from),
    to: first(rawParams.to),
  });

  const { from, to } = resolvePeriodRange(params);

  // Período anterior de mesma duração, pra comparação (§7.4 "delta % vs.
  // período anterior").
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);

  const { supabase, user, orgId } = await requireOrg();

  const [
    summary,
    prevSummary,
    revenue,
    upcomingEvents,
    staleDeals,
    expiringContracts,
    recentActivities,
    overdueTasksCount,
  ] = await Promise.all([
    dashboardService.getSummary(supabase, orgId, from.toISOString(), to.toISOString()),
    dashboardService.getSummary(
      supabase,
      orgId,
      prevFrom.toISOString(),
      prevTo.toISOString(),
    ),
    dashboardService.getRevenueByMonth(supabase, orgId),
    dashboardService.getUpcomingEvents(supabase, orgId),
    dashboardService.getStaleDeals(supabase, orgId),
    dashboardService.getExpiringContracts(supabase, orgId),
    activitiesService.listRecent(supabase, orgId),
    tasksService.countOverdue(supabase, orgId, user.id),
  ]);

  return {
    params,
    range: { from, to },
    summary,
    prevSummary,
    revenue,
    upcomingEvents,
    staleDeals,
    expiringContracts,
    recentActivities,
    overdueTasksCount,
  };
}

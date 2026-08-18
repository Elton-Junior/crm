import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientTimelineTab } from "@/features/clients/components/ClientTimelineTab";
import {
  ExpiringContractsList,
  StaleDealsList,
  UpcomingEventsList,
} from "@/features/dashboard/components/ActionableLists";
import { FunnelChart } from "@/features/dashboard/components/FunnelChart";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { PeriodSelector } from "@/features/dashboard/components/PeriodSelector";
import { RevenueChart } from "@/features/dashboard/components/RevenueChart";
import { getDashboardData } from "@/features/dashboard/queries";
import { formatCurrency } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const resolvedSearchParams = await searchParams;
  const {
    params,
    summary,
    prevSummary,
    revenue,
    upcomingEvents,
    staleDeals,
    expiringContracts,
    recentActivities,
  } = await getDashboardData(resolvedSearchParams);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <PeriodSelector
          value={params.period}
          customFrom={params.from}
          customTo={params.to}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Receita ganha no período"
          value={formatCurrency(summary.wonValue)}
          current={summary.wonValue}
          previous={prevSummary.wonValue}
        />
        <KpiCard
          label="Pipeline aberto"
          value={formatCurrency(summary.openValue)}
          current={summary.openValue}
          previous={prevSummary.openValue}
        />
        <KpiCard
          label="Taxa de conversão"
          value={`${summary.conversionRate}%`}
          current={summary.conversionRate}
          previous={prevSummary.conversionRate}
        />
        <KpiCard
          label="Novos clientes"
          value={String(summary.newClients)}
          current={summary.newClients}
          previous={prevSummary.newClients}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Funil por etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={summary.funnel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Receita ganha por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenue} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Próximas reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingEventsList events={upcomingEvents} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Propostas paradas</CardTitle>
          </CardHeader>
          <CardContent>
            <StaleDealsList deals={staleDeals} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contratos vencendo</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpiringContractsList contracts={expiringContracts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientTimelineTab
              activities={recentActivities}
              emptyDescription="Alterações relevantes em clientes, propostas e contratos aparecem aqui."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

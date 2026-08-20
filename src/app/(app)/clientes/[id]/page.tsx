import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ClientContractsTab } from "@/features/clients/components/ClientContractsTab";
import { ClientDealsTab } from "@/features/clients/components/ClientDealsTab";
import { ClientEventsTab } from "@/features/clients/components/ClientEventsTab";
import { ClientOverviewTab } from "@/features/clients/components/ClientOverviewTab";
import { ClientProjectsTab } from "@/features/clients/components/ClientProjectsTab";
import { ClientSummaryCard } from "@/features/clients/components/ClientSummaryCard";
import { ClientTimelineTab } from "@/features/clients/components/ClientTimelineTab";
import { getClientDetail } from "@/features/clients/queries";

export default async function ClienteDetalhePage({
  params,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { client, deals, contracts, projects, events, activities, members, summary } =
    await getClientDetail(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{client.name}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="deals">Propostas</TabsTrigger>
              <TabsTrigger value="contracts">Contratos</TabsTrigger>
              <TabsTrigger value="projects">Projetos</TabsTrigger>
              <TabsTrigger value="events">Agenda</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <ClientOverviewTab client={client} members={members} />
            </TabsContent>
            <TabsContent value="deals" className="pt-4">
              <ClientDealsTab deals={deals} />
            </TabsContent>
            <TabsContent value="contracts" className="pt-4">
              <ClientContractsTab contracts={contracts} />
            </TabsContent>
            <TabsContent value="projects" className="pt-4">
              <ClientProjectsTab projects={projects} />
            </TabsContent>
            <TabsContent value="events" className="pt-4">
              <ClientEventsTab upcoming={events.upcoming} past={events.past} />
            </TabsContent>
            <TabsContent value="timeline" className="pt-4">
              <ClientTimelineTab activities={activities} />
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <ClientSummaryCard summary={summary} />
        </div>
      </div>
    </div>
  );
}

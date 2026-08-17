import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientTimelineTab } from "@/features/clients/components/ClientTimelineTab";
import { ContractMetadataPanel } from "@/features/contracts/components/ContractMetadataPanel";
import { ContractViewer } from "@/features/contracts/components/ContractViewer";
import { getContractDetail } from "@/features/contracts/queries";

export default async function ContratoDetalhePage({
  params,
}: PageProps<"/contratos/[id]">) {
  const { id } = await params;
  const { contract, activities, file } = await getContractDetail(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/contratos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Contratos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{contract.title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ContractViewer file={file} />

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientTimelineTab activities={activities} />
            </CardContent>
          </Card>
        </div>

        <div>
          <ContractMetadataPanel contract={contract} />
        </div>
      </div>
    </div>
  );
}

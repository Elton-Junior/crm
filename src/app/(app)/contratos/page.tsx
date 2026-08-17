import Link from "next/link";
import { FileTextIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/EmptyState";
import { ContractsFilters } from "@/features/contracts/components/ContractsFilters";
import { ContractsTable } from "@/features/contracts/components/ContractsTable";
import { getContractsList } from "@/features/contracts/queries";
import { cn } from "@/lib/utils";

export default async function ContratosPage({
  searchParams,
}: PageProps<"/contratos">) {
  const resolvedSearchParams = await searchParams;
  const { contracts, total, pageSize, params, hasFilters } =
    await getContractsList(resolvedSearchParams);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (page: number) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.status) search.set("status", params.status);
    if (params.clientId) search.set("clientId", params.clientId);
    if (params.tag) search.set("tag", params.tag);
    search.set("sort", params.sort);
    search.set("dir", params.dir);
    search.set("page", String(page));
    return `/contratos?${search.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "contrato" : "contratos"}
          </p>
        </div>
        <Button asChild>
          <Link href="/contratos/novo">
            <PlusIcon />
            Novo contrato
          </Link>
        </Button>
      </div>

      <ContractsFilters
        defaultQuery={{ q: params.q, status: params.status, clientId: params.clientId }}
      />

      {contracts.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={FileTextIcon}
            title="Nenhum contrato encontrado"
            description="Ajuste os filtros ou limpe a busca para ver mais resultados."
          />
        ) : (
          <EmptyState
            icon={FileTextIcon}
            title="Nenhum contrato cadastrado ainda"
            description="Cadastre o primeiro contrato para começar a controlar vigências e arquivos."
            action={{ label: "Cadastrar primeiro contrato", href: "/contratos/novo" }}
          />
        )
      ) : (
        <>
          <ContractsTable contracts={contracts} params={params} />

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {params.page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={pageHref(Math.max(1, params.page - 1))}
                    aria-disabled={params.page <= 1}
                    className={cn(
                      params.page <= 1 && "pointer-events-none opacity-50",
                    )}
                  >
                    Anterior
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={pageHref(Math.min(totalPages, params.page + 1))}
                    aria-disabled={params.page >= totalPages}
                    className={cn(
                      params.page >= totalPages &&
                        "pointer-events-none opacity-50",
                    )}
                  >
                    Próxima
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

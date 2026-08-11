import Link from "next/link";
import { PlusIcon, UsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/EmptyState";
import { ClientsFilters } from "@/features/clients/components/ClientsFilters";
import { ClientsTable } from "@/features/clients/components/ClientsTable";
import { getClientsList } from "@/features/clients/queries";
import { cn } from "@/lib/utils";

export default async function ClientesPage({
  searchParams,
}: PageProps<"/clientes">) {
  const resolvedSearchParams = await searchParams;
  const { clients, total, pageSize, members, params, hasFilters } =
    await getClientsList(resolvedSearchParams);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pageHref = (page: number) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.status) search.set("status", params.status);
    if (params.ownerId) search.set("ownerId", params.ownerId);
    if (params.tag) search.set("tag", params.tag);
    search.set("sort", params.sort);
    search.set("dir", params.dir);
    search.set("page", String(page));
    return `/clientes?${search.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "cliente" : "clientes"}
          </p>
        </div>
        <Button asChild>
          <Link href="/clientes/novo">
            <PlusIcon />
            Novo cliente
          </Link>
        </Button>
      </div>

      <ClientsFilters
        members={members}
        defaultQuery={{
          q: params.q,
          status: params.status,
          ownerId: params.ownerId,
        }}
      />

      {clients.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={UsersIcon}
            title="Nenhum cliente encontrado"
            description="Ajuste os filtros ou limpe a busca para ver mais resultados."
          />
        ) : (
          <EmptyState
            icon={UsersIcon}
            title="Nenhum cliente cadastrado ainda"
            description="Cadastre o primeiro cliente para começar a usar o CRM."
            action={{ label: "Cadastrar primeiro cliente", href: "/clientes/novo" }}
          />
        )
      ) : (
        <>
          <ClientsTable clients={clients} params={params} members={members} />

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

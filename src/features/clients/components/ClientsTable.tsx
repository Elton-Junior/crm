import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDocument, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClientListItem } from "@/server/clients";

import { CLIENT_STATUS_LABELS, type ClientListParams } from "../schema";
import { ClientRowActions } from "./ClientRowActions";

const STATUS_STYLES: Record<string, string> = {
  lead: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  inactive: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  churned: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

type SortableColumn = ClientListParams["sort"];

function SortableHeader({
  column,
  label,
  params,
}: {
  column: SortableColumn;
  label: string;
  params: ClientListParams;
}) {
  const isActive = params.sort === column;
  const nextDir = isActive && params.dir === "asc" ? "desc" : "asc";
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.ownerId) search.set("ownerId", params.ownerId);
  if (params.tag) search.set("tag", params.tag);
  search.set("sort", column);
  search.set("dir", nextDir);

  return (
    <Link
      href={`/clientes?${search.toString()}`}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      {isActive ? (
        params.dir === "asc" ? (
          <ArrowUpIcon className="size-3.5" />
        ) : (
          <ArrowDownIcon className="size-3.5" />
        )
      ) : null}
    </Link>
  );
}

type Member = { id: string; full_name: string | null };

export function ClientsTable({
  clients,
  params,
  members,
}: {
  clients: ClientListItem[];
  params: ClientListParams;
  members: Member[];
}) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {clients.map((client) => (
          <div key={client.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/clientes/${client.id}`}
                  className="font-medium hover:underline"
                >
                  {client.name}
                </Link>
                {client.trade_name ? (
                  <p className="text-xs text-muted-foreground">{client.trade_name}</p>
                ) : null}
              </div>
              <ClientRowActions
                clientId={client.id}
                clientName={client.name}
                members={members}
              />
            </div>

            <div className="mt-2 flex flex-col gap-0.5 text-sm text-muted-foreground">
              {client.document ? <span>{formatDocument(client.document)}</span> : null}
              {client.email ? <span>{client.email}</span> : null}
              {client.phone ? <span>{formatPhone(client.phone)}</span> : null}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Badge
                variant="outline"
                className={cn("border-transparent", STATUS_STYLES[client.status])}
              >
                {CLIENT_STATUS_LABELS[client.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(client.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-md border sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader column="name" label="Nome" params={params} />
            </TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>
              <SortableHeader column="status" label="Status" params={params} />
            </TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>
              <SortableHeader
                column="created_at"
                label="Criado em"
                params={params}
              />
            </TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/clientes/${client.id}`}
                  className="hover:underline"
                >
                  {client.name}
                </Link>
                {client.trade_name ? (
                  <p className="text-xs text-muted-foreground">
                    {client.trade_name}
                  </p>
                ) : null}
              </TableCell>
              <TableCell>
                {client.document ? formatDocument(client.document) : "—"}
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-sm">
                  {client.email ? <span>{client.email}</span> : null}
                  {client.phone ? (
                    <span className="text-muted-foreground">
                      {formatPhone(client.phone)}
                    </span>
                  ) : null}
                  {!client.email && !client.phone ? "—" : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("border-transparent", STATUS_STYLES[client.status])}
                >
                  {CLIENT_STATUS_LABELS[client.status]}
                </Badge>
              </TableCell>
              <TableCell>{client.owner?.full_name ?? "—"}</TableCell>
              <TableCell>{formatDate(client.created_at)}</TableCell>
              <TableCell>
                <ClientRowActions
                  clientId={client.id}
                  clientName={client.name}
                  members={members}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </>
  );
}

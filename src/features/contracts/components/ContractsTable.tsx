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
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContractListItem } from "@/server/contracts";

import { CONTRACT_STATUS_LABELS, type ContractListParams } from "../schema";
import { ContractRowActions } from "./ContractRowActions";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  signed: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

type SortableColumn = ContractListParams["sort"];

function SortableHeader({
  column,
  label,
  params,
}: {
  column: SortableColumn;
  label: string;
  params: ContractListParams;
}) {
  const isActive = params.sort === column;
  const nextDir = isActive && params.dir === "asc" ? "desc" : "asc";
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.clientId) search.set("clientId", params.clientId);
  if (params.tag) search.set("tag", params.tag);
  search.set("sort", column);
  search.set("dir", nextDir);

  return (
    <Link
      href={`/contratos?${search.toString()}`}
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

function expiryBadge(endDate: string | null, status: string) {
  if (!endDate || status === "expired" || status === "cancelled") return null;
  const days = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) {
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Vencido</Badge>;
  }
  if (days <= 30) {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Vence em {days}d
      </Badge>
    );
  }
  return null;
}

export function ContractsTable({
  contracts,
  params,
}: {
  contracts: ContractListItem[];
  params: ContractListParams;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader column="title" label="Título" params={params} />
            </TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>
              <SortableHeader column="end_date" label="Vigência" params={params} />
            </TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">
                <Link href={`/contratos/${contract.id}`} className="hover:underline">
                  {contract.title}
                </Link>
                {contract.contract_no ? (
                  <p className="text-xs text-muted-foreground">
                    Nº {contract.contract_no}
                  </p>
                ) : null}
              </TableCell>
              <TableCell>{contract.client?.name ?? "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn("border-transparent", STATUS_STYLES[contract.status])}
                  >
                    {CONTRACT_STATUS_LABELS[contract.status]}
                  </Badge>
                  {expiryBadge(contract.end_date, contract.status)}
                </div>
              </TableCell>
              <TableCell>{formatCurrency(contract.value_cents)}</TableCell>
              <TableCell>
                {contract.end_date ? formatDate(contract.end_date) : "—"}
              </TableCell>
              <TableCell>
                <ContractRowActions
                  contractId={contract.id}
                  contractTitle={contract.title}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

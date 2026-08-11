import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { ClientForm } from "@/features/clients/components/ClientForm";
import { requireOrg } from "@/lib/auth";
import * as clientsService from "@/server/clients";

export default async function NovoClientePage() {
  const { supabase, orgId } = await requireOrg();
  const members = await clientsService.listMembers(supabase, orgId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Novo cliente</h1>
      </div>

      <ClientForm mode="create" members={members} />
    </div>
  );
}

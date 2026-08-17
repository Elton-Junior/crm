import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { ContractForm } from "@/features/contracts/components/ContractForm";

export default function NovoContratoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/contratos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Contratos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Novo contrato</h1>
      </div>

      <ContractForm />
    </div>
  );
}

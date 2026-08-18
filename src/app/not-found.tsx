import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <SearchXIcon className="size-10 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="text-lg font-medium">Página não encontrada</p>
        <p className="text-sm text-muted-foreground">
          O endereço acessado não existe.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}

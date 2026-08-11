import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function SemAcessoPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-4">
        <Link href="/" className="text-sm font-medium">
          CRM
        </Link>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">Sem acesso</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Sua conta ainda não está vinculada a nenhuma organização. Peça para
          um administrador te enviar um convite.
        </p>
        <form action="/auth/sign-out" method="post">
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}

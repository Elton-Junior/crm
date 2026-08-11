import Link from "next/link";
import { CalendarDays, FileText, KanbanSquare, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    icon: Users,
    title: "Clientes",
    description: "Cadastro completo com histórico, contatos e timeline.",
  },
  {
    icon: KanbanSquare,
    title: "Propostas",
    description: "Pipeline em Kanban, arraste e solte entre etapas.",
  },
  {
    icon: FileText,
    title: "Contratos",
    description: "Arquivos, vigência e alertas de vencimento num só lugar.",
  },
  {
    icon: CalendarDays,
    title: "Agenda",
    description: "Reuniões e prazos vinculados a clientes e propostas.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctaHref = user ? "/dashboard" : "/login";
  const ctaLabel = user ? "Ir para o dashboard" : "Entrar";

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            CRM
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Clientes, propostas, contratos e agenda em um só lugar — feito
            para o jeito que o nosso time realmente vende.
          </p>
          <Button asChild size="lg">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </section>

        {/* O que o sistema faz */}
        <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="size-6 text-primary" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        {/* Mockup do dashboard */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-24">
          <Card className="overflow-hidden border-dashed">
            <CardContent className="flex h-64 items-center justify-center bg-muted/40 text-sm text-muted-foreground sm:h-96">
              Prévia do dashboard
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        Minha Empresa · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

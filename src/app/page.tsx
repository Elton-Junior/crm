import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDays,
  FileText,
  KanbanSquare,
  Users,
} from "lucide-react";

import { Logo } from "@/components/layout/Logo";
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
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Logo />
          <Button asChild size="sm">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center"
          >
            <div className="h-[480px] w-[780px] rounded-full bg-primary/20 blur-[120px]" />
          </div>

          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
            <span className="inline-flex items-center rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Workspace comercial interno
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Vendas organizadas do primeiro contato ao contrato assinado
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground text-balance">
              Clientes, propostas, contratos e agenda em um só lugar — feito
              para o jeito que o nosso time realmente vende.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={ctaHref}>
                  {ctaLabel}
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#funcionalidades">Ver funcionalidades</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* O que o sistema faz */}
        <section
          id="funcionalidades"
          className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card
              key={title}
              className="transition-shadow hover:shadow-md hover:shadow-primary/5"
            >
              <CardHeader>
                <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        {/* Mockup do dashboard */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-24">
          <Card className="overflow-hidden py-0 shadow-xl shadow-primary/5">
            <CardContent className="px-0 pb-0">
              <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-3">
                <span className="size-2.5 rounded-full bg-destructive/60" />
                <span className="size-2.5 rounded-full bg-amber-400/70" />
                <span className="size-2.5 rounded-full bg-green-500/60" />
                <span className="ml-3 text-xs text-muted-foreground">
                  app.crm.com.br/dashboard
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-4 sm:p-6">
                {[
                  { label: "Receita ganha", value: "R$ 84.200", tone: "bg-primary/10 text-primary" },
                  { label: "Pipeline aberto", value: "R$ 212.500", tone: "bg-chart-2/15 text-chart-2" },
                  { label: "Conversão", value: "32%", tone: "bg-chart-3/15 text-chart-3" },
                  { label: "Novos clientes", value: "+18", tone: "bg-chart-4/20 text-chart-4" },
                ].map((stat) => (
                  <div key={stat.label} className={`rounded-lg p-4 ${stat.tone}`}>
                    <p className="text-xs font-medium opacity-80">{stat.label}</p>
                    <p className="mt-1 text-xl font-semibold">{stat.value}</p>
                  </div>
                ))}

                <div className="col-span-full mt-2 flex h-40 items-end gap-2 rounded-lg border bg-card p-4 sm:h-48">
                  {[38, 52, 44, 61, 58, 72, 66, 80, 74, 90, 85, 96].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm bg-primary/70"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo className="text-sm" />
          <p className="text-sm text-muted-foreground">
            Minha Empresa · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

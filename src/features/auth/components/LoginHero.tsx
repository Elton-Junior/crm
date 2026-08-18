import type { CSSProperties } from "react";
import { CalendarDays, FileText, KanbanSquare, Users } from "lucide-react";

import { Logo } from "@/components/layout/Logo";

const STATS = [
  { label: "Receita ganha", value: "R$ 84.200", tone: "bg-primary/15 text-primary-foreground" },
  { label: "Pipeline aberto", value: "R$ 212.500", tone: "bg-chart-2/25 text-primary-foreground" },
  { label: "Conversão", value: "32%", tone: "bg-chart-3/25 text-primary-foreground" },
  { label: "Novos clientes", value: "+18", tone: "bg-chart-4/25 text-primary-foreground" },
];

const FEATURES = [
  { icon: Users, label: "Clientes" },
  { icon: KanbanSquare, label: "Propostas" },
  { icon: FileText, label: "Contratos" },
  { icon: CalendarDays, label: "Agenda" },
];

/** Painel de marca da tela de login — só visual, sem estado (§7.2). */
export function LoginHero() {
  return (
    <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,color-mix(in_oklch,var(--primary-foreground)_18%,transparent)_1px,transparent_1px)] [background-size:22px_22px] opacity-20"
      />
      <div
        aria-hidden
        className="animate-blob-a pointer-events-none absolute -top-32 -left-24 size-[420px] rounded-full bg-white/15 blur-[100px]"
      />
      <div
        aria-hidden
        className="animate-blob-b pointer-events-none absolute -right-24 bottom-0 size-[480px] rounded-full bg-chart-3/40 blur-[120px]"
      />

      <Logo className="relative z-10 text-primary-foreground [&_span:first-child]:bg-white/15" />

      <div className="relative z-10 max-w-md space-y-4">
        <h1 className="text-3xl font-semibold text-balance">
          Vendas organizadas do primeiro contato ao contrato assinado
        </h1>
        <p className="text-primary-foreground/80 text-balance">
          Clientes, propostas, contratos e agenda em um só lugar — feito para
          o jeito que o nosso time realmente vende.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {FEATURES.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium"
            >
              <Icon className="size-3.5" />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-3">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            style={{ "--card-rotate": i % 2 === 0 ? "-1deg" : "1deg", animationDelay: `${i * 0.6}s` } as CSSProperties}
            className={`animate-card-float rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm ${stat.tone}`}
          >
            <p className="text-xs font-medium text-primary-foreground/70">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

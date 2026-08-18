import { z } from "zod";

const PERIOD_OPTIONS = ["today", "7d", "30d", "quarter", "year", "custom"] as const;
export type PeriodOption = (typeof PERIOD_OPTIONS)[number];

export const PERIOD_LABELS: Record<PeriodOption, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  quarter: "Trimestre",
  year: "Ano",
  custom: "Customizado",
};

/** searchParams — `.catch()` pra nunca quebrar a página com um parâmetro adulterado. */
export const dashboardParamsSchema = z.object({
  period: z.enum(PERIOD_OPTIONS).catch("30d"),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
});

export type DashboardParams = z.infer<typeof dashboardParamsSchema>;

/** Padrão: 30 dias (§7.4 "Filtros globais"). */
export function resolvePeriodRange(params: DashboardParams): { from: Date; to: Date } {
  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  if (params.period === "custom" && params.from && params.to) {
    const from = new Date(params.from);
    const to = new Date(params.to);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { from, to };
    }
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (params.period) {
    case "today":
      return { from: startOfToday, to: endOfToday };
    case "7d":
      return { from: new Date(now.getTime() - 7 * 86400_000), to: endOfToday };
    case "quarter":
      return { from: new Date(now.getTime() - 90 * 86400_000), to: endOfToday };
    case "year":
      return { from: new Date(now.getTime() - 365 * 86400_000), to: endOfToday };
    case "30d":
    default:
      return { from: new Date(now.getTime() - 30 * 86400_000), to: endOfToday };
  }
}

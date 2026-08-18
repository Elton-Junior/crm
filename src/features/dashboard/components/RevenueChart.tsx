"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/format";
import type { MonthlyRevenue } from "@/server/dashboard";

const MONTH_LABELS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  const chartData = data.map((d) => {
    const [year, month] = d.month.split("-");
    return {
      label: `${MONTH_LABELS[Number(month) - 1]}/${year.slice(2)}`,
      value: d.valueCents / 100,
    };
  });

  const hasData = chartData.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem receita ganha nos últimos 12 meses.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.12} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          interval="preserveStartEnd"
        />
        <YAxis hide domain={[0, (max: number) => max * 1.15]} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground">
                  {formatCurrency((payload[0].value as number) * 100)}
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#revenueFill)"
          dot={{ r: 4, fill: "var(--primary)", strokeWidth: 2, stroke: "var(--background)" }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

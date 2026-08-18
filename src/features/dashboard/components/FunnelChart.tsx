"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/format";
import type { FunnelStage } from "@/server/dashboard";

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  if (stages.length === 0 || stages.every((s) => s.count === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma proposta aberta no funil.
      </p>
    );
  }

  const data = stages.map((s) => ({
    name: s.name,
    count: s.count,
    value: s.valueCents,
    color: s.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          cursor={{ fill: "var(--accent)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { name: string; count: number; value: number };
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
                <p className="font-medium">{d.name}</p>
                <p className="text-muted-foreground">
                  {d.count} {d.count === 1 ? "proposta" : "propostas"} · {formatCurrency(d.value)}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} maxBarSize={24}>
          {data.map((entry, index) => (
            <Cell key={entry.name + index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

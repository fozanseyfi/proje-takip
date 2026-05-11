"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  data,
  height = 180,
  innerRadius = 50,
  outerRadius = 75,
  centerLabel,
  centerSub,
}: {
  data: DonutSlice[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const safe = total > 0 ? data : [{ label: "Veri yok", value: 1, color: "#e2e8f0" }];
  return (
    <div className="relative" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.12)",
            }}
            formatter={(v, _name, item) => {
              const label = (item as unknown as { payload?: { label?: string } })?.payload?.label ?? "";
              return [typeof v === "number" ? v : 0, label];
            }}
          />
          <Pie
            data={safe}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={total > 0 ? 2 : 0}
            stroke="none"
          >
            {safe.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerSub) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && (
            <div className="font-mono text-xl font-bold text-text tabular-nums">{centerLabel}</div>
          )}
          {centerSub && (
            <div className="text-[10px] uppercase tracking-wider font-bold text-text3 mt-0.5">
              {centerSub}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DonutLegend({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="space-y-1.5">
      {data.map((d) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
            <span className="text-text2 flex-1">{d.label}</span>
            <span className="font-mono font-semibold tabular-nums text-text">{d.value}</span>
            <span className="font-mono text-text3 tabular-nums w-10 text-right">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

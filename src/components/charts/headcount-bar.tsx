"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { formatDate } from "@/lib/utils";

export function HeadcountBar({
  data,
  color = "#10b981",
  height = 200,
}: {
  data: { date: string; count: number }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={10}
            tickFormatter={(d) => {
              const dt = new Date(d as string);
              return `${dt.getDate()}/${dt.getMonth() + 1}`;
            }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(16, 185, 129, 0.05)" }}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.12)",
            }}
            labelStyle={{ color: "#475569", fontWeight: 600, fontSize: 11 }}
            labelFormatter={(d) => formatDate(d as string)}
            formatter={(v) => [`${typeof v === "number" ? v : 0} kişi`, "Çalışan"]}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.count === max ? color : `${color}aa`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

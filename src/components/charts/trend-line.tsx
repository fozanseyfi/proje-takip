"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatDate } from "@/lib/utils";

export function TrendLine({
  data,
  color = "#10b981",
  fillId = "trendGreen",
  label = "Adet",
  height = 180,
}: {
  data: { date: string; count: number }[];
  color?: string;
  fillId?: string;
  label?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
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
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.12)",
            }}
            labelStyle={{ color: "#475569", fontWeight: 600, fontSize: 11 }}
            labelFormatter={(d) => formatDate(d as string)}
            formatter={(v) => [typeof v === "number" ? v : 0, label]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2.2}
            fill={`url(#${fillId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { formatDate } from "@/lib/utils";

export interface SCurveDataPoint {
  date: string;
  planPct: number;
  realPct: number | null;
}

export function SCurveChart({
  data,
  reportDate,
  height = 320,
}: {
  data: SCurveDataPoint[];
  reportDate?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#e5e9f0" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={11}
            tickFormatter={(d) => formatDate(d)}
            tickLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e5e9f0",
              borderRadius: 10,
              color: "#0f172a",
              fontSize: 12,
              boxShadow: "0 12px 28px -8px rgba(15, 23, 42, 0.12)",
            }}
            labelStyle={{ color: "#475569", fontWeight: 600, fontSize: 11 }}
            labelFormatter={(d) => formatDate(d as string)}
            formatter={(v, name) => [
              typeof v === "number" && !isNaN(v) ? `${v.toFixed(1)}%` : "—",
              name === "planPct" ? "Planlanan" : "Gerçekleşen",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#475569", paddingTop: 12 }}
            formatter={(v) => (v === "planPct" ? "Planlanan %" : "Gerçekleşen %")}
          />
          {reportDate && (
            <ReferenceLine
              x={reportDate}
              stroke="#0f4c81"
              strokeDasharray="3 3"
              label={{
                value: "Rapor",
                fill: "#0f4c81",
                fontSize: 10,
                position: "top",
                fontWeight: 600,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="planPct"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="realPct"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

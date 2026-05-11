"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { formatDate } from "@/lib/utils";

export interface MiniSCurvePoint {
  date: string;
  planPct: number;
  realPct: number;
}

export function MiniSCurve({
  data,
  reportDate,
  height = 110,
}: {
  data: MiniSCurvePoint[];
  reportDate?: string;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 11,
              boxShadow: "0 8px 24px -8px rgba(15, 23, 42, 0.12)",
            }}
            labelStyle={{ color: "#475569", fontWeight: 600, fontSize: 10 }}
            labelFormatter={(d) => formatDate(d as string)}
            formatter={(v, name) => [
              typeof v === "number" && !isNaN(v) ? `${v.toFixed(1)}%` : "—",
              name === "planPct" ? "Plan" : "Gerçek",
            ]}
          />
          {reportDate && (
            <ReferenceLine x={reportDate} stroke="#059669" strokeDasharray="2 2" strokeWidth={1} />
          )}
          <Line type="monotone" dataKey="planPct" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="realPct" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

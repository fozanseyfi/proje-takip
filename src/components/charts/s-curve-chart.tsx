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
          <CartesianGrid stroke="rgba(30,45,80,0.3)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke="#4a5a80"
            fontSize={10}
            tickFormatter={(d) => formatDate(d)}
          />
          <YAxis
            stroke="#4a5a80"
            fontSize={10}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "#0d1526",
              border: "1px solid #1e2d50",
              borderRadius: 8,
              color: "#e8eeff",
              fontSize: 12,
            }}
            labelFormatter={(d) => formatDate(d as string)}
            formatter={(v: number, name) => [
              v != null ? `${v.toFixed(1)}%` : "—",
              name === "planPct" ? "Planlanan" : "Gerçekleşen",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#8899cc", paddingTop: 8 }}
            formatter={(v) => (v === "planPct" ? "Planlanan %" : "Gerçekleşen %")}
          />
          {reportDate && (
            <ReferenceLine
              x={reportDate}
              stroke="#00d4ff"
              strokeDasharray="3 3"
              label={{
                value: "Rapor Tarihi",
                fill: "#00d4ff",
                fontSize: 10,
                position: "top",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="planPct"
            stroke="#3d8ef0"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="realPct"
            stroke="#00e676"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

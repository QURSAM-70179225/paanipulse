"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartRow {
  date: string;
  pumpedM3: number;
  needM3: number;
  excessM3: number;
}

const dayLabel = (d: string) => new Date(`${d}T12:00:00+05:00`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "Asia/Karachi" });

export function PumpChart({ data }: { data: ChartRow[] }) {
  const rows = data.map((r) => ({ ...r, day: dayLabel(r.date) }));
  return (
    <div className="h-64 w-full" role="img" aria-label="Last 7 days: water pumped versus crop need, with excess water">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} unit=" m³" width={64} />
          <Tooltip
            formatter={(v, name) => [`${Number(v).toLocaleString("en-US")} m³ (${(Number(v) * 1000).toLocaleString("en-US")} L)`, name]}
            contentStyle={{ borderRadius: 12, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="pumpedM3" name="Pumped" fill="#0369a1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="needM3" name="Crop needed" fill="#059669" radius={[4, 4, 0, 0]} />
          <Line dataKey="excessM3" name="Wasted (below roots)" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

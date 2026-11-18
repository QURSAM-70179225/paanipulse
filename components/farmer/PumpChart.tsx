"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartRow {
  date: string;
  pumpedM3: number;
  needM3: number;
  excessM3: number;
}

export interface ChartLabels {
  pumped: string;
  needed: string;
  wasted: string;
  litres: string;
  aria: string;
}

export function PumpChart({ data, labels, locale }: { data: ChartRow[]; labels: ChartLabels; locale: string }) {
  const rows = data.map((r) => ({
    ...r,
    day: new Date(`${r.date}T12:00:00+05:00`).toLocaleDateString(locale, { weekday: "short", timeZone: "Asia/Karachi" }),
  }));
  return (
    <div className="h-64 w-full" role="img" aria-label={labels.aria} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} unit=" m³" width={64} />
          <Tooltip
            formatter={(v, name) => [`${(Number(v) * 1000).toLocaleString("en-US")} ${labels.litres}`, name]}
            contentStyle={{ borderRadius: 12, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="pumpedM3" name={labels.pumped} fill="#0369a1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="needM3" name={labels.needed} fill="#059669" radius={[4, 4, 0, 0]} />
          <Line dataKey="excessM3" name={labels.wasted} stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

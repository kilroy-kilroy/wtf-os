"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export function PatternDensityChart({ data }: { data: { date: string; value: number }[] }) {
  return (
    <div className="bg-black border border-[#E51B23] rounded-lg p-4">
      <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">
        Pattern Density Trend
      </h3>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid stroke="#222" vertical={false} />
          <XAxis dataKey="date" stroke="#777" fontSize={10} />
          <YAxis stroke="#777" fontSize={10} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              background: "#000",
              border: "1px solid #333",
              color: "#fff",
              borderRadius: "4px",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#E51B23"
            strokeWidth={3}
            dot={{ r: 2, fill: "#E51B23" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

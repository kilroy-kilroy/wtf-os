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

export function TrustVelocityChart({ data }: { data: { date: string; value: number }[] }) {
  return (
    <div className="bg-black border border-[#E51B23] rounded-lg p-4">
      <h3 className="font-anton text-sm uppercase text-[#FFDE59] mb-3">
        Trust Velocity (30-60 day trend)
      </h3>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <defs>
            <linearGradient id="trustVelGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFDE59" stopOpacity={1} />
              <stop offset="100%" stopColor="#E51B23" stopOpacity={0.4} />
            </linearGradient>
          </defs>

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
            stroke="url(#trustVelGrad)"
            strokeWidth={3}
            dot={{ r: 2, fill: "#FFDE59" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

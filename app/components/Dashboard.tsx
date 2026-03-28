"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  getCounts: (key: string) => Record<string, number>;
};

const fields = [
  "District",
  "State",
  "Program name",
  "Mode",
];

export default function Dashboard({ getCounts }: Props) {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {fields.map((field) => {
        const counts = getCounts(field);

        const chartData = Object.entries(counts).map(
          ([name, value]) => ({
            name,
            value,
          })
        );

        return (
          <div
            key={field}
            className="bg-white rounded-2xl shadow p-4 border"
          >
            <h2 className="text-lg font-semibold mb-4">
              {field} Analysis
            </h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
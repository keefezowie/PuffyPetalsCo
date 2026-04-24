"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatRupiah } from "@/lib/formatters";

const salesConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-2)",
  },
  profit: {
    label: "Profit",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const platformConfig = {
  value: {
    label: "Revenue",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function SalesProfitChart({
  data,
}: {
  data: Array<{ month: string; revenue: number; profit: number }>;
}) {
  return (
    <ChartContainer config={salesConfig} className="h-[260px] w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatRupiah(Number(value)).replace("Rp", "")}
        />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value) => formatRupiah(Number(value))} />}
        />
        <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

export function PlatformRevenueChart({
  data,
}: {
  data: Array<{ platform: string; value: number }>;
}) {
  return (
    <ChartContainer config={platformConfig} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 8, right: 8, top: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="platform" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatRupiah(Number(value)).replace("Rp", "")}
        />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value) => formatRupiah(Number(value))} />}
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}

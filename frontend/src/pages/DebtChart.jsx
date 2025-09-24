"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function DebtChart({ netBalances = [] }) {
  if (!Array.isArray(netBalances) || netBalances.length === 0) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Typography variant="body2" color="text.secondary">
            No data available for chart
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const chartData = netBalances.map((n, idx) => ({
    name:
      n.person?.name && n.group?.name
        ? `${n.person.name} (${n.group.name})`
        : `Entry ${idx + 1}`,
    amount: n.netAmount,
    isPositive: n.netAmount >= 0,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow border border-gray-200">
          <p className="font-medium">{d.name}</p>
          <p className={`${d.isPositive ? "text-black" : "text-gray-600"}`}>
            {d.isPositive ? "+" : "-"}${Math.abs(d.amount).toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent>
        <Box className="flex items-center justify-between mb-4">
          <Typography variant="h6" className="font-semibold text-gray-900">
            Net Balances
          </Typography>
          <Box className="flex items-center space-x-4 text-sm text-gray-600">
            <Box className="flex items-center space-x-1">
              <TrendingUp className="w-4 h-4 text-black" />
              <span className="text-black">You're owed</span>
            </Box>
            <Box className="flex items-center space-x-1">
              <TrendingDown className="w-4 h-4 text-gray-700" />
              <span className="text-gray-700">You owe</span>
            </Box>
          </Box>
        </Box>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-25}
              textAnchor="end"
              fontSize={12}
              height={60}
            />
            <YAxis fontSize={12} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.isPositive ? "#111111" : "#6b7280"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

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
import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import { TrendingUp, TrendingDown } from "lucide-react";

/*
  Props:
    netBalances: array of { key, label, amount }
  This renders a modern bar chart for each entry.
*/

export default function DebtChart({ netBalances = [] }) {
  if (!Array.isArray(netBalances) || netBalances.length === 0) {
    return (
      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Typography variant="body2" className="text-gray-500">
            No data available for chart
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const chartData = netBalances.map((n) => ({
    name: n.label.length > 15 ? `${n.label.substring(0, 15)}...` : n.label,
    fullName: n.label,
    amount: n.amount,
    absAmount: Math.abs(n.amount),
    isPositive: n.amount >= 0,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{data.fullName}</p>
          <p
            className={`text-sm ${
              data.isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {data.isPositive ? "+" : ""}${data.amount.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <Box className="flex items-center justify-between">
          <Typography variant="h6" className="font-semibold">
            Net Balances
          </Typography>
          <Box className="flex items-center space-x-4 text-sm">
            <Box className="flex items-center space-x-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-green-600">You're owed</span>
            </Box>
            <Box className="flex items-center space-x-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-red-600">You owe</span>
            </Box>
          </Box>
        </Box>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
              stroke="#666"
            />
            <YAxis
              fontSize={12}
              stroke="#666"
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isPositive ? "#10b981" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

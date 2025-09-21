"use client";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Container,
} from "@mui/material";
import {
  ArrowLeft,
  Eye,
  Handshake,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Users,
  DollarSign,
} from "lucide-react";
import { toast } from "react-hot-toast";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const API_BASE_URL = "http://localhost:3005/api";

const SummaryCard = ({
  title,
  value,
  subtitle,
  trend = "neutral",
  icon: Icon,
}) => {
  const trendColors = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-gray-600",
  };

  return (
    <Card className="rounded-xl shadow-sm hover:shadow-md transition-all duration-200 w-full">
      <CardContent className="p-6">
        <Box className="flex items-center justify-between mb-3">
          <Box className="flex items-center space-x-2">
            {Icon && <Icon className="w-5 h-5 text-gray-500" />}
            <Typography variant="body2" className="text-gray-600 font-medium">
              {title}
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="h4"
          className={`font-bold mb-1 ${trendColors[trend]}`}
        >
          ${value.toFixed(2)}
        </Typography>

        {subtitle && (
          <Typography variant="caption" className="text-gray-500">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default function DebtSummary() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/debt/`, {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load");
      setData(json.data);
    } catch (err) {
      const errorMsg = err.message || "Unknown error";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const openDetailed = (groupId) => {
    navigate(`/debt/${groupId}/detailed`);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" className="py-8">
        <Box className="flex items-center justify-center h-64 space-x-3">
          <CircularProgress size={28} />
          <Typography variant="body2" className="text-gray-500">
            Loading debt summary...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" className="py-8">
        <Alert severity="error" className="rounded-lg">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!data) return null;

  const {
    summary,
    groupBalances = [],
    urgentDebts = [],
    recentActivity = [],
  } = data;

  const totalOwedToUser = summary?.totalOwedToUser || 0;
  const totalUserOwes = summary?.totalUserOwes || 0;
  const netBalance = summary?.netBalance || 0;

  return (
    <Container maxWidth="xl" className="py-8">
      {/* Header */}
      <Box className="mb-8">
        {location.pathname !== "/debt" && (
          <Button
            startIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate("/debt")}
            className="mb-4 text-gray-600"
            sx={{ textTransform: "none" }}
          >
            Back to Debt Summary
          </Button>
        )}

        <Typography variant="h4" className="font-bold text-gray-900 mb-2">
          Debt Summary
        </Typography>
        <Typography variant="body2" className="text-gray-600">
          Overview of your financial obligations and receivables
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} className="mb-8">
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="You're owed"
            value={totalOwedToUser}
            subtitle="Total others owe you"
            trend="positive"
            icon={TrendingUp}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="You owe"
            value={totalUserOwes}
            subtitle="Total you owe others"
            trend="negative"
            icon={TrendingDown}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="Net balance"
            value={netBalance}
            subtitle={
              netBalance >= 0 ? "You are net creditor" : "You are net debtor"
            }
            trend={netBalance >= 0 ? "positive" : "negative"}
            icon={DollarSign}
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          <Box display="flex" flexDirection="column" gap={4}>
            {/* Group Balances */}
            <Card className="rounded-xl shadow-sm w-full">
              <CardHeader>
                <Box className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <Typography variant="h6" className="font-semibold">
                    Group Balances
                  </Typography>
                </Box>
              </CardHeader>
              <CardContent>
                {groupBalances.length === 0 ? (
                  <Typography
                    variant="body2"
                    className="text-gray-500 text-center py-8"
                  >
                    No group balances to show.
                  </Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={3}>
                    {groupBalances.map((g) => (
                      <Card
                        key={g.groupId}
                        variant="outlined"
                        className="rounded-lg w-full"
                      >
                        <CardContent>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Box flex={1}>
                              <Typography
                                variant="h6"
                                className="font-semibold mb-1"
                              >
                                {g.groupName}
                              </Typography>
                              {g.groupDescription && (
                                <Typography
                                  variant="body2"
                                  className="text-gray-600 mb-2"
                                >
                                  {g.groupDescription}
                                </Typography>
                              )}
                              <Box className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>
                                  Unsettled: {g.unsettledExpensesCount}
                                </span>
                                <Box className="flex items-center space-x-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    Last:{" "}
                                    {g.lastExpenseDate
                                      ? g.lastExpenseDate.split("T")[0]
                                      : "-"}
                                  </span>
                                </Box>
                              </Box>
                            </Box>

                            <Box textAlign="right" ml={4}>
                              <Typography
                                variant="h6"
                                className={`font-bold ${
                                  g.netBalance >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                ${g.netBalance.toFixed(2)}
                              </Typography>
                              <Chip
                                label={
                                  g.netBalance >= 0 ? "You're owed" : "You owe"
                                }
                                size="small"
                                color={g.netBalance >= 0 ? "success" : "error"}
                                variant="outlined"
                                className="mb-3"
                              />
                              <Box className="flex space-x-2">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Eye className="w-4 h-4" />}
                                  onClick={() => openDetailed(g.groupId)}
                                  sx={{ textTransform: "none" }}
                                >
                                  View
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<Handshake className="w-4 h-4" />}
                                  onClick={() =>
                                    navigate(
                                      `/settlements/create?groupId=${g.groupId}`
                                    )
                                  }
                                  sx={{
                                    textTransform: "none",
                                    backgroundColor: "#22c55e",
                                    "&:hover": { backgroundColor: "#166534" },
                                  }}
                                >
                                  Settle
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Urgent Debts */}
            <Card className="rounded-xl shadow-sm w-full">
              <CardHeader>
                <Box className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <Typography variant="h6" className="font-semibold">
                    Urgent Debts
                  </Typography>
                </Box>
              </CardHeader>
              <CardContent>
                {urgentDebts.length === 0 ? (
                  <Typography
                    variant="body2"
                    className="text-gray-500 text-center py-8"
                  >
                    No urgent debts
                  </Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={3}>
                    {urgentDebts.map((d) => (
                      <Alert
                        key={d.expenseId}
                        severity="warning"
                        className="rounded-lg"
                      >
                        <Typography
                          variant="subtitle2"
                          className="font-semibold mb-1"
                        >
                          {d.expenseDescription}
                        </Typography>
                        <Typography
                          variant="body2"
                          className="text-gray-600 mb-2"
                        >
                          {d.groupName} • {d.payerName} • {d.daysOld} days old
                        </Typography>
                        <Typography
                          variant="body2"
                          className="font-medium mb-3"
                        >
                          Amount you owe: ${d.userDebtAmount.toFixed(2)}
                        </Typography>
                        <Box display="flex" gap={2}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openDetailed(d.groupId)}
                          >
                            Open group
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              navigate(
                                `/settlements/create?groupId=${d.groupId}&otherUserId=${d.payerId}`
                              )
                            }
                            sx={{
                              backgroundColor: "#2563eb",
                              "&:hover": { backgroundColor: "#1d4ed8" },
                            }}
                          >
                            Settle with {d.payerName}
                          </Button>
                        </Box>
                      </Alert>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={4}>
          <Box display="flex" flexDirection="column" gap={4}>
            {/* Recent Activity */}
            <Card className="rounded-xl shadow-sm w-full">
              <CardHeader>
                <Typography variant="h6" className="font-semibold">
                  Recent Activity
                </Typography>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <Typography
                    variant="body2"
                    className="text-gray-500 text-center py-8"
                  >
                    No recent settlements
                  </Typography>
                ) : (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {recentActivity.map((a) => (
                      <Box key={a.settlementId}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          mb={1}
                        >
                          <Box flex={1}>
                            <Typography
                              variant="subtitle2"
                              className="font-semibold"
                            >
                              {a.transactionType === "paid"
                                ? "Paid"
                                : "Received"}
                            </Typography>
                            <Typography
                              variant="body2"
                              className="text-gray-600"
                            >
                              {a.otherPartyName} • {a.groupName}
                            </Typography>
                            <Typography
                              variant="caption"
                              className="text-gray-500"
                            >
                              {new Date(a.createdAt).toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography
                            variant="subtitle2"
                            className={`font-bold ${
                              a.transactionType === "paid"
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {a.transactionType === "paid" ? "-" : "+"}$
                            {a.amount.toFixed(2)}
                          </Typography>
                        </Box>
                        <Divider />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Recharts Chart */}
            <Card className="rounded-xl shadow-sm w-full p-4">
              <Typography variant="h6" className="font-semibold mb-4">
                Group Balance Chart
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={groupBalances.map((g) => ({
                    name: g.groupName,
                    balance: g.netBalance,
                  }))}
                  margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="balance"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    label={{ position: "top" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

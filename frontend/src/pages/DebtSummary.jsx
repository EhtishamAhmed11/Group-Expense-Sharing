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
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const API_BASE_URL = "http://localhost:3005/api";

// ================== Summary Card ==================
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
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Card className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all bg-white">
        <CardContent className="p-6">
          <Box className="flex items-center space-x-2 mb-2">
            {Icon && <Icon className="w-5 h-5 text-gray-800" />}
            <Typography variant="body2" className="font-medium text-gray-800">
              {title}
            </Typography>
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
    </motion.div>
  );
};

// ================== Main Page ==================
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
      console.log(json)
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

  const openDetailed = (groupId) => navigate(`/debt/${groupId}/detailed`);

  // ========== Loading ==========
  if (loading)
    return (
      <Container maxWidth="xl" className="py-12">
        <Box className="flex items-center justify-center h-64 space-x-3">
          <CircularProgress size={28} />
          <Typography variant="body2" className="text-gray-600">
            Loading debt summary...
          </Typography>
        </Box>
      </Container>
    );

  // ========== Error ==========
  if (error)
    return (
      <Container maxWidth="xl" className="py-12">
        <Alert severity="error" className="rounded-lg">
          {error}
        </Alert>
      </Container>
    );

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
    <Container
      // maxWidth="lg"
      className="py-10"
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* Header */}
      <Box className="mb-10">
        {location.pathname !== "/debt" && (
          <Button
            startIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate("/debt")}
            sx={{
              textTransform: "none",
              color: "black",
              border: "1px solid black",
              borderRadius: "8px",
              mb: 3,
            }}
          >
            Back to Debt Summary
          </Button>
        )}
        <Typography variant="h4" className="font-bold text-gray-900 mb-1">
          Debt Summary
        </Typography>
        <Typography variant="body2" className="text-gray-600">
          A snapshot of what you owe and what others owe you
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} className="mb-10">
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
            subtitle={netBalance >= 0 ? "Net creditor" : "Net debtor"}
            trend={netBalance >= 0 ? "positive" : "negative"}
            icon={DollarSign}
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={5}>
        {/* Left Column */}
        <Grid item xs={12} lg={8} className="flex flex-col gap-6">
          {/* Group Balances */}
          <Card className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <CardHeader
              title={
                <Box className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-gray-800" />
                  <Typography
                    variant="h6"
                    className="font-semibold text-gray-900"
                  >
                    Group Balances
                  </Typography>
                </Box>
              }
            />
            <CardContent className="flex flex-col gap-3">
              {groupBalances.length === 0 ? (
                <Typography
                  variant="body2"
                  className="text-gray-500 text-center py-10"
                >
                  No group balances yet
                </Typography>
              ) : (
                groupBalances.map((g) => (
                  <motion.div
                    key={g.groupId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <Card
                      variant="outlined"
                      className="rounded-xl border-gray-200"
                    >
                      <CardContent className="flex justify-between items-center">
                        <Box flex={1}>
                          <Typography
                            variant="h6"
                            className="font-semibold text-gray-900 mb-1"
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
                            <span>Unsettled: {g.unsettledExpensesCount}</span>
                            <Box className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Last:{" "}
                                {g.lastExpenseDate
                                  ? format(
                                      parseISO(g.lastExpenseDate),
                                      "yyyy-MM-dd"
                                    )
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
                            variant="outlined"
                            sx={{ borderColor: "black", color: "black", mb: 2 }}
                          />
                          <Box className="flex space-x-2">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Eye className="w-4 h-4" />}
                              onClick={() => openDetailed(g.groupId)}
                              sx={{
                                textTransform: "none",
                                borderColor: "black",
                                color: "black",
                              }}
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
                                backgroundColor: "black",
                                "&:hover": { backgroundColor: "#333" },
                              }}
                            >
                              Settle
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Urgent Debts */}
          <Card className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <CardHeader
              title={
                <Box className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-black" />
                  <Typography
                    variant="h6"
                    className="font-semibold text-gray-900"
                  >
                    Urgent Debts
                  </Typography>
                </Box>
              }
            />
            <CardContent className="flex flex-col gap-3">
              {urgentDebts.length === 0 ? (
                <Typography
                  variant="body2"
                  className="text-gray-500 text-center py-10"
                >
                  No urgent debts
                </Typography>
              ) : (
                urgentDebts.map((d) => (
                  <Alert
                    key={d.expenseId}
                    severity="warning"
                    className="rounded-xl border border-black"
                    icon={false}
                    sx={{ bgcolor: "transparent", color: "black" }}
                  >
                    <Typography
                      variant="subtitle2"
                      className="font-semibold mb-1"
                    >
                      {d.expenseDescription}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600 mb-2">
                      {d.groupName} • {d.payerName} • {d.daysOld} days old
                    </Typography>
                    <Typography variant="body2" className="font-medium mb-3">
                      You owe: ${d.userDebtAmount.toFixed(2)}
                    </Typography>
                    <Box display="flex" gap={2}>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: "black", color: "black" }}
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
                          backgroundColor: "black",
                          "&:hover": { backgroundColor: "#333" },
                          color: "white",
                        }}
                      >
                        Settle with {d.payerName}
                      </Button>
                    </Box>
                  </Alert>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={4} className="flex flex-col gap-6">
          {/* Recent Activity */}
          <Card className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <CardHeader
              title={
                <Typography
                  variant="h6"
                  className="font-semibold text-gray-900"
                >
                  Recent Activity
                </Typography>
              }
            />
            <CardContent className="flex flex-col gap-2">
              {recentActivity.length === 0 ? (
                <Typography
                  variant="body2"
                  className="text-gray-500 text-center py-10"
                >
                  No recent settlements
                </Typography>
              ) : (
                recentActivity.map((a) => (
                  <motion.div
                    key={a.settlementId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ y: -1 }}
                  >
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Box flex={1}>
                        <Typography
                          variant="subtitle2"
                          className="font-semibold text-gray-900"
                        >
                          {a.transactionType === "paid" ? "Paid" : "Received"}
                        </Typography>
                        <Typography variant="body2" className="text-gray-600">
                          {a.otherPartyName} • {a.groupName}
                        </Typography>
                        <Typography variant="caption" className="text-gray-500">
                          {isValid(new Date(a.createdAt))
                            ? format(new Date(a.createdAt), "PPpp")
                            : a.createdAt}
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
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-4">
            <Typography
              variant="h6"
              className="font-semibold text-gray-900 mb-4"
            >
              Group Balance Chart
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={groupBalances.map((g) => ({
                  name: g.groupName,
                  balance: g.netBalance,
                }))}
                margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  height={50}
                  stroke="#000"
                  fontSize={12}
                />
                <YAxis stroke="#000" fontSize={12} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2">
                          <p className="text-gray-900 font-medium">{d.name}</p>
                          <p className="text-sm text-gray-600">
                            ${d.balance.toFixed(2)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="balance"
                  fill="black"
                  radius={[6, 6, 0, 0]}
                  label={{ position: "top", fill: "#000", fontSize: 11 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

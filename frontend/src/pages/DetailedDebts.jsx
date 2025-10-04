"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Divider,
  Avatar,
  Chip,
} from "@mui/material";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DebtChart from "./DebtChart";
import { format, isValid, parseISO } from "date-fns";

const API_BASE_URL = "http://localhost:3005/api";

// Friendly labels for summary
const summaryLabels = {
  totalOwedToUser: "Total Owed To You",
  totalUserOwes: "Total You Owe",
  netBalance: "Net Balance",
  uniqueCreditors: "Unique Creditors",
  uniqueDebtor: "Unique Debtors",
  totalExpenseCount: "Total Expenses",
};

// TabPanel component
const TabPanel = ({ children, value, index }) => (
  <motion.div
    hidden={value !== index}
    initial={{ opacity: 0, y: 8 }}
    animate={value === index ? { opacity: 1, y: 0 } : {}}
    transition={{ duration: 0.25 }}
    className="mt-6"
  >
    {value === index && children}
  </motion.div>
);

export default function DetailedDebts() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(0);
  const [groupName, setGroupName] = useState("Group");

  // Fetch group name
  const fetchGroupName = async () => {
    if (!groupId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success && json.data.group?.name)
        setGroupName(json.data.group.name);
    } catch (err) {
      console.error("Failed to fetch group name:", err);
    }
  };

  useEffect(() => {
    fetchGroupName();
  }, [groupId]);

  const url = groupId ? `${API_BASE_URL}/debt/${groupId}/detailed` : null;

  const fetchDetailed = async () => {
    if (!url) {
      setError("No group selected.");
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load");
      setData(json.data);
    } catch (err) {
      toast.error(err.message || "Unknown error");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailed();
  }, [groupId]);

  if (loading) {
    return (
      <Container
        maxWidth="lg"
        className="py-10 flex items-center justify-center"
      >
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" className="py-10 text-center">
        <Typography color="error" className="mb-4">
          {error}
        </Typography>
        <Box className="flex justify-center gap-3">
          <Button onClick={() => navigate("/debt")} startIcon={<ArrowLeft />}>
            Back
          </Button>
          <Button
            onClick={fetchDetailed}
            startIcon={<RefreshCw />}
            variant="contained"
            sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" } }}
          >
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  if (!data) return null;

  const {
    summary = {},
    netBalances = {},
    peopleWhoOweUser = {},
    peopleUserOwes = {},
    settlementSuggestion = [],
  } = data;

  // Format currency
  const formatAmount = (amt) =>
    `$${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const sortedNetBalances = Object.values(netBalances).sort(
    (a, b) => b.netAmount - a.netAmount
  );

  return (
    <Container maxWidth="lg" className="py-10">
      {/* Header */}
      <Box className="mb-6 flex items-center justify-between">
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => navigate("/debt")}
          sx={{ textTransform: "none" }}
        >
          Back
        </Button>
        <Typography variant="h5" className="font-semibold text-black">
          Detailed Debts — {groupName}
        </Typography>
        <Button
          startIcon={<RefreshCw />}
          onClick={fetchDetailed}
          sx={{ textTransform: "none" }}
        >
          Refresh
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          "& .MuiTab-root": { textTransform: "none", fontWeight: 500 },
          "& .Mui-selected": { color: "black" },
          "& .MuiTabs-indicator": { backgroundColor: "black" },
        }}
      >
        <Tab label="Summary" />
        <Tab label="Net Balances" />
        <Tab label="People Who Owe You" />
        <Tab label="People You Owe" />
        <Tab label="Suggestions" />
        <Tab label="Chart" />
      </Tabs>

      {/* Summary Tab */}
      <TabPanel value={tab} index={0}>
        <Box className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {Object.entries(summary).map(([k, v]) => {
            let bgColor = "bg-gray-50";
            let textColor = "text-gray-800";
            let icon = null;

            switch (k) {
              case "totalOwedToUser":
                bgColor = "bg-green-50";
                textColor = "text-green-800";
                icon = <TrendingUp size={20} className="text-green-600" />;
                break;
              case "totalUserOwes":
                bgColor = "bg-red-50";
                textColor = "text-red-800";
                icon = <TrendingDown size={20} className="text-red-600" />;
                break;
              case "netBalance":
                bgColor = v >= 0 ? "bg-green-100" : "bg-red-100";
                textColor = v >= 0 ? "text-green-800" : "text-red-800";
                icon = (
                  <Users
                    size={20}
                    className={v >= 0 ? "text-green-600" : "text-red-600"}
                  />
                );
                break;
              default:
                bgColor = "bg-gray-50";
                textColor = "text-gray-800";
            }

            return (
              <Paper
                key={k}
                className={`${bgColor} p-5 flex flex-col items-center justify-center rounded-xl shadow hover:shadow-md transition`}
              >
                <Box className="flex items-center gap-2 mb-2">
                  {icon}
                  <Typography className="text-sm font-medium">
                    {summaryLabels[k] || k}
                  </Typography>
                </Box>
                <Typography className={`font-bold text-2xl ${textColor}`}>
                  {typeof v === "number" ? formatAmount(v) : v}
                </Typography>
              </Paper>
            );
          })}
        </Box>
      </TabPanel>

      {/* Net Balances Tab */}
      <TabPanel value={tab} index={1}>
        {sortedNetBalances.map((b, idx) => (
          <Paper
            key={idx}
            className="p-5 rounded-2xl shadow-sm border border-gray-200 mb-3 flex items-center gap-4 hover:shadow-md transition"
          >
            <Avatar
              src={b.person?.profilePicUrl}
              alt={b.person?.name}
              sx={{ width: 56, height: 56 }}
            />
            <Box flex={1}>
              <Typography className="font-semibold text-lg">
                {b.person?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {b.group?.name} • You owe: {formatAmount(b.userOwes)} • They
                owe: {formatAmount(b.theyOwe)}
              </Typography>
            </Box>
            <Box className="flex flex-col items-center justify-center gap-1">
              <Chip
                label={b.netAmount >= 0 ? "You are owed" : "You owe"}
                color={b.netAmount >= 0 ? "success" : "error"}
                sx={{ fontWeight: "bold", fontSize: 12 }}
              />
              <Typography
                className={`font-bold text-xl ${
                  b.netAmount >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {b.netAmount >= 0 ? "+" : "-"}
                {formatAmount(Math.abs(b.netAmount))}
              </Typography>
            </Box>
          </Paper>
        ))}
      </TabPanel>

      {/* People Who Owe You */}
      <TabPanel value={tab} index={2}>
        {Object.values(peopleWhoOweUser).length > 0 ? (
          Object.values(peopleWhoOweUser).map((p, idx) => (
            <Paper
              key={idx}
              className="p-5 rounded-2xl shadow-sm border border-gray-200 mb-3 hover:shadow-md transition"
            >
              <Box className="flex items-center gap-2 mb-2">
                <Avatar src={p.person?.profilePicUrl} alt={p.person?.name} />
                <Typography className="font-medium">
                  {p.person?.name} — {p.group?.name}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                className="mb-2"
              >
                Total Owed: {formatAmount(p.totalAmount)} • {p.expenseCount}{" "}
                expenses
              </Typography>
              <Divider className="mb-2" />
              {p.expenses?.map((e, i) => (
                <Box
                  key={i}
                  className={`flex justify-between items-center p-2 mb-1 rounded ${
                    e.isOverdue
                      ? "border-l-4 border-red-600 bg-red-50"
                      : "border-l-4 border-green-50"
                  }`}
                >
                  <span className="text-sm">
                    {e.description} (
                    {isValid(parseISO(e.expenseDate))
                      ? format(parseISO(e.expenseDate), "PP")
                      : e.expenseDate}
                    )
                  </span>
                  <span className="font-semibold">
                    {formatAmount(e.debtAmount)}
                  </span>
                </Box>
              ))}
            </Paper>
          ))
        ) : (
          <Typography className="mt-4">No debts.</Typography>
        )}
      </TabPanel>

      {/* People You Owe */}
      <TabPanel value={tab} index={3}>
        {Object.values(peopleUserOwes).length > 0 ? (
          Object.values(peopleUserOwes).map((p, idx) => (
            <Paper
              key={idx}
              className="p-5 rounded-2xl shadow-sm border border-gray-200 mb-3 hover:shadow-md transition"
            >
              <Box className="flex items-center gap-2 mb-2">
                <Avatar src={p.person?.profilePicUrl} alt={p.person?.name} />
                <Typography className="font-medium">
                  {p.person?.name} — {p.group?.name}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                className="mb-2"
              >
                Total You Owe: {formatAmount(p.totalAmount)} • {p.expenseCount}{" "}
                expenses
              </Typography>
              <Divider className="mb-2" />
              {p.expenses?.map((e, i) => (
                <Box
                  key={i}
                  className={`flex justify-between items-center p-2 mb-1 rounded ${
                    e.isOverdue
                      ? "border-l-4 border-red-600 bg-red-50 text-red-700"
                      : "border-l-4 border-green-600 bg-green-50 text-green-700"
                  }`}
                >
                  <span className="text-sm">
                    {e.description} (
                    {isValid(parseISO(e.expenseDate))
                      ? format(parseISO(e.expenseDate), "PP")
                      : e.expenseDate}
                    )
                  </span>
                  <span className="font-semibold">
                    {formatAmount(e.debtAmount)}
                  </span>
                </Box>
              ))}
            </Paper>
          ))
        ) : (
          <Typography className="mt-4">No debts.</Typography>
        )}
      </TabPanel>

      {/* Settlement Suggestions */}
      <TabPanel value={tab} index={4}>
        {settlementSuggestion.length > 0 ? (
          <Box className="mt-4 grid grid-cols-1 gap-3">
            {settlementSuggestion.map((s, i) => (
              <Paper
                key={i}
                className="p-4 flex justify-between items-center rounded-xl shadow hover:shadow-md transition border border-gray-200"
              >
                <Typography>{s}</Typography>
                <Button
                  size="small"
                  variant="contained"
                  sx={{ bgcolor: "black", "&:hover": { bgcolor: "#333" } }}
                  onClick={() =>
                    navigate(
                      `/settlements/settle/create/${s.groupId}/${s.toUserId}`
                    )
                  }
                >
                  Settle Now
                </Button>
              </Paper>
            ))}
          </Box>
        ) : (
          <Typography className="mt-4">
            No settlement suggestions available.
          </Typography>
        )}
      </TabPanel>

      {/* Chart */}
      <TabPanel value={tab} index={5}>
        <DebtChart netBalances={sortedNetBalances} />
      </TabPanel>
    </Container>
  );
}

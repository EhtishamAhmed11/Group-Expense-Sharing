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
} from "@mui/material";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
} from "lucide-react";
import { toast } from "react-hot-toast";
import DebtChart from "./DebtChart";

const API_BASE_URL = "http://localhost:3005/api";

export default function DetailedDebts() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

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
    netBalances = {},
    peopleWhoOweUser = {},
    peopleUserOwes = {},
    settlementSuggestion = [],
    summary = {},
  } = data;

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
        <Typography variant="h5" className="font-semibold">
          Detailed Debts — Group {groupId}
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

      {/* Panels */}
      <TabPanel value={tab} index={0}>
        <Paper className="p-6 rounded-2xl shadow-sm border border-gray-200">
          <Typography variant="h6" className="mb-4 font-semibold">
            Summary
          </Typography>
          <Box className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(summary).map(([k, v]) => (
              <Box
                key={k}
                className="p-4 rounded-xl bg-gray-50 flex flex-col items-center"
              >
                <Typography className="capitalize text-sm text-gray-600">
                  {k.replace(/([A-Z])/g, " $1")}
                </Typography>
                <Typography className="font-bold text-lg">
                  {typeof v === "number" ? `$${v}` : v}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        {Object.values(netBalances).map((b, idx) => (
          <Paper
            key={idx}
            className="p-5 rounded-2xl shadow-sm border border-gray-200 mb-3"
          >
            <Box className="flex justify-between items-center">
              <Box>
                <Typography className="font-medium">
                  {b.person?.name} — {b.group?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  You owe: ${b.userOwes} • They owe: ${b.theyOwe}
                </Typography>
              </Box>
              <Typography
                className={`font-bold ${
                  b.netAmount < 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {b.netAmount < 0 ? "-" : "+"}${Math.abs(b.netAmount)}
              </Typography>
            </Box>
          </Paper>
        ))}
      </TabPanel>

      <TabPanel value={tab} index={2}>
        {Object.values(peopleWhoOweUser).map((p, idx) => (
          <Paper
            key={idx}
            className="p-5 rounded-2xl shadow-sm border border-gray-200 mb-3"
          >
            <Typography className="font-medium mb-2">
              {p.person?.name} — {p.group?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mb-2">
              Total Owed: ${p.totalAmount} • {p.expenseCount} expenses
            </Typography>
            <Divider className="mb-2" />
            {p.expenses?.map((e, i) => (
              <Box
                key={i}
                className="flex justify-between text-sm text-gray-700 mb-1"
              >
                <span>{e.description}</span>
                <span>${e.debtAmount}</span>
              </Box>
            ))}
          </Paper>
        ))}
      </TabPanel>

      <TabPanel value={tab} index={3}>
        {Object.values(peopleUserOwes).map((p, idx) => (
          <Paper
            key={idx}
            className="p-5 rounded-2xl shadow-sm border border-gray-200 mb-3"
          >
            <Typography className="font-medium mb-2">
              {p.person?.name} — {p.group?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mb-2">
              Total You Owe: ${p.totalAmount} • {p.expenseCount} expenses
            </Typography>
            <Divider className="mb-2" />
            {p.expenses?.map((e, i) => (
              <Box
                key={i}
                className="flex justify-between text-sm text-gray-700 mb-1"
              >
                <span>{e.description}</span>
                <span>${e.debtAmount}</span>
              </Box>
            ))}
          </Paper>
        ))}
      </TabPanel>

      <TabPanel value={tab} index={4}>
        {settlementSuggestion.length > 0 ? (
          <Paper className="p-6 rounded-2xl shadow-sm border border-gray-200">
            <Typography className="mb-3 font-medium">
              Settlement Suggestions
            </Typography>
            <ul className="list-disc pl-5 text-gray-700">
              {settlementSuggestion.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Paper>
        ) : (
          <Typography>No settlement suggestions available.</Typography>
        )}
      </TabPanel>

      <TabPanel value={tab} index={5}>
        <DebtChart netBalances={Object.values(netBalances)} />
      </TabPanel>
    </Container>
  );
}

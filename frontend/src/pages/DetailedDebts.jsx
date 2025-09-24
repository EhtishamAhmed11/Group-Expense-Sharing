"use client";

// DetailedDebts.jsx
import { useEffect, useState } from "react";
import DebtChart from "./DebtChart";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Container,
  Paper,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Handshake,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE_URL = "http://localhost:3005/api";

export default function DetailedDebts() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const url = groupId ? `${API_BASE_URL}/debt/${groupId}/detailed` : null;

  const fetchDetailed = async () => {
    if (!url) {
      setError("No group selected. Open a group to view detailed debts.");
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(url, { method: "GET", credentials: "include" });
      const json = await res.json();

      if (!json.success) throw new Error(json.message || "Failed to load");
      setData(json.data);
    } catch (err) {
      const errorMsg = err.message || "Unknown error";
      setError(errorMsg);
      setData(null);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchTerm("");
    setDebouncedSearch("");
    setOverdueOnly(false);
    setMinAmount("");
    setRoleFilter("all");
    fetchDetailed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  if (loading) {
    return (
      <Container maxWidth="xl" className="py-8">
        <Box className="flex items-center justify-center h-64 space-x-3">
          <CircularProgress size={28} />
          <Typography variant="body2" className="text-gray-500">
            Loading detailed debts...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" className="py-8">
        <Alert severity="error" className="rounded-lg mb-4">
          {error}
        </Alert>
        <Box className="flex space-x-2">
          <Button
            variant="outlined"
            startIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate("/debt")}
            sx={{ textTransform: "none" }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => fetchDetailed()}
            sx={{ textTransform: "none" }}
          >
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxWidth="xl" className="py-8">
        <Typography variant="body2" className="text-gray-500 text-center py-8">
          No data to show.
        </Typography>
        <Box className="flex justify-center space-x-2">
          <Button
            variant="outlined"
            startIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate("/debt")}
            sx={{ textTransform: "none" }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => fetchDetailed()}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
        </Box>
      </Container>
    );
  }

  const rawNetBalances = Object.values(data.netBalances || {});
  const rawPeopleOweUser = Object.values(data.peopleWhoOweUser || {});
  const rawPeopleUserOwes = Object.values(data.peopleUserOwes || {});

  const matches = (text, q) =>
    text && q ? String(text).toLowerCase().includes(q) : false;

  const overdueMap = {};
  const addOverdueInfo = (entry) => {
    if (!entry?.person || !entry?.group || !Array.isArray(entry.expenses))
      return;
    const key = `${entry.person.id}_${entry.group.id}`;
    overdueMap[key] = entry.expenses.some((e) => !!e.isOverdue);
  };
  rawPeopleOweUser.forEach(addOverdueInfo);
  rawPeopleUserOwes.forEach(addOverdueInfo);

  const totalAmountForEntry = (entry) =>
    entry?.totalAmount ??
    (Array.isArray(entry?.expenses)
      ? entry.expenses.reduce(
          (s, e) => s + (Number.parseFloat(e.debtAmount) || 0),
          0
        )
      : 0);

  const minAmountNum = Number.parseFloat(minAmount);
  const hasMinAmount = !Number.isNaN(minAmountNum) && minAmount !== "";
  const q = debouncedSearch;

  const filterNetBalances = (arr) =>
    arr.filter((b) => {
      if (roleFilter === "user_owes" && b.netPosition !== "user_owes")
        return false;
      if (roleFilter === "user_is_owed" && b.netPosition !== "user_is_owed")
        return false;
      if (hasMinAmount && Math.abs(b.netAmount || 0) < minAmountNum)
        return false;
      if (overdueOnly && !overdueMap[`${b.person.id}_${b.group.id}`])
        return false;
      if (!q) return true;
      return matches(b.person?.name, q) || matches(b.group?.name, q);
    });

  const filterPeopleList = (arr) =>
    arr.filter((entry) => {
      let netPos = "settled";
      const theyOwe = Number.parseFloat(entry.theyOwe || 0);
      const userOwes = Number.parseFloat(entry.userOwes || 0);
      const netAmount = theyOwe - userOwes;
      if (netAmount > 0) netPos = "user_is_owed";
      else if (netAmount < 0) netPos = "user_owes";

      if (roleFilter === "user_owes" && netPos !== "user_owes") return false;
      if (roleFilter === "user_is_owed" && netPos !== "user_is_owed")
        return false;
      if (hasMinAmount && Math.abs(totalAmountForEntry(entry)) < minAmountNum)
        return false;
      if (overdueOnly && !overdueMap[`${entry.person.id}_${entry.group.id}`])
        return false;

      if (!q) return true;
      if (matches(entry.person?.name, q) || matches(entry.group?.name, q))
        return true;
      return Array.isArray(entry.expenses)
        ? entry.expenses.some((e) => matches(e.description, q))
        : false;
    });

  const netBalancesArray = filterNetBalances(rawNetBalances);
  const peopleOweUser = filterPeopleList(rawPeopleOweUser);
  const peopleUserOwes = filterPeopleList(rawPeopleUserOwes);

  return (
    <Container maxWidth="xl" className="py-8">
      {/* Header */}
      <Box className="mb-6">
        <Button
          startIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate("/debt")}
          className="mb-4 text-gray-600"
          sx={{ textTransform: "none" }}
        >
          Back to Debt Summary
        </Button>

        <Typography variant="h4" className="font-bold text-gray-900 mb-2">
          Detailed Debts - Group {groupId}
        </Typography>
        <Typography variant="body2" className="text-gray-600">
          Comprehensive view of all debts and balances in this group
        </Typography>
      </Box>

      {/* Filters */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardContent className="p-4">
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by person, group or expense..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <Search className="w-4 h-4 mr-2 text-gray-500" />
                  ),
                }}
                variant="outlined"
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Min Amount"
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0.00"
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <DollarSign className="w-4 h-4 mr-1 text-gray-500" />
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Role Filter</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  label="Role Filter"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="user_owes">You owe</MenuItem>
                  <MenuItem value="user_is_owed">You're owed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={overdueOnly}
                    onChange={(e) => setOverdueOnly(e.target.checked)}
                    color="warning"
                  />
                }
                label="Overdue only"
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <Box className="flex space-x-2">
                {searchTerm && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSearchTerm("")}
                    sx={{ textTransform: "none" }}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={() => fetchDetailed()}
                  sx={{ textTransform: "none" }}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Handshake className="w-4 h-4" />}
                  onClick={() =>
                    navigate(`/settlements/create?groupId=${groupId}`)
                  }
                  className="bg-green-600 hover:bg-green-700"
                  sx={{
                    textTransform: "none",
                    backgroundColor: "rgb(34, 197, 94)",
                    "&:hover": { backgroundColor: "rgb(21, 128, 61)" },
                  }}
                >
                  Settle Group
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={4}>
        {/* Left Column - Detailed Lists */}
        <Grid item xs={12} lg={8}>
          {/* Net Balances */}
          <Card className="rounded-xl shadow-sm mb-6">
            <CardHeader className="pb-4">
              <Box className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-600" />
                <Typography variant="h6" className="font-semibold">
                  Net Balances ({netBalancesArray.length})
                </Typography>
              </Box>
            </CardHeader>

            <CardContent>
              {netBalancesArray.length === 0 ? (
                <Typography
                  variant="body2"
                  className="text-gray-500 text-center py-8"
                >
                  No balances found with current filters.
                </Typography>
              ) : (
                <motion.div className="space-y-3">
                  {netBalancesArray.map((b, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg"
                    >
                      <CardContent className="p-4">
                        <Box className="flex items-center justify-between">
                          <Box className="flex-1">
                            <Typography
                              variant="h6"
                              className="font-semibold mb-1"
                            >
                              {b.person.name} — {b.group.name}
                            </Typography>

                            <Box className="grid grid-cols-2 gap-4 mb-3">
                              <Box>
                                <Typography
                                  variant="body2"
                                  className="text-gray-600"
                                >
                                  You owe:{" "}
                                  <span className="font-medium text-red-600">
                                    ${b.userOwes.toFixed(2)}
                                  </span>
                                </Typography>
                              </Box>
                              <Box>
                                <Typography
                                  variant="body2"
                                  className="text-gray-600"
                                >
                                  They owe:{" "}
                                  <span className="font-medium text-green-600">
                                    ${b.theyOwe.toFixed(2)}
                                  </span>
                                </Typography>
                              </Box>
                            </Box>

                            {overdueMap[`${b.person.id}_${b.group.id}`] && (
                              <Chip
                                label="Has overdue expenses"
                                size="small"
                                color="error"
                                variant="outlined"
                                icon={<AlertTriangle className="w-3 h-3" />}
                              />
                            )}
                          </Box>

                          <Box className="text-right ml-4">
                            <Typography
                              variant="h6"
                              className={`font-bold mb-1 ${
                                b.netAmount >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              ${Math.abs(b.netAmount).toFixed(2)}
                            </Typography>
                            <Chip
                              label={
                                b.netPosition === "user_is_owed"
                                  ? "You're owed"
                                  : "You owe"
                              }
                              size="small"
                              color={
                                b.netPosition === "user_is_owed"
                                  ? "success"
                                  : "error"
                              }
                              variant="outlined"
                              className="mb-3"
                            />

                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Handshake className="w-4 h-4" />}
                              onClick={() =>
                                navigate(
                                  `/settlements/create?groupId=${groupId}&otherUserId=${b.person.id}`
                                )
                              }
                              className="bg-blue-600 hover:bg-blue-700"
                              sx={{
                                textTransform: "none",
                                backgroundColor: "rgb(37, 99, 235)",
                                "&:hover": {
                                  backgroundColor: "rgb(29, 78, 216)",
                                },
                              }}
                            >
                              Settle with {b.person.name}
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* People who owe user */}
          <Card className="rounded-xl shadow-sm mb-6">
            <CardHeader className="pb-4">
              <Box className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <Typography variant="h6" className="font-semibold">
                  People Who Owe You ({peopleOweUser.length})
                </Typography>
              </Box>
            </CardHeader>

            <CardContent>
              {peopleOweUser.length === 0 ? (
                <Typography
                  variant="body2"
                  className="text-gray-500 text-center py-8"
                >
                  No one owes you money with current filters.
                </Typography>
              ) : (
                <motion.div className="space-y-4">
                  {peopleOweUser.map((p, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg border border-green-200"
                    >
                      <AccordionSummary
                        expandIcon={<ChevronDown className="w-4 h-4" />}
                      >
                        <Box className="flex items-center justify-between w-full mr-4">
                          <Box>
                            <Typography variant="h6" className="font-semibold">
                              {p.person.name} — {p.group.name}
                            </Typography>
                            <Typography
                              variant="body2"
                              className="text-gray-600"
                            >
                              Total owed: ${totalAmountForEntry(p).toFixed(2)} •{" "}
                              {p.expenseCount} expenses
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<Handshake className="w-4 h-4" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/settlements/create?groupId=${groupId}&otherUserId=${p.person.id}`
                              );
                            }}
                            className="bg-green-600 hover:bg-green-700"
                            sx={{
                              textTransform: "none",
                              backgroundColor: "rgb(34, 197, 94)",
                              "&:hover": {
                                backgroundColor: "rgb(21, 128, 61)",
                              },
                            }}
                          >
                            Settle
                          </Button>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box className="space-y-3">
                          {p.expenses.map((e) => (
                            <Paper
                              key={e.expenseId}
                              variant="outlined"
                              className="p-3 rounded-lg"
                            >
                              <Box className="flex items-center justify-between">
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    className="font-semibold"
                                  >
                                    {e.description}
                                  </Typography>
                                  <Box className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      {e.expenseDate
                                        ? e.expenseDate.split("T")[0]
                                        : "-"}
                                    </span>
                                    {e.isOverdue && (
                                      <Chip
                                        label="Overdue"
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                      />
                                    )}
                                  </Box>
                                </Box>
                                <Typography
                                  variant="h6"
                                  className="font-bold text-green-600"
                                >
                                  ${e.debtAmount.toFixed(2)}
                                </Typography>
                              </Box>
                            </Paper>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* People user owes */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-4">
              <Box className="flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <Typography variant="h6" className="font-semibold">
                  People You Owe ({peopleUserOwes.length})
                </Typography>
              </Box>
            </CardHeader>

            <CardContent>
              {peopleUserOwes.length === 0 ? (
                <Typography
                  variant="body2"
                  className="text-gray-500 text-center py-8"
                >
                  You don't owe anyone money with current filters.
                </Typography>
              ) : (
                <motion.div className="space-y-4">
                  {peopleUserOwes.map((p, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg border border-red-200"
                    >
                      <AccordionSummary
                        expandIcon={<ChevronDown className="w-4 h-4" />}
                      >
                        <Box className="flex items-center justify-between w-full mr-4">
                          <Box>
                            <Typography variant="h6" className="font-semibold">
                              {p.person.name} — {p.group.name}
                            </Typography>
                            <Typography
                              variant="body2"
                              className="text-gray-600"
                            >
                              Total you owe: $
                              {totalAmountForEntry(p).toFixed(2)} •{" "}
                              {p.expenseCount} expenses
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<DollarSign className="w-4 h-4" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/settlements/create?groupId=${groupId}&otherUserId=${p.person.id}`
                              );
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            sx={{
                              textTransform: "none",
                              backgroundColor: "rgb(239, 68, 68)",
                              "&:hover": {
                                backgroundColor: "rgb(220, 38, 38)",
                              },
                            }}
                          >
                            Pay {p.person.name}
                          </Button>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box className="space-y-3">
                          {p.expenses.map((e) => (
                            <Paper
                              key={e.expenseId}
                              variant="outlined"
                              className="p-3 rounded-lg"
                            >
                              <Box className="flex items-center justify-between">
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    className="font-semibold"
                                  >
                                    {e.description}
                                  </Typography>
                                  <Box className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      {e.expenseDate
                                        ? e.expenseDate.split("T")[0]
                                        : "-"}
                                    </span>
                                    {e.isOverdue && (
                                      <Chip
                                        label="Overdue"
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                      />
                                    )}
                                  </Box>
                                </Box>
                                <Typography
                                  variant="h6"
                                  className="font-bold text-red-600"
                                >
                                  ${e.debtAmount.toFixed(2)}
                                </Typography>
                              </Box>
                            </Paper>
                          ))}
                        </Box>
                      </AccordionDetails>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Chart & Suggestions */}
        <Grid item xs={12} lg={4}>
          {/* Chart */}
          <Box className="mb-6">
            <DebtChart
              netBalances={netBalancesArray.map((b) => ({
                key: `${b.person.id}_${b.group.id}`,
                label: `${b.person.name} (${b.group.name})`,
                amount: b.netAmount,
              }))}
            />
          </Box>

          {/* Settlement Suggestions */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-4">
              <Typography variant="h6" className="font-semibold">
                Settlement Suggestions
              </Typography>
            </CardHeader>

            <CardContent>
              {data.settlementSuggestion?.length ? (
                <Box className="space-y-2">
                  {data.settlementSuggestion.map((s, i) => (
                    <Paper
                      key={i}
                      variant="outlined"
                      className="p-3 rounded-lg"
                    >
                      <Typography variant="body2" className="text-gray-700">
                        {s}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  className="text-gray-500 text-center py-8"
                >
                  No settlement suggestions available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Grid,
  Chip,
  CircularProgress,
  Box,
  Pagination,
  Button,
} from "@mui/material";
import {
  Plus,
  Search,
  DollarSign,
  Users,
  User,
  Calendar,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const GroupExpenses = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState({
    category: "",
    paidBy: "",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    settlementStatus: "",
    sortBy: "expense_date",
    sortOrder: "DESC",
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalExpenses: 0,
  });

  const [members, setMembers] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit, search, ...filters });

      const res = await fetch(
        `http://localhost:3005/api/group-expense/${groupId}/expenses?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          credentials: "include",
        }
      );

      const data = await res.json();
      if (data.success) {
        setExpenses(data.data.expenses || []);
        setSummary(data.data.summary || null);
        if (data.data.pagination) {
          setPagination(data.data.pagination);
          setPage(data.data.pagination.currentPage);
        }
      } else {
        toast.error(data.message || "Failed to fetch expenses");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while fetching expenses");
    } finally {
      setLoading(false);
    }
  };

  // Fetch group members & categories
  const fetchGroupDetails = async () => {
    try {
      const [membersRes, categoriesRes] = await Promise.all([
        fetch(`http://localhost:3005/api/groups/members/${groupId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          credentials: "include",
        }),
        fetch(`http://localhost:3005/api/expense/get-categories`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          credentials: "include",
        }),
      ]);

      const membersData = await membersRes.json();
      console.log(membersData);
      const categoriesData = await categoriesRes.json();

      if (membersData.success) {
        setMembers(membersData.data?.members || []);
      }

      if (categoriesData.success) {
        const categories = Array.isArray(categoriesData.data?.categories)
          ? categoriesData.data.categories
          : [];
        setCategoryOptions(categories);
      }
    } catch (err) {
      console.error("Error fetching group details:", err);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchExpenses();
      fetchGroupDetails();
    }
  }, [groupId, page, search, filters]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <Box className="mb-8 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
        <Box>
          <Typography
            variant="h4"
            className="font-bold flex items-center gap-3"
          >
            <Users className="w-8 h-8 text-black" />
            Group Expenses
          </Typography>
          <Typography variant="body1" className="text-gray-600 mt-1">
            Manage and track expenses for your group
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate(`/groups/${groupId}/expenses/create`)}
          sx={{
            borderColor: "black",
            color: "black",
            textTransform: "none",
            fontWeight: "bold",
            "&:hover": { bgcolor: "black", color: "white" },
          }}
        >
          Add New Expense
        </Button>
      </Box>

      {/* Search & Filters */}
      <Card className="mb-6 shadow-sm">
        <CardHeader title="Search & Filters" />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <Search className="w-4 h-4 text-gray-400 mr-2" />
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    label="Category"
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    label="Paid By"
                    name="paidBy"
                    value={filters.paidBy}
                    onChange={handleFilterChange}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="From"
                    name="dateFrom"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateFrom}
                    onChange={handleFilterChange}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="To"
                    name="dateTo"
                    InputLabelProps={{ shrink: true }}
                    value={filters.dateTo}
                    onChange={handleFilterChange}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Expenses */}
      {loading ? (
        <Box className="flex items-center justify-center min-h-64 py-12">
          <CircularProgress />
          <Typography variant="body2" className="ml-3 text-gray-600">
            Loading expenses...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Summary */}
          {summary && (
            <Card className="mb-6 shadow-sm">
              <CardHeader title="Summary" />
              <CardContent>
                <Grid container spacing={4}>
                  <Grid item xs={6} sm={3}>
                    <Box className="text-center">
                      <Typography variant="h5" className="font-bold text-black">
                        {summary?.totalExpenses ?? 0}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Total Expenses
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box className="text-center">
                      <Typography variant="h5" className="font-bold text-black">
                        ${summary?.totalAmount ?? 0}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Total Amount
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box className="text-center">
                      <Typography variant="h5" className="font-bold text-black">
                        ${summary?.totalUnsettled ?? 0}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Unsettled Amount
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box className="text-center">
                      <Typography variant="h5" className="font-bold text-black">
                        ${summary?.averageExpense ?? 0}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Average Expense
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Expense List */}
          {expenses.map((exp) => (
            <motion.div
              key={exp.expense_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="mb-4 shadow-sm hover:shadow-md transition">
                <CardHeader
                  title={
                    <Box className="flex items-center justify-between">
                      <Typography variant="h6" className="font-semibold">
                        {exp?.description ?? "No Description"}
                      </Typography>
                      <Typography variant="h6" className="font-bold text-black">
                        ${exp?.amount ?? "0.00"}
                      </Typography>
                    </Box>
                  }
                  subheader={
                    <Box className="flex flex-wrap gap-3 mt-2 items-center">
                      <Chip
                        icon={<Tag className="w-4 h-4" />}
                        label={exp?.category_name ?? "No Category"}
                        size="small"
                        sx={{
                          bgcolor: exp?.category_color ?? "transparent",
                          color: exp?.category_color ? "white" : "black",
                          border: "1px solid black",
                        }}
                      />
                      <Chip
                        icon={<User className="w-4 h-4" />}
                        label={
                          exp?.has_multiple_payers
                            ? `Paid by: ${exp?.payer_details
                                .map(
                                  (p) =>
                                    `${p.first_name} ${p.last_name} ($${p.amount_paid})`
                                )
                                .join(", ")}`
                            : `Paid by: ${exp?.payer_first_name ?? ""} ${
                                exp?.payer_last_name ?? ""
                              }`
                        }
                        size="small"
                        sx={{
                          borderColor: "black",
                          color: "black",
                          "& .MuiChip-icon": { color: "black" },
                        }}
                      />
                      <Chip
                        icon={<Calendar className="w-4 h-4" />}
                        label={
                          exp?.expense_date
                            ? format(new Date(exp.expense_date), "PP")
                            : "No Date"
                        }
                        size="small"
                        sx={{
                          borderColor: "black",
                          color: "black",
                          "& .MuiChip-icon": { color: "black" },
                        }}
                      />
                      <Chip
                        icon={<DollarSign className="w-4 h-4" />}
                        label={exp?.is_settled ? "Settled" : "Pending"}
                        size="small"
                        sx={{
                          bgcolor: exp?.is_settled ? "black" : "white",
                          color: exp?.is_settled ? "white" : "black",
                          border: "1px solid black",
                        }}
                      />
                      {exp?.split_type && (
                        <Chip
                          label={`Split: ${exp.split_type}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                />
                <CardContent>
                  {exp?.notes && (
                    <Typography variant="body2" className="text-gray-600 mb-2">
                      Notes: {exp.notes}
                    </Typography>
                  )}
                  {exp?.category_description && (
                    <Typography variant="body2" className="text-gray-500 mb-2">
                      Category Details: {exp.category_description}
                    </Typography>
                  )}
                  {/* Show Split Details */}
                  {exp?.split_details?.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="subtitle2" className="mb-1">
                        Split Details:
                      </Typography>
                      <Grid container spacing={1}>
                        {exp.split_details.map((s) => {
                          const member = members.find(
                            (m) => m.id === s.user_id
                          );
                          return (
                            <Grid item key={s.user_id} xs={6} sm={4}>
                              <Chip
                                label={`${member?.first_name ?? "Unknown"} ${
                                  member?.last_name ?? ""
                                }: $${s.amount}`}
                                size="small"
                                sx={{
                                  border: "1px solid black",
                                  color: "black",
                                }}
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Pagination */}
          {pagination?.totalPages > 1 && (
            <Box className="flex justify-center mt-6">
              <Pagination
                count={pagination.totalPages}
                page={page}
                onChange={(e, newPage) => setPage(newPage)}
                sx={{
                  "& .MuiPaginationItem-root": {
                    color: "black",
                    border: "1px solid black",
                  },
                  "& .Mui-selected": {
                    bgcolor: "black !important",
                    color: "white !important",
                  },
                }}
              />
            </Box>
          )}
        </>
      )}
    </div>
  );
};

export default GroupExpenses;

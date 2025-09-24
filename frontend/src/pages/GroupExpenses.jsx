"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  CircularProgress,
  Box,
  Pagination,
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

// ✅ Import your CreateExpense Dialog
import CreateExpense from "./createExpense";

const GroupExpenses = () => {
  const { groupId } = useParams();
  const { user } = useAuth();

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

  // ✅ Control CreateExpense Dialog
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        search,
        ...filters,
      });

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
        if (data.data.pagination) setPagination(data.data.pagination);
      } else {
        toast.error("Failed to fetch expenses");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while fetching expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) fetchExpenses();
  }, [groupId, page, search, filters]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handlePageChange = (event, newPage) => setPage(newPage);

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
          onClick={() => setOpenExpenseDialog(true)} // ✅ Open dialog
          sx={{
            borderColor: "black",
            color: "black",
            textTransform: "none",
            fontWeight: "bold",
            "&:hover": {
              bgcolor: "black",
              color: "white",
            },
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
                onChange={handleSearchChange}
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
                        {summary.totalExpenses}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Total Expenses
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box className="text-center">
                      <Typography variant="h5" className="font-bold text-black">
                        ${summary.totalAmount}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Total Amount
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box className="text-center">
                      <Typography variant="h5" className="font-bold text-black">
                        ${summary.totalUnsettled}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        Unsettled Amount
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box className="text-center">
                      <Typography variant="h5" className="font-bold text-black">
                        ${summary.averageExpense}
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
                        {exp.description}
                      </Typography>
                      <Typography variant="h6" className="font-bold text-black">
                        ${exp.amount}
                      </Typography>
                    </Box>
                  }
                  subheader={
                    <Box className="flex flex-wrap gap-3 mt-2 items-center">
                      <Chip
                        icon={<Tag className="w-4 h-4" />}
                        label={exp.category_name || "No Category"}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<User className="w-4 h-4" />}
                        label={`Paid by: ${exp.payer_first_name} ${exp.payer_last_name}`}
                        size="small"
                        sx={{
                          borderColor: "black",
                          color: "black",
                          "& .MuiChip-icon": { color: "black" },
                        }}
                      />
                      <Chip
                        icon={<Calendar className="w-4 h-4" />}
                        label={format(new Date(exp.expense_date), "PP")}
                        size="small"
                        sx={{
                          borderColor: "black",
                          color: "black",
                          "& .MuiChip-icon": { color: "black" },
                        }}
                      />
                      <Chip
                        icon={<DollarSign className="w-4 h-4" />}
                        label={exp.is_settled ? "Settled" : "Pending"}
                        size="small"
                        sx={{
                          bgcolor: exp.is_settled ? "black" : "white",
                          color: exp.is_settled ? "white" : "black",
                          border: "1px solid black",
                        }}
                      />
                      {exp.split_type && (
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
                  {exp.notes && (
                    <Typography variant="body2" className="text-gray-600 mb-2">
                      Notes: {exp.notes}
                    </Typography>
                  )}
                  {exp.category_description && (
                    <Typography variant="body2" className="text-gray-500">
                      Category Details: {exp.category_description}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Box className="flex justify-center mt-6">
              <Pagination
                count={pagination.totalPages}
                page={pagination.currentPage}
                onChange={handlePageChange}
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

      {/* ✅ CreateExpense Dialog */}
      <CreateExpense
        open={openExpenseDialog}
        onClose={() => {
          setOpenExpenseDialog(false);
          fetchExpenses(); // refresh list after adding
        }}
      />
    </div>
  );
};

export default GroupExpenses;

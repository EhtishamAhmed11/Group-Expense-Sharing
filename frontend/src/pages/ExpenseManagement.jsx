"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Container,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  MapPin,
  CreditCard,
  Tag,
  Receipt,
  RefreshCw,
  FileText,
  Repeat,
} from "lucide-react";
import { toast } from "react-hot-toast";

const ExpenseManagement = () => {
  const [currentView, setCurrentView] = useState("list"); // 'list', 'create', 'edit'
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    category: "",
    dateFrom: "",
    dateTo: "",
    paymentMethod: "",
    recurring: "",
    minAmount: "",
    maxAmount: "",
    search: "",
  });

  const API_BASE_URL = "http://localhost:3005/api";

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(
        `${API_BASE_URL}/expense/get-expenses?${queryParams}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();
      if (data.success) {
        setExpenses(data.data.expenses || []);
      } else {
        const errorMsg = data.message || "Failed to fetch expenses";
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = "Network error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/expense/get-categories`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      console.error("Fetch categories error:", error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value, page: 1 }));
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/expense/delete-expense/${expenseId}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await response.json();
      if (data.success) {
        toast.success("Expense deleted successfully!");
        fetchExpenses();
      } else {
        toast.error(data.message || "Failed to delete expense");
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setCurrentView("edit");
  };

  const renderFilters = () => (
    <Card className="rounded-xl shadow-md mb-6">
      <CardHeader
        className="pb-3"
        title={
          <Box className="flex items-center gap-2">
            <Filter className="text-gray-600 w-5 h-5" />
            <Typography
              variant="h6"
              fontFamily="Inter, sans-serif"
              fontWeight={600}
            >
              Filters & Search
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="Search description or location"
              size="small"
              InputProps={{
                startAdornment: (
                  <Search className="w-4 h-4 mr-2 text-gray-400" />
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                onChange={(e) => handleFilterChange("category", e.target.value)}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.name}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={filters.paymentMethod}
                onChange={(e) =>
                  handleFilterChange("paymentMethod", e.target.value)
                }
                label="Payment Method"
              >
                <MenuItem value="">All Methods</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="credit_card">Credit Card</MenuItem>
                <MenuItem value="debit_card">Debit Card</MenuItem>
                <MenuItem value="digital_wallet">Digital Wallet</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Date To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Recurring</InputLabel>
              <Select
                value={filters.recurring}
                onChange={(e) =>
                  handleFilterChange("recurring", e.target.value)
                }
                label="Recurring"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Recurring Only</MenuItem>
                <MenuItem value="false">Non-recurring Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box className="flex justify-end mt-4">
          <Button
            variant="outlined"
            startIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() =>
              setFilters({
                page: 1,
                limit: 20,
                category: "",
                dateFrom: "",
                dateTo: "",
                paymentMethod: "",
                recurring: "",
                minAmount: "",
                maxAmount: "",
                search: "",
              })
            }
            sx={{ textTransform: "none" }}
          >
            Clear Filters
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const renderExpenseList = () => (
    <Container maxWidth="xl" className="py-8">
      <Box className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Box>
          <Typography
            variant="h4"
            fontFamily="Inter, sans-serif"
            fontWeight={700}
            className="text-gray-900 mb-1"
          >
            Expense Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage all your personal expenses
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={() => setCurrentView("create")}
          sx={{
            textTransform: "none",
            backgroundColor: "rgb(37, 99, 235)",
            "&:hover": { backgroundColor: "rgb(29, 78, 216)" },
          }}
        >
          Add New Expense
        </Button>
      </Box>

      {renderFilters()}

      {error && (
        <Alert severity="error" className="rounded-lg mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <Box className="flex items-center justify-center h-64 space-x-3">
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Loading expenses...
          </Typography>
        </Box>
      ) : expenses.length === 0 ? (
        <Card className="rounded-xl shadow-md">
          <CardContent className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <Typography variant="h6" color="text.secondary" className="mb-2">
              No expenses found
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mb-4">
              Start by adding your first expense
            </Typography>
            <Button
              variant="contained"
              startIcon={<Plus className="w-4 h-4" />}
              onClick={() => setCurrentView("create")}
              sx={{
                textTransform: "none",
                backgroundColor: "rgb(37, 99, 235)",
                "&:hover": { backgroundColor: "rgb(29, 78, 216)" },
              }}
            >
              Add Expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box className="space-y-4">
          {expenses.map((expense) => (
            <Card
              key={expense.id}
              className="rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              <CardContent className="p-6">
                <Box className="flex flex-col md:flex-row justify-between gap-4">
                  <Box className="flex-1">
                    <Box className="flex items-center flex-wrap gap-2 mb-2">
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        className="text-gray-900"
                      >
                        ${expense.amount}
                      </Typography>
                      {expense.category?.name && (
                        <Chip
                          label={expense.category.name}
                          size="small"
                          sx={{
                            backgroundColor:
                              expense.category?.color || "rgb(37, 99, 235)",
                            color: "white",
                          }}
                        />
                      )}
                      {expense.isRecurring && (
                        <Chip
                          label="Recurring"
                          size="small"
                          color="success"
                          variant="outlined"
                          icon={<Repeat className="w-3 h-3" />}
                        />
                      )}
                    </Box>
                    <Typography variant="h6" fontWeight={600} className="mb-2">
                      {expense.description}
                    </Typography>
                    <Grid
                      container
                      spacing={2}
                      className="text-sm text-gray-600"
                    >
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={3}
                        className="flex items-center gap-1"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </span>
                      </Grid>
                      {expense.paymentMethod && (
                        <Grid
                          item
                          xs={12}
                          sm={6}
                          md={3}
                          className="flex items-center gap-1"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>
                            {expense.paymentMethod
                              .replace("_", " ")
                              .toUpperCase()}
                          </span>
                        </Grid>
                      )}
                      {expense.location && (
                        <Grid
                          item
                          xs={12}
                          sm={6}
                          md={3}
                          className="flex items-center gap-1"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>{expense.location}</span>
                        </Grid>
                      )}
                    </Grid>
                    {expense.notes && (
                      <Box className="mt-3">
                        <Typography variant="body2" color="text.secondary">
                          <FileText className="w-4 h-4 inline mr-1" />
                          {expense.notes}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box className="flex gap-2">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Edit className="w-4 h-4" />}
                      onClick={() => handleEditExpense(expense)}
                      sx={{ textTransform: "none" }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Trash2 className="w-4 h-4" />}
                      onClick={() => {
                        setExpenseToDelete(expense);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ textTransform: "none" }}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this expense? This action cannot be
            undone.
          </Typography>
          {expenseToDelete && (
            <Box className="mt-3 p-3 bg-gray-50 rounded-lg">
              <Typography variant="subtitle2" fontWeight={600}>
                {expenseToDelete.description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ${expenseToDelete.amount} •{" "}
                {new Date(expenseToDelete.expenseDate).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleDeleteExpense(expenseToDelete?.id)}
            color="error"
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );

  switch (currentView) {
    case "create":
      return (
        <ExpenseForm
          onCancel={() => setCurrentView("list")}
          onSuccess={() => {
            setCurrentView("list");
            fetchExpenses();
          }}
        />
      );
    case "edit":
      return (
        <ExpenseForm
          expense={editingExpense}
          onCancel={() => setCurrentView("list")}
          onSuccess={() => {
            setCurrentView("list");
            fetchExpenses();
          }}
        />
      );
    default:
      return renderExpenseList();
  }
};

const ExpenseForm = ({ expense = null, onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: expense?.amount || "",
    description: expense?.description || "",
    category: expense?.category?.name || "",
    notes: expense?.notes || "",
    expenseDate: expense?.expenseDate
      ? expense.expenseDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
    receiptUrl: expense?.receiptUrl || "",
    isRecurring: expense?.isRecurring || false,
    recurringType: expense?.recurringType || "monthly",
    recurringInterval: expense?.recurringInterval || 1,
    recurringEndDate: expense?.recurringEndDate
      ? expense.recurringEndDate.split("T")[0]
      : "",
    nextDueDate: expense?.nextDueDate ? expense.nextDueDate.split("T")[0] : "",
    paymentMethod: expense?.paymentMethod || "",
    location: expense?.location || "",
    tags: expense?.tags
      ? Array.isArray(expense.tags)
        ? expense.tags.join(", ")
        : expense.tags
      : "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE_URL = "http://localhost:3005/api";

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const submitData = {
        ...formData,
        amount: Number.parseFloat(formData.amount),
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      };

      const url = expense
        ? `${API_BASE_URL}/expense/update-expense/${expense.id}`
        : `${API_BASE_URL}/expense/create`;
      const method = expense ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(
          `Expense ${expense ? "updated" : "created"} successfully!`
        );
        onSuccess();
      } else {
        const errorMsg =
          data.message || `Failed to ${expense ? "update" : "create"} expense`;
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      setError("Network error occurred");
      toast.error("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" className="py-8">
      <Box className="mb-6">
        <Typography
          variant="h4"
          fontFamily="Inter, sans-serif"
          fontWeight={700}
          className="mb-2"
        >
          {expense ? "Edit Expense" : "Add New Expense"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {expense ? "Update expense details" : "Create a new expense entry"}
        </Typography>
      </Box>

      <Card className="rounded-xl shadow-md">
        <CardContent className="p-6">
          {error && (
            <Alert severity="error" className="rounded-lg mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  InputProps={{
                    startAdornment: (
                      <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                    ),
                  }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date"
                  name="expenseDate"
                  type="date"
                  value={formData.expenseDate}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    ),
                  }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  InputProps={{
                    startAdornment: (
                      <FileText className="w-4 h-4 mr-2 text-gray-400" />
                    ),
                  }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <Tag className="w-4 h-4 mr-2 text-gray-400" />
                    ),
                  }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    label="Payment Method"
                  >
                    <MenuItem value="">Select Method</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="credit_card">Credit Card</MenuItem>
                    <MenuItem value="debit_card">Debit Card</MenuItem>
                    <MenuItem value="digital_wallet">Digital Wallet</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    ),
                  }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Receipt URL"
                  name="receiptUrl"
                  value={formData.receiptUrl}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <Receipt className="w-4 h-4 mr-2 text-gray-400" />
                    ),
                  }}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags (comma separated)"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  variant="outlined"
                  placeholder="food, restaurant, dinner"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="isRecurring"
                      checked={formData.isRecurring}
                      onChange={handleInputChange}
                    />
                  }
                  label="Recurring Expense"
                />
              </Grid>

              {formData.isRecurring && (
                <>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Recurring Type</InputLabel>
                      <Select
                        name="recurringType"
                        value={formData.recurringType}
                        onChange={handleInputChange}
                        label="Recurring Type"
                      >
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="yearly">Yearly</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Recurring Interval"
                      name="recurringInterval"
                      type="number"
                      value={formData.recurringInterval}
                      onChange={handleInputChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Recurring End Date"
                      name="recurringEndDate"
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Next Due Date"
                      name="nextDueDate"
                      type="date"
                      value={formData.nextDueDate}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                    />
                  </Grid>
                </>
              )}
            </Grid>

            <Divider className="my-6" />

            <Box className="flex flex-col md:flex-row gap-3">
              <Button
                type="button"
                variant="outlined"
                onClick={onCancel}
                className="flex-1"
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                className="flex-1"
                sx={{
                  textTransform: "none",
                  backgroundColor: "rgb(37, 99, 235)",
                  "&:hover": { backgroundColor: "rgb(29, 78, 216)" },
                }}
                startIcon={
                  loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : expense ? (
                    <Edit className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )
                }
              >
                {loading
                  ? expense
                    ? "Updating..."
                    : "Creating..."
                  : expense
                  ? "Update Expense"
                  : "Create Expense"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ExpenseManagement;

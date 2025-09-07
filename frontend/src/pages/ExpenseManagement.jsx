import React, { useState, useEffect } from "react";

const ExpenseManagement = () => {
  const [currentView, setCurrentView] = useState("list"); // 'list', 'create', 'edit'
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
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
        setError(data.message || "Failed to fetch expenses");
      }
    } catch (error) {
      setError("Network error occurred");
      console.error("Fetch expenses error:", error);
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

  // Load data on component mount
  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
      page: 1, // Reset to first page when filtering
    }));
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId) => {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/expense/delete-expense/${expenseId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();
      if (data.success) {
        fetchExpenses(); // Refresh list
      } else {
        setError(data.message || "Failed to delete expense");
      }
    } catch (error) {
      setError("Network error occurred");
    }
  };

  // Handle edit expense
  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setCurrentView("edit");
  };

  // Render filters
  const renderFilters = () => (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        marginBottom: "20px",
      }}
    >
      <h3>Filters</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginTop: "15px",
        }}
      >
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Search:
          </label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            placeholder="Search description or location"
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Category:
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Payment Method:
          </label>
          <select
            value={filters.paymentMethod}
            onChange={(e) =>
              handleFilterChange("paymentMethod", e.target.value)
            }
            style={{ width: "100%", padding: "8px" }}
          >
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="digital_wallet">Digital Wallet</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Date From:
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Date To:
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Recurring:
          </label>
          <select
            value={filters.recurring}
            onChange={(e) => handleFilterChange("recurring", e.target.value)}
            style={{ width: "100%", padding: "8px" }}
          >
            <option value="">All</option>
            <option value="true">Recurring Only</option>
            <option value="false">Non-recurring Only</option>
          </select>
        </div>
      </div>

      <button
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
        style={{
          marginTop: "15px",
          padding: "8px 16px",
          backgroundColor: "#6c757d",
          color: "white",
          border: "none",
        }}
      >
        Clear Filters
      </button>
    </div>
  );

  // Render expense list
  const renderExpenseList = () => (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>Expenses</h2>
        <button
          onClick={() => setCurrentView("create")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
          }}
        >
          Add New Expense
        </button>
      </div>

      {renderFilters()}

      {error && (
        <div
          style={{
            color: "red",
            padding: "10px",
            border: "1px solid red",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading expenses...</div>
      ) : (
        <div>
          {expenses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <p>No expenses found</p>
            </div>
          ) : (
            <div>
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "15px",
                    marginBottom: "15px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <h4 style={{ margin: 0, marginRight: "15px" }}>
                          ${expense.amount}
                        </h4>
                        <span
                          style={{
                            backgroundColor:
                              expense.category?.color || "#007bff",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        >
                          {expense.category?.name}
                        </span>
                        {expense.isRecurring && (
                          <span
                            style={{
                              backgroundColor: "#28a745",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              marginLeft: "8px",
                            }}
                          >
                            Recurring
                          </span>
                        )}
                      </div>
                      <p style={{ margin: "5px 0", fontWeight: "bold" }}>
                        {expense.description}
                      </p>
                      <p
                        style={{
                          margin: "5px 0",
                          color: "#666",
                          fontSize: "14px",
                        }}
                      >
                        Date:{" "}
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </p>
                      {expense.paymentMethod && (
                        <p
                          style={{
                            margin: "5px 0",
                            color: "#666",
                            fontSize: "14px",
                          }}
                        >
                          Payment:{" "}
                          {expense.paymentMethod
                            .replace("_", " ")
                            .toUpperCase()}
                        </p>
                      )}
                      {expense.location && (
                        <p
                          style={{
                            margin: "5px 0",
                            color: "#666",
                            fontSize: "14px",
                          }}
                        >
                          Location: {expense.location}
                        </p>
                      )}
                      {expense.notes && (
                        <p
                          style={{
                            margin: "5px 0",
                            color: "#666",
                            fontSize: "14px",
                          }}
                        >
                          Notes: {expense.notes}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => handleEditExpense(expense)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#ffc107",
                          color: "black",
                          border: "none",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Main render
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

// Expense Form Component
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
        amount: parseFloat(formData.amount),
        tags: formData.tags
          ? formData.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag)
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
        onSuccess();
      } else {
        setError(
          data.message || `Failed to ${expense ? "update" : "create"} expense`
        );
      }
    } catch (error) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "20px auto" }}>
      <h2>{expense ? "Edit Expense" : "Add New Expense"}</h2>
      {error && (
        <div
          style={{
            color: "red",
            padding: "10px",
            border: "1px solid red",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label>Amount:</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Description:</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Category:</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Notes:</label>
          <input
            type="text"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Date:</label>
          <input
            type="date"
            name="expenseDate"
            value={formData.expenseDate}
            onChange={handleInputChange}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Receipt URL:</label>
          <input
            type="text"
            name="receiptUrl"
            value={formData.receiptUrl}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>
            <input
              type="checkbox"
              name="isRecurring"
              checked={formData.isRecurring}
              onChange={handleInputChange}
            />
            Recurring
          </label>
        </div>
        {formData.isRecurring && (
          <>
            <div style={{ marginBottom: "15px" }}>
              <label>Recurring Type:</label>
              <select
                name="recurringType"
                value={formData.recurringType}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>Recurring Interval:</label>
              <input
                type="number"
                name="recurringInterval"
                value={formData.recurringInterval}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>Recurring End Date:</label>
              <input
                type="date"
                name="recurringEndDate"
                value={formData.recurringEndDate}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>Next Due Date:</label>
              <input
                type="date"
                name="nextDueDate"
                value={formData.nextDueDate}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
          </>
        )}
        <div style={{ marginBottom: "15px" }}>
          <label>Payment Method:</label>
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px" }}
          >
            <option value="">Select Method</option>
            <option value="cash">Cash</option>
            <option value="credit_card">Credit Card</option>
            <option value="debit_card">Debit Card</option>
            <option value="digital_wallet">Digital Wallet</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Location:</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Tags (comma separated):</label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
            }}
          >
            {loading
              ? expense
                ? "Updating..."
                : "Creating..."
              : expense
              ? "Update Expense"
              : "Create Expense"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
export default ExpenseManagement;

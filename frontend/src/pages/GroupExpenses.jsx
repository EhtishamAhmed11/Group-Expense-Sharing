// src/pages/GroupExpenses.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GroupExpenses = () => {
  const { groupId } = useParams();
  const { user } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pagination & filters
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
    hasNextPage: false,
    hasPrevPage: false,
  });

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
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        }
      );

      const data = await res.json();
      if (data.success) {
        setExpenses(data.data.expenses || []);
        setSummary(data.data.summary || null);
        if (data.data.pagination) {
          setPagination(data.data.pagination);
        }
      } else {
        console.error("Failed to fetch expenses:", data.message);
      }
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when filters/page/search changes
  useEffect(() => {
    if (groupId) {
      fetchExpenses();
    }
  }, [groupId, page, search, filters]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1); // reset page on filter change
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Group Expenses</h2>
      <Link to={`/groups/${groupId}/expenses/create`}>➕ Add New Expense</Link>

      {/* Search input */}
      <div style={{ margin: "20px 0" }}>
        <input
          type="text"
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ padding: "8px", width: "250px" }}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          marginBottom: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px",
        }}
      >
        <input
          type="text"
          name="category"
          placeholder="Filter by category"
          value={filters.category}
          onChange={handleFilterChange}
        />
        <input
          type="text"
          name="paidBy"
          placeholder="Filter by payer"
          value={filters.paidBy}
          onChange={handleFilterChange}
        />
        <input
          type="date"
          name="dateFrom"
          value={filters.dateFrom}
          onChange={handleFilterChange}
        />
        <input
          type="date"
          name="dateTo"
          value={filters.dateTo}
          onChange={handleFilterChange}
        />
        <input
          type="number"
          name="minAmount"
          placeholder="Min amount"
          value={filters.minAmount}
          onChange={handleFilterChange}
        />
        <input
          type="number"
          name="maxAmount"
          placeholder="Max amount"
          value={filters.maxAmount}
          onChange={handleFilterChange}
        />
        <select
          name="settlementStatus"
          value={filters.settlementStatus}
          onChange={handleFilterChange}
        >
          <option value="">All</option>
          <option value="settled">Settled</option>
          <option value="pending">Pending</option>
        </select>
        <select
          name="sortBy"
          value={filters.sortBy}
          onChange={handleFilterChange}
        >
          <option value="expense_date">Date</option>
          <option value="amount">Amount</option>
          <option value="description">Description</option>
          <option value="created_at">Created</option>
        </select>
        <select
          name="sortOrder"
          value={filters.sortOrder}
          onChange={handleFilterChange}
        >
          <option value="DESC">Descending</option>
          <option value="ASC">Ascending</option>
        </select>
      </div>

      {loading ? (
        <p>Loading expenses...</p>
      ) : (
        <>
          {/* Summary */}
          {summary && (
            <div
              style={{
                margin: "20px 0",
                padding: "10px",
                border: "1px solid #ccc",
              }}
            >
              <h4>Summary</h4>
              <p>Total Expenses: {summary.totalExpenses}</p>
              <p>Total Amount: ${summary.totalAmount}</p>
              <p>Unsettled Amount: ${summary.totalUnsettled}</p>
              <p>Average Expense: ${summary.averageExpense}</p>
            </div>
          )}

          {/* Expense list */}
          <h4>Expense List</h4>
          {expenses.length === 0 ? (
            <p>No expenses found for this group.</p>
          ) : (
            <ul>
              {expenses.map((exp) => (
                <li key={exp.id} style={{ marginBottom: "12px" }}>
                  <strong>{exp.description}</strong> — ${exp.amount} <br />
                  Payer: {exp.payer?.name || "Unknown"}{" "}
                  {exp.userInfo?.isUserPayer && "(You)"}
                  <br />
                  {exp.userInfo?.userAmountOwed > 0 && (
                    <span>
                      You owe ${exp.userInfo.userAmountOwed}{" "}
                      {exp.userInfo.userIsSettled ? "(Settled)" : "(Pending)"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Pagination controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              style={{
                padding: "6px 12px",
                backgroundColor: pagination.hasPrevPage ? "#007bff" : "#ccc",
                color: "white",
                border: "none",
                cursor: pagination.hasPrevPage ? "pointer" : "not-allowed",
              }}
            >
              Prev
            </button>

            <span style={{ alignSelf: "center" }}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>

            <button
              onClick={() =>
                setPage((p) =>
                  pagination.hasNextPage
                    ? Math.min(pagination.totalPages, p + 1)
                    : p
                )
              }
              disabled={!pagination.hasNextPage}
              style={{
                padding: "6px 12px",
                backgroundColor: pagination.hasNextPage ? "#007bff" : "#ccc",
                color: "white",
                border: "none",
                cursor: pagination.hasNextPage ? "pointer" : "not-allowed",
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupExpenses;

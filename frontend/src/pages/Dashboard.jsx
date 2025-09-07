import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ExpenseManagement from "./ExpenseManagement";
import ProfileManagement from "./ProfileManagement";

const Dashboard = () => {
  const [currentView, setCurrentView] = useState("overview"); // 'overview', 'expenses', 'profile'
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const renderNavigation = () => (
    <nav
      style={{
        padding: "20px",
        borderBottom: "1px solid #ddd",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <button
            onClick={() => setCurrentView("overview")}
            style={{
              marginRight: "10px",
              padding: "8px 16px",
              backgroundColor:
                currentView === "overview" ? "#007bff" : "#f8f9fa",
              color: currentView === "overview" ? "white" : "black",
              border: "1px solid #ddd",
              cursor: "pointer",
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setCurrentView("expenses")}
            style={{
              marginRight: "10px",
              padding: "8px 16px",
              backgroundColor:
                currentView === "expenses" ? "#007bff" : "#f8f9fa",
              color: currentView === "expenses" ? "white" : "black",
              border: "1px solid #ddd",
              cursor: "pointer",
            }}
          >
            Expenses
          </button>
          <button
            onClick={() => setCurrentView("profile")}
            style={{
              marginRight: "10px",
              padding: "8px 16px",
              backgroundColor:
                currentView === "profile" ? "#007bff" : "#f8f9fa",
              color: currentView === "profile" ? "white" : "black",
              border: "1px solid #ddd",
              cursor: "pointer",
            }}
          >
            Profile
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: "15px" }}>
            Welcome, {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );

  const [dashboardData, setDashboardData] = useState({
    totalExpenses: 0,
    monthlyTotal: 0,
    categoriesCount: 0,
    recurringCount: 0,
    recentExpenses: [],
    upcomingRecurring: [],
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const API_BASE_URL = "http://localhost:3005/api";

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);

      // Get current month date range
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const dateFrom = firstDay.toISOString().split("T")[0];
      const dateTo = lastDay.toISOString().split("T")[0];

      // Fetch expenses for current month
      const expensesResponse = await fetch(
        `${API_BASE_URL}/expense/get-expenses?limit=100&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        {
          credentials: "include",
        }
      );

      // Fetch all expenses (for total calculation)
      const allExpensesResponse = await fetch(
        `${API_BASE_URL}/expense/get-expenses?limit=1000`,
        {
          credentials: "include",
        }
      );

      // Fetch categories
      const categoriesResponse = await fetch(
        `${API_BASE_URL}/expense/get-categories`,
        {
          credentials: "include",
        }
      );

      // Fetch recurring expenses
      const recurringResponse = await fetch(
        `${API_BASE_URL}/expense/get-recurring-expenses`,
        {
          credentials: "include",
        }
      );

      // Fetch recent expenses (last 5)
      const recentExpensesResponse = await fetch(
        `${API_BASE_URL}/expense/get-expenses?limit=5`,
        {
          credentials: "include",
        }
      );

      const [
        expensesData,
        allExpensesData,
        categoriesData,
        recurringData,
        recentExpensesData,
      ] = await Promise.all([
        expensesResponse.json(),
        allExpensesResponse.json(),
        categoriesResponse.json(),
        recurringResponse.json(),
        recentExpensesResponse.json(),
      ]);

      // Calculate totals
      const monthlyExpenses = expensesData.success
        ? expensesData.data.expenses
        : [];
      const allExpenses = allExpensesData.success
        ? allExpensesData.data.expenses
        : [];
      const categories = categoriesData.success
        ? categoriesData.data.categories
        : [];
      const recurring = recurringData.success
        ? recurringData.data.recurringExpenses
        : [];
      const recent = recentExpensesData.success
        ? recentExpensesData.data.expenses
        : [];

      const monthlyTotal = monthlyExpenses.reduce(
        (sum, expense) => sum + parseFloat(expense.amount || 0),
        0
      );
      const totalExpenses = allExpenses.reduce(
        (sum, expense) => sum + parseFloat(expense.amount || 0),
        0
      );

      // Get upcoming recurring expenses (due in next 7 days)
      const upcomingRecurring = recurring.filter((expense) => {
        if (!expense.nextDueDate) return false;
        const dueDate = new Date(expense.nextDueDate);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff <= 7;
      });

      setDashboardData({
        totalExpenses: totalExpenses,
        monthlyTotal: monthlyTotal,
        categoriesCount: categories.length,
        recurringCount: recurring.length,
        recentExpenses: recent.slice(0, 5),
        upcomingRecurring: upcomingRecurring,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (user && currentView === "overview") {
      fetchDashboardData();
    }
  }, [user, currentView]);

  const renderOverview = () => (
    <div style={{ padding: "20px" }}>
      <h2>Dashboard Overview</h2>

      {dashboardLoading ? (
        <div>Loading dashboard data...</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                border: "1px solid #ddd",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <h3>Total Expenses</h3>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#007bff",
                }}
              >
                ${dashboardData.totalExpenses.toFixed(2)}
              </p>
              <p style={{ color: "#666", fontSize: "14px" }}>All time</p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <h3>This Month</h3>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#28a745",
                }}
              >
                ${dashboardData.monthlyTotal.toFixed(2)}
              </p>
              <p style={{ color: "#666", fontSize: "14px" }}>
                {new Date().toLocaleString("default", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <h3>Categories</h3>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#6f42c1",
                }}
              >
                {dashboardData.categoriesCount}
              </p>
              <p style={{ color: "#666", fontSize: "14px" }}>
                Active categories
              </p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <h3>Recurring Expenses</h3>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#ffc107",
                }}
              >
                {dashboardData.recurringCount}
              </p>
              <p style={{ color: "#666", fontSize: "14px" }}>
                Active recurring
              </p>
            </div>
          </div>

          {/* Recent Expenses Section */}
          <div style={{ marginTop: "30px" }}>
            <h3>Recent Expenses</h3>
            {dashboardData.recentExpenses.length > 0 ? (
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "15px",
                  marginTop: "15px",
                }}
              >
                {dashboardData.recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <div>
                      <strong>${expense.amount}</strong> - {expense.description}
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {expense.category?.name} •{" "}
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      style={{
                        backgroundColor: expense.category?.color || "#007bff",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    >
                      {expense.category?.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#666", fontStyle: "italic" }}>
                No recent expenses
              </p>
            )}
          </div>

          {/* Upcoming Recurring Section */}
          {dashboardData.upcomingRecurring.length > 0 && (
            <div style={{ marginTop: "30px" }}>
              <h3>Upcoming Recurring Expenses</h3>
              <div
                style={{
                  border: "1px solid #ffc107",
                  borderRadius: "8px",
                  padding: "15px",
                  marginTop: "15px",
                  backgroundColor: "#fff8e1",
                }}
              >
                {dashboardData.upcomingRecurring.map((expense) => {
                  const daysUntilDue = Math.ceil(
                    (new Date(expense.nextDueDate) - new Date()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={expense.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid #ffe0b3",
                      }}
                    >
                      <div>
                        <strong>${expense.amount}</strong> -{" "}
                        {expense.description}
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          {expense.category?.name} • Due{" "}
                          {new Date(expense.nextDueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor:
                            daysUntilDue === 0
                              ? "#dc3545"
                              : daysUntilDue <= 3
                              ? "#ffc107"
                              : "#28a745",
                          color: "white",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      >
                        {daysUntilDue === 0
                          ? "Due Today"
                          : `${daysUntilDue} days`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: "30px" }}>
            <h3>Quick Actions</h3>
            <div style={{ marginTop: "15px" }}>
              <button
                onClick={() => setCurrentView("expenses")}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  marginRight: "10px",
                  cursor: "pointer",
                  borderRadius: "4px",
                }}
              >
                Add New Expense
              </button>
              <button
                onClick={() => setCurrentView("expenses")}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  marginRight: "10px",
                  cursor: "pointer",
                  borderRadius: "4px",
                }}
              >
                View All Expenses
              </button>
              <button
                onClick={fetchDashboardData}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "4px",
                }}
              >
                Refresh Data
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case "overview":
        return renderOverview();
      case "expenses":
        return <ExpenseManagement />;
      case "profile":
        return <ProfileManagement />;
      default:
        return renderOverview();
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {renderNavigation()}
      {renderContent()}
    </div>
  );
};

export default Dashboard;

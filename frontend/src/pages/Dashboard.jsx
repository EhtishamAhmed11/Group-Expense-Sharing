import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ExpenseManagement from "./ExpenseManagement";
import ProfileManagement from "./ProfileManagement";
import GroupManagement from "./GroupManagement";

const Dashboard = () => {
  const [currentView, setCurrentView] = useState("overview");
  const { user, logout } = useAuth();

  const [dashboardData, setDashboardData] = useState({
    totalExpenses: 0,
    monthlyTotal: 0,
    categoriesCount: 0,
    recurringCount: 0,
    recentExpenses: [],
    upcomingRecurring: [],
  });

  const [groupData, setGroupData] = useState({
    totalGroups: 0,
    adminGroups: 0,
    totalBalance: 0,
    groupBalances: [],
    recentGroupExpenses: [],
  });

  const [dashboardLoading, setDashboardLoading] = useState(true);

  const API_BASE_URL = "http://localhost:3005/api";

  const handleLogout = async () => {
    await logout();
  };

  // Fetch dashboard + group data
  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);

      // ---------- Personal Expense Data ----------
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const dateFrom = firstDay.toISOString().split("T")[0];
      const dateTo = lastDay.toISOString().split("T")[0];

      const [
        expensesResponse,
        allExpensesResponse,
        categoriesResponse,
        recurringResponse,
        recentExpensesResponse,
        groupsResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE_URL}/expense/get-expenses?limit=100&dateFrom=${dateFrom}&dateTo=${dateTo}`,
          { credentials: "include" }
        ),
        fetch(`${API_BASE_URL}/expense/get-expenses?limit=1000`, {
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/expense/get-categories`, {
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/expense/get-recurring-expenses`, {
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/expense/get-expenses?limit=5`, {
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/groups/get-user-groups`, {
          credentials: "include",
        }),
      ]);

      const [
        expensesData,
        allExpensesData,
        categoriesData,
        recurringData,
        recentExpensesData,
        groupsData,
      ] = await Promise.all([
        expensesResponse.json(),
        allExpensesResponse.json(),
        categoriesResponse.json(),
        recurringResponse.json(),
        recentExpensesResponse.json(),
        groupsResponse.json(),
      ]);

      // ---------- Calculate Personal ----------
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

      const upcomingRecurring = recurring.filter((expense) => {
        if (!expense.nextDueDate) return false;
        const dueDate = new Date(expense.nextDueDate);
        const today = new Date();
        const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff <= 7;
      });

      setDashboardData({
        totalExpenses,
        monthlyTotal,
        categoriesCount: categories.length,
        recurringCount: recurring.length,
        recentExpenses: recent.slice(0, 5),
        upcomingRecurring,
      });

      // ---------- Calculate Group ----------
      if (groupsData.success) {
        const groups = groupsData.data.groups || [];
        const totalGroups = groups.length;
        const adminGroups = groups.filter((g) => g.userRole === "admin").length;
        const totalBalance = groups.reduce(
          (sum, g) => sum + (g.userBalance || 0),
          0
        );

        const recentGroupExpenses = groups
          .filter((g) => g.stats?.recentExpenses?.length > 0)
          .flatMap((g) =>
            g.stats.recentExpenses.map((exp) => ({ ...exp, groupName: g.name }))
          )
          .slice(0, 5);

        const groupBalances = groups.map((g) => ({
          name: g.name,
          balance: g.userBalance || 0,
        }));

        setGroupData({
          totalGroups,
          adminGroups,
          totalBalance,
          groupBalances,
          recentGroupExpenses,
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (user && currentView === "overview") fetchDashboardData();
  }, [user, currentView]);

  // Navigation bar
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
          {["overview", "expenses", "groups", "profile"].map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              style={{
                marginRight: "10px",
                padding: "8px 16px",
                backgroundColor: currentView === view ? "#007bff" : "#f8f9fa",
                color: currentView === view ? "white" : "black",
                border: "1px solid #ddd",
                cursor: "pointer",
              }}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
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

  // ---------------- Dashboard UI ----------------
  const renderOverview = () => (
    <div style={{ padding: "20px" }}>
      <h2>Dashboard Overview</h2>
      {dashboardLoading ? (
        <div>Loading dashboard data...</div>
      ) : (
        <>
          {/* Personal Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            <SummaryCard
              title="Total Expenses"
              value={`$${dashboardData.totalExpenses.toFixed(2)}`}
              color="#007bff"
              subtitle="All time"
            />
            <SummaryCard
              title="This Month"
              value={`$${dashboardData.monthlyTotal.toFixed(2)}`}
              color="#28a745"
              subtitle={new Date().toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            />
            <SummaryCard
              title="Categories"
              value={dashboardData.categoriesCount}
              color="#6f42c1"
              subtitle="Active categories"
            />
            <SummaryCard
              title="Recurring Expenses"
              value={dashboardData.recurringCount}
              color="#ffc107"
              subtitle="Active recurring"
            />
          </div>

          {/* Groups Summary */}
          <div style={{ marginTop: "40px" }}>
            <h3>My Groups</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "20px",
                marginTop: "20px",
              }}
            >
              <SummaryCard
                title="Total Groups"
                value={groupData.totalGroups}
                color="#17a2b8"
                subtitle="Joined groups"
              />
              <SummaryCard
                title="Admin Of"
                value={groupData.adminGroups}
                color="#dc3545"
                subtitle="Groups you manage"
              />
              <SummaryCard
                title="Net Balance"
                value={`$${groupData.totalBalance.toFixed(2)}`}
                color={groupData.totalBalance >= 0 ? "#28a745" : "#dc3545"}
                subtitle={
                  groupData.totalBalance >= 0 ? "You are owed" : "You owe"
                }
              />
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
      case "groups":
        return <GroupManagement />;
      default:
        return renderOverview();
    }
  };

  return (
    <div>
      {renderNavigation()}
      {renderContent()}
    </div>
  );
};

// Reusable summary card
const SummaryCard = ({ title, value, color, subtitle }) => (
  <div
    style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px" }}
  >
    <h3>{title}</h3>
    <p style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</p>
    <p style={{ color: "#666", fontSize: "14px" }}>{subtitle}</p>
  </div>
);

export default Dashboard;

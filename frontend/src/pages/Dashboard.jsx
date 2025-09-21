import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();

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
    groups: [],
  });

  const [settlementData, setSettlementData] = useState({
    totalSettlements: 0,
    totalAmount: 0,
    pendingCount: 0,
    confirmedCount: 0,
    disputedCount: 0,
    actionRequiredCount: 0,
  });

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const API_BASE_URL = "http://localhost:3005/api";

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true);

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
        settlementsResponse, // ✅ settlements
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
        fetch(`${API_BASE_URL}/settlements/settlements/?limit=1`, {
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
        settlementsData, // ✅ settlements
      ] = await Promise.all([
        expensesResponse.json(),
        allExpensesResponse.json(),
        categoriesResponse.json(),
        recurringResponse.json(),
        recentExpensesResponse.json(),
        groupsResponse.json(),
        settlementsResponse.json(),
      ]);

      // ---------- Personal ----------
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

      // ---------- Groups ----------
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
          id: g.id,
          name: g.name,
          balance: g.userBalance || 0,
        }));

        setGroupData({
          totalGroups,
          adminGroups,
          totalBalance,
          groupBalances,
          recentGroupExpenses,
          groups,
        });
      }

      // ---------- Settlements ----------
      if (settlementsData.success) {
        const summary = settlementsData.data.summary || {};
        setSettlementData({
          totalSettlements: summary.totalSettlements || 0,
          totalAmount: summary.totalAmount || 0,
          pendingCount: summary.pendingCount || 0,
          confirmedCount: summary.confirmedCount || 0,
          disputedCount: summary.disputedCount || 0,
          actionRequiredCount: summary.actionRequiredCount || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (user && location.pathname === "/dashboard") {
      fetchDashboardData();
    }
  }, [user, location.pathname]);

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

          {/* Settlements Summary */}
          <div style={{ marginTop: "40px" }}>
            <h3>Settlements</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "20px",
                marginTop: "20px",
              }}
            >
              <SummaryCard
                title="Total Settlements"
                value={settlementData.totalSettlements}
                color="#20c997"
                subtitle="All time"
              />
              <SummaryCard
                title="Total Amount"
                value={`$${settlementData.totalAmount.toFixed(2)}`}
                color="#6610f2"
                subtitle="All settlements"
              />
              <SummaryCard
                title="Pending"
                value={settlementData.pendingCount}
                color="#ffc107"
                subtitle="Waiting for confirmation"
              />
              <SummaryCard
                title="Confirmed"
                value={settlementData.confirmedCount}
                color="#28a745"
                subtitle="Completed successfully"
              />
              <SummaryCard
                title="Disputed"
                value={settlementData.disputedCount}
                color="#dc3545"
                subtitle="Needs resolution"
              />
              <SummaryCard
                title="Action Required"
                value={settlementData.actionRequiredCount}
                color="#fd7e14"
                subtitle="Your attention needed"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  return <div>{location.pathname === "/dashboard" && renderOverview()}</div>;
};

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

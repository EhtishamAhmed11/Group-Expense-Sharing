// src/pages/Dashboard.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import { Card, CardContent, Typography, CircularProgress } from "@mui/material";
import { TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";
import { motion } from "motion/react";
import { format } from "date-fns";

const API_BASE_URL = "http://localhost:3005/api";

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [dashboardData, setDashboardData] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [settlementData, setSettlementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const dateFrom = firstDay.toISOString().split("T")[0];
      const dateTo = lastDay.toISOString().split("T")[0];

      const [
        expensesRes,
        allExpensesRes,
        categoriesRes,
        recurringRes,
        recentExpensesRes,
        groupsRes,
        settlementsRes,
      ] = await Promise.all([
        fetch(
          `${API_BASE_URL}/expense/get-expenses?limit=100&dateFrom=${dateFrom}&dateTo=${dateTo}`,
          {
            credentials: "include",
          }
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
        fetch(`${API_BASE_URL}/settlements/settlements?limit=1`, {
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
        settlementsData,
      ] = await Promise.all([
        expensesRes.json(),
        allExpensesRes.json(),
        categoriesRes.json(),
        recurringRes.json(),
        recentExpensesRes.json(),
        groupsRes.json(),
        settlementsRes.json(),
      ]);

      // Personal expenses
      const monthlyExpenses = expensesData?.data?.expenses || [];
      const allExpenses = allExpensesData?.data?.expenses || [];
      const categories = categoriesData?.data?.categories || [];
      const recurring = recurringData?.data?.recurringExpenses || [];
      const recent = recentExpensesData?.data?.expenses || [];

      const monthlyTotal = monthlyExpenses.reduce(
        (sum, e) => sum + Number.parseFloat(e.amount || 0),
        0
      );
      const totalExpenses = allExpenses.reduce(
        (sum, e) => sum + Number.parseFloat(e.amount || 0),
        0
      );

      const upcomingRecurring = recurring.filter((exp) => {
        if (!exp.nextDueDate) return false;
        const dueDate = new Date(exp.nextDueDate);
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

      // Groups
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
            g.stats.recentExpenses.map((exp) => ({
              ...exp,
              groupName: g.name,
            }))
          )
          .slice(0, 5);

        setGroupData({
          totalGroups,
          adminGroups,
          totalBalance,
          recentGroupExpenses,
        });
      }

      // Settlements
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
    } catch (err) {
      setError("Failed to fetch dashboard data. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && location.pathname === "/dashboard") {
      fetchDashboardData();
    }
  }, [user, location.pathname]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="space-y-1">
          <Typography variant="h4" className="font-bold text-gray-900">
            Dashboard Overview
          </Typography>
          <Typography variant="body2" className="text-gray-600">
            {greeting}, {user?.firstName}! Here’s your financial summary.
          </Typography>
        </header>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <Section title="Personal Expenses">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Expenses"
                  value={`$${dashboardData.totalExpenses.toFixed(2)}`}
                  description="All time"
                />
                <MetricCard
                  title="This Month"
                  value={`$${dashboardData.monthlyTotal.toFixed(2)}`}
                  description={format(new Date(), "MMMM yyyy")}
                  trend="positive"
                />
                <MetricCard
                  title="Categories"
                  value={dashboardData.categoriesCount}
                  description="Active categories"
                />
                <MetricCard
                  title="Recurring"
                  value={dashboardData.recurringCount}
                  description="Active recurring"
                />
              </div>
            </Section>

            <Section title="Group Management">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard
                  title="Total Groups"
                  value={groupData.totalGroups}
                  description="Joined groups"
                />
                <MetricCard
                  title="Admin Of"
                  value={groupData.adminGroups}
                  description="Groups you manage"
                />
                <MetricCard
                  title="Net Balance"
                  value={`$${groupData.totalBalance.toFixed(2)}`}
                  description={
                    groupData.totalBalance >= 0 ? "You are owed" : "You owe"
                  }
                  trend={groupData.totalBalance >= 0 ? "positive" : "negative"}
                />
              </div>
            </Section>

            <Section title="Settlement Activity">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <MetricCard
                  title="Total Settlements"
                  value={settlementData.totalSettlements}
                  description="All time"
                />
                <MetricCard
                  title="Total Amount"
                  value={`$${settlementData.totalAmount.toFixed(2)}`}
                  description="All settlements"
                />
                <MetricCard
                  title="Pending"
                  value={settlementData.pendingCount}
                  description="Awaiting confirmation"
                  trend="warning"
                />
                <MetricCard
                  title="Confirmed"
                  value={settlementData.confirmedCount}
                  description="Completed"
                  trend="positive"
                />
                <MetricCard
                  title="Disputed"
                  value={settlementData.disputedCount}
                  description="Needs resolution"
                  trend="negative"
                />
                <MetricCard
                  title="Action Required"
                  value={settlementData.actionRequiredCount}
                  description="Your attention needed"
                  trend="warning"
                />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <motion.section
    className="space-y-4"
    initial={{ opacity: 0, y: 8 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.25, ease: "easeOut" }}
  >
    <Typography variant="h6" className="font-semibold text-gray-800">
      {title}
    </Typography>
    {children}
  </motion.section>
);

const MetricCard = ({ title, value, description, trend = "neutral" }) => {
  const trendConfig = {
    positive: { icon: <TrendingUp className="w-5 h-5 text-green-500" /> },
    negative: { icon: <TrendingDown className="w-5 h-5 text-red-500" /> },
    warning: { icon: <AlertTriangle className="w-5 h-5 text-yellow-500" /> },
    neutral: { icon: <Info className="w-5 h-5 text-gray-400" /> },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileHover={{ y: -2 }}
    >
      <Card className="rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6 space-y-2">
          <Typography variant="body2" className="text-gray-500 font-medium">
            {title}
          </Typography>
          <div className="flex items-center space-x-2">
            <Typography variant="h5" className="font-bold text-gray-900">
              {value}
            </Typography>
            {trendConfig[trend].icon}
          </div>
          <Typography variant="caption" className="text-gray-400">
            {description}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64 space-y-3">
    <CircularProgress size={32} />
    <Typography variant="body2" className="text-gray-500">
      Loading dashboard data...
    </Typography>
  </div>
);

const ErrorState = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-3">
    <AlertTriangle className="w-8 h-8 text-red-500" />
    <Typography variant="body2" className="text-red-600">
      {message}
    </Typography>
  </div>
);

export default Dashboard;

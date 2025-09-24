"use client";

import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthWrapper from "./pages/AuthWrapper";
import Dashboard from "./pages/Dashboard";
import GroupManagement from "./pages/GroupManagement";
import ExpenseManagement from "./pages/ExpenseManagement";
import ProfileManagement from "./pages/ProfileManagement";
import GroupExpenses from "./pages/GroupExpenses";
import CreateExpense from "./pages/createExpense";
import DebtSummary from "./pages/DebtSummary";
import DetailedDebts from "./pages/DetailedDebts";
import Navbar from "./components/Navbar";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";

// ✅ Import new settlement pages
import SettleDebt from "./pages/SettleDebt";
import ConfirmSettlement from "./pages/ConfirmSettlement";
import SettlementHistory from "./pages/SettlementHistory";
import SettlementDetails from "./pages/SettlementDetails";
import CreateSettlement from "./pages/CreateSettlement";

const theme = createTheme({
  palette: {
    primary: { main: "#2563eb" }, // Tailwind blue-600
    secondary: { main: "#0ea5e9" }, // sky-500
    success: { main: "#16a34a" }, // green-600
    warning: { main: "#f59e0b" }, // amber-500
    error: { main: "#dc2626" }, // red-600
    background: { default: "#f9fafb" }, // gray-50
  },
});

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

// App Content with routes
const AppContent = () => {
  const { checkAuth } = useAuth();
  const [appLoading, setAppLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const initializeApp = async () => {
      await checkAuth();
      setAppLoading(false);
    };
    initializeApp();
  }, []);

  if (appLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <>
      {/* ✅ Show Navbar on all pages except /auth */}
      {location.pathname !== "/auth" && <Navbar />}

      <Routes>
        {/* Auth route */}
        <Route path="/auth" element={<AuthWrapper />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <GroupManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <ExpenseManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups/:groupId/expenses"
          element={
            <ProtectedRoute>
              <GroupExpenses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId/expenses/create"
          element={
            <ProtectedRoute>
              <CreateExpense />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debt"
          element={
            <ProtectedRoute>
              <DebtSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/debt/:groupId/detailed"
          element={
            <ProtectedRoute>
              <DetailedDebts />
            </ProtectedRoute>
          }
        />

        {/* ✅ Settlement Routes */}
        <Route
          path="/settlements"
          element={
            <ProtectedRoute>
              <SettlementHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settlements/:id"
          element={
            <ProtectedRoute>
              <SettlementDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settlements/:id/confirm"
          element={
            <ProtectedRoute>
              <ConfirmSettlement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settlements/settle/:groupId/:toUserId"
          element={
            <ProtectedRoute>
              <SettleDebt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settlements/create"
          element={
            <ProtectedRoute>
              <CreateSettlement />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

// Main App Component
const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <div style={{ fontFamily: "Arial, sans-serif" }}>
            <AppContent />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

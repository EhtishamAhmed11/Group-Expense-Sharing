import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthWrapper from "./pages/AuthWrapper";
import Dashboard from "./pages/Dashboard";
import GroupManagement from "./pages/GroupManagement";
import ExpenseManagement from "./pages/ExpenseManagement";
import ProfileManagement from "./pages/ProfileManagement";
import GroupExpenses from "./pages/GroupExpenses"; 
import CreateExpense from "./pages/createExpense";

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

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div style={{ fontFamily: "Arial, sans-serif" }}>
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;

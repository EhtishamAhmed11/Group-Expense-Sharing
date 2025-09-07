import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthWrapper from "./pages/AuthWrapper";
import Dashboard from "./pages/Dashboard";

// Main App Content Component
const AppContent = () => {
  const { user, loading, checkAuth } = useAuth();
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    // Check authentication status on app mount
    const initializeApp = async () => {
      await checkAuth();
      setAppLoading(false);
    };

    initializeApp();
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = (userData) => {
    console.log("Authentication successful:", userData);
    // The user state is already updated by the AuthContext
  };

  // Show loading spinner while checking authentication
  if (appLoading || loading) {
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

  // Show authentication page if user is not logged in
  if (!user) {
    return <AuthWrapper onAuthSuccess={handleAuthSuccess} />;
  }

  // Show dashboard if user is authenticated
  return <Dashboard />;
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <div style={{ fontFamily: "Arial, sans-serif" }}>
        <AppContent />
      </div>
    </AuthProvider>
  );
};

export default App;

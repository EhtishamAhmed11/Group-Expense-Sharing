import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import { useAuth } from "../context/AuthContext";

const AuthWrapper = ({ onAuthSuccess }) => {
  const [currentView, setCurrentView] = useState("login"); // 'login' or 'register'
  const [successMessage, setSuccessMessage] = useState("");

  const { user, loading } = useAuth();

  const handleSwitchToRegister = () => {
    setCurrentView("register");
    setSuccessMessage("");
  };

  const handleSwitchToLogin = () => {
    setCurrentView("login");
    setSuccessMessage("");
  };

  const handleLoginSuccess = (user) => {
    console.log("User logged in:", user);
    if (onAuthSuccess) {
      onAuthSuccess(user);
    }
  };

  const handleRegistrationSuccess = (user, message) => {
    console.log("User registered:", user);
    setSuccessMessage(
      message ||
        "Registration successful! Please check your email to verify your account."
    );
    setCurrentView("login");
  };

  // Show loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // If user is already logged in, call success callback
  if (user && onAuthSuccess) {
    onAuthSuccess(user);
    return null;
  }

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      {successMessage && (
        <div
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #c3e6cb",
          }}
        >
          {successMessage}
        </div>
      )}

      {currentView === "login" ? (
        <Login
          onSwitchToRegister={handleSwitchToRegister}
          onLoginSuccess={handleLoginSuccess}
        />
      ) : (
        <Register
          onSwitchToLogin={handleSwitchToLogin}
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      )}
    </div>
  );
};

export default AuthWrapper;

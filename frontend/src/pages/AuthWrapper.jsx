import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import { useAuth } from "../context/AuthContext";

const AuthWrapper = ({ onAuthSuccess }) => {
  const [currentView, setCurrentView] = useState("login"); // 'login' or 'register'
  const [successMessage, setSuccessMessage] = useState("");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
    navigate("/dashboard"); // 🚀 Redirect to dashboard after login
  };

  const handleRegistrationSuccess = (user, message) => {
    console.log("User registered:", user);
    setSuccessMessage(
      message ||
        "Registration successful! Please check your email to verify your account."
    );
    setCurrentView("login");
  };

  // If still loading
  if (loading) {
    return <div>Loading...</div>;
  }

  // If user already logged in, redirect immediately
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

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

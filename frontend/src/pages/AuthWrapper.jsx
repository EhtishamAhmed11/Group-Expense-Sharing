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

  // Handle switching between login/register
  const handleSwitchToRegister = () => {
    setCurrentView("register");
    setSuccessMessage("");
  };

  const handleSwitchToLogin = () => {
    setCurrentView("login");
    setSuccessMessage("");
  };

  // Handle successful login
  const handleLoginSuccess = (user) => {
    if (onAuthSuccess) onAuthSuccess(user);
    navigate("/dashboard"); // 🚀 Redirect after login
  };

  // Handle successful registration
  const handleRegistrationSuccess = (user, message) => {
    setSuccessMessage(
      message ||
        "Registration successful! Please check your email to verify your account."
    );
    setCurrentView("login"); // Switch back to login after registration
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Show loading while checking auth state
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px" }}>
      {/* Registration success message */}
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

      {/* Show login or register form */}
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

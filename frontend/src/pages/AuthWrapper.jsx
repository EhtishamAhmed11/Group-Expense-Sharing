"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
} from "@mui/material";
import { Alert } from "@mui/material";
import { CheckCircle, CreditCard } from "lucide-react";

const AuthWrapper = ({ onAuthSuccess }) => {
  const [currentView, setCurrentView] = useState("login");
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
    if (onAuthSuccess) onAuthSuccess(user);
    navigate("/dashboard");
  };

  const handleRegistrationSuccess = (user, message) => {
    setSuccessMessage(
      message ||
        "Registration successful! Please check your email to verify your account."
    );
    setCurrentView("login");
  };

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              ExpenseTracker
            </h1>
            <p className="text-muted-foreground">
              Manage your expenses and settle debts with ease
            </p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert severity="success" className="rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>{successMessage}</span>
            </div>
          </Alert>
        )}

        {/* Auth Forms */}
        <Card className="shadow-lg rounded-2xl">
          <CardHeader
            title={
              <Typography variant="h5" align="center">
                {currentView === "login" ? "Welcome Back" : "Create Account"}
              </Typography>
            }
            subheader={
              currentView === "login"
                ? "Sign in to your account to continue"
                : "Join us to start managing your expenses"
            }
          />
          <CardContent>
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
          </CardContent>
          <CardActions />
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            By continuing, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthWrapper;

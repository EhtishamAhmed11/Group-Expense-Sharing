"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Divider,
} from "@mui/material";
import { Mail, Lock, LogIn } from "lucide-react";
import toast from "react-hot-toast";

const Login = ({ onSwitchToRegister, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, loading, error } = useAuth();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please provide a valid email address";
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(
        formData.email,
        formData.password,
        formData.rememberMe
      );

      if (result.success) {
        console.log("Login successful:", result.user);
        toast.success("Welcome back!");
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        setErrors({ submit: result.error });
        toast.error(result.error || "Login failed");
      }
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred" });
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <Box className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <LogIn className="w-6 h-6 text-white" />
            </div>
          </Box>
          <Typography variant="h4" className="font-bold">
            Welcome Back
          </Typography>
          <Typography variant="body2" className="text-gray-600 mt-2">
            Sign in to your account to continue
          </Typography>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              fullWidth
              type="email"
              name="email"
              label="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              disabled={isSubmitting || loading}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: <Mail className="w-4 h-4 text-gray-400 mr-2" />,
              }}
            />

            <TextField
              fullWidth
              type="password"
              name="password"
              label="Password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              disabled={isSubmitting || loading}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: <Lock className="w-4 h-4 text-gray-400 mr-2" />,
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  disabled={isSubmitting || loading}
                  className="text-blue-600"
                />
              }
              label="Remember me"
              className="text-gray-700"
            />

            {(errors.submit || error) && (
              <Alert severity="error" className="rounded-lg">
                {errors.submit || error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting || loading}
              className="bg-blue-600 hover:bg-blue-700 py-3 text-white"
            >
              {isSubmitting || loading ? (
                <Box className="flex items-center gap-2">
                  <CircularProgress size={20} color="inherit" />
                  Signing in...
                </Box>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <Divider className="my-6" />

          <Box className="text-center">
            <Typography variant="body2" className="text-gray-600">
              Don't have an account?{" "}
              <Button
                variant="text"
                onClick={onSwitchToRegister}
                className="text-blue-600 hover:text-blue-700 p-0 font-semibold"
              >
                Create one here
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

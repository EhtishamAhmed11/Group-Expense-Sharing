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
  CircularProgress,
  Divider,
  Grid,
} from "@mui/material";
import { UserPlus, Mail, Lock, User, Phone, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

const Register = ({ onSwitchToLogin, onRegistrationSuccess }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    profilePictureUrl: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, loading, error } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please provide a valid email address";
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters long";
      } else {
        const hasUpperCase = /[A-Z]/.test(formData.password);
        const hasLowerCase = /[a-z]/.test(formData.password);
        const hasNumbers = /\d/.test(formData.password);

        if (!hasUpperCase || !hasLowerCase) {
          newErrors.password =
            "Password must contain both uppercase and lowercase letters";
        } else if (!hasNumbers) {
          newErrors.password = "Password must contain at least one number";
        }
      }
    }

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (
      formData.firstName.trim().length < 2 ||
      formData.firstName.trim().length > 50
    ) {
      newErrors.firstName = "First name must be between 2 and 50 characters";
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (
      formData.lastName.trim().length < 2 ||
      formData.lastName.trim().length > 50
    ) {
      newErrors.lastName = "Last name must be between 2 and 50 characters";
    }

    // Phone validation (optional)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^\+?[1-9][\d]{0,15}$/;
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone = "Please provide a valid phone number";
      }
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
      const result = await register(formData);

      if (result.success) {
        console.log("Registration successful:", result.user);
        toast.success("Account created successfully!");
        if (onRegistrationSuccess) {
          onRegistrationSuccess(result.user, result.message);
        }
      } else {
        if (result.errors && Array.isArray(result.errors)) {
          // Handle multiple validation errors from backend
          const errorObj = {};
          result.errors.forEach((error) => {
            errorObj.submit = error;
          });
          setErrors(errorObj);
        } else {
          setErrors({ submit: result.error });
        }
        toast.error(result.error || "Registration failed");
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
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center pb-4">
          <Box className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
          </Box>
          <Typography variant="h4" className="font-bold">
            Create Account
          </Typography>
          <Typography variant="body2" className="text-gray-600 mt-2">
            Join us to start managing your expenses
          </Typography>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="firstName"
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter your first name"
                  disabled={isSubmitting || loading}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  InputProps={{
                    startAdornment: (
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                    ),
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="lastName"
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter your last name"
                  disabled={isSubmitting || loading}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  InputProps={{
                    startAdornment: (
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                    ),
                  }}
                  required
                />
              </Grid>
            </Grid>

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
              required
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
              helperText={
                errors.password ||
                "Password must be at least 8 characters with uppercase, lowercase, and numbers"
              }
              InputProps={{
                startAdornment: <Lock className="w-4 h-4 text-gray-400 mr-2" />,
              }}
              required
            />

            <TextField
              fullWidth
              type="tel"
              name="phone"
              label="Phone Number (Optional)"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
              disabled={isSubmitting || loading}
              error={!!errors.phone}
              helperText={errors.phone}
              InputProps={{
                startAdornment: (
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                ),
              }}
            />

            <TextField
              fullWidth
              type="url"
              name="profilePictureUrl"
              label="Profile Picture URL (Optional)"
              value={formData.profilePictureUrl}
              onChange={handleInputChange}
              placeholder="Enter profile picture URL"
              disabled={isSubmitting || loading}
              InputProps={{
                startAdornment: (
                  <ImageIcon className="w-4 h-4 text-gray-400 mr-2" />
                ),
              }}
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
              className="bg-green-600 hover:bg-green-700 py-3 text-white"
            >
              {isSubmitting || loading ? (
                <Box className="flex items-center gap-2">
                  <CircularProgress size={20} color="inherit" />
                  Creating Account...
                </Box>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <Divider className="my-6" />

          <Box className="text-center">
            <Typography variant="body2" className="text-gray-600">
              Already have an account?{" "}
              <Button
                variant="text"
                onClick={onSwitchToLogin}
                className="text-green-600 hover:text-green-700 p-0 font-semibold"
              >
                Sign in here
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;

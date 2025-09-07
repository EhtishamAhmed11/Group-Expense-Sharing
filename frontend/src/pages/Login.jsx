import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

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
        if (onLoginSuccess) {
          onLoginSuccess(result.user);
        }
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred", error });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Login</h2>

      <div>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            disabled={isSubmitting || loading}
            style={{
              display: "block",
              marginTop: "5px",
              padding: "8px",
              width: "300px",
            }}
          />
          {errors.email && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "3px" }}>
              {errors.email}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter your password"
            disabled={isSubmitting || loading}
            style={{
              display: "block",
              marginTop: "5px",
              padding: "8px",
              width: "300px",
            }}
          />
          {errors.password && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "3px" }}>
              {errors.password}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleInputChange}
              disabled={isSubmitting || loading}
              style={{ marginRight: "8px" }}
            />
            Remember me
          </label>
        </div>

        {(errors.submit || error) && (
          <div
            style={{
              color: "red",
              margin: "10px 0",
              padding: "10px",
              border: "1px solid red",
              borderRadius: "4px",
            }}
          >
            {errors.submit || error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || loading}
          style={{
            padding: "10px 20px",
            cursor: isSubmitting || loading ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting || loading ? "Logging in..." : "Login"}
        </button>
      </div>

      <p style={{ marginTop: "20px" }}>
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          style={{
            background: "none",
            border: "none",
            color: "blue",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Register here
        </button>
      </p>
    </div>
  );
};

export default Login;

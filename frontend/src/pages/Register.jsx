import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

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
      }
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred", error });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Create Account</h2>

      <div>
        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="firstName">First Name *:</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="Enter your first name"
            disabled={isSubmitting || loading}
            style={{
              display: "block",
              marginTop: "5px",
              padding: "8px",
              width: "300px",
            }}
          />
          {errors.firstName && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "3px" }}>
              {errors.firstName}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="lastName">Last Name *:</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="Enter your last name"
            disabled={isSubmitting || loading}
            style={{
              display: "block",
              marginTop: "5px",
              padding: "8px",
              width: "300px",
            }}
          />
          {errors.lastName && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "3px" }}>
              {errors.lastName}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="email">Email *:</label>
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
          <label htmlFor="password">Password *:</label>
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
          <div style={{ fontSize: "12px", color: "#666", marginTop: "3px" }}>
            Password must be at least 8 characters with uppercase, lowercase,
            and numbers
          </div>
          {errors.password && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "3px" }}>
              {errors.password}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="phone">Phone (optional):</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Enter your phone number"
            disabled={isSubmitting || loading}
            style={{
              display: "block",
              marginTop: "5px",
              padding: "8px",
              width: "300px",
            }}
          />
          {errors.phone && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "3px" }}>
              {errors.phone}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label htmlFor="profilePictureUrl">
            Profile Picture URL (optional):
          </label>
          <input
            type="url"
            id="profilePictureUrl"
            name="profilePictureUrl"
            value={formData.profilePictureUrl}
            onChange={handleInputChange}
            placeholder="Enter profile picture URL"
            disabled={isSubmitting || loading}
            style={{
              display: "block",
              marginTop: "5px",
              padding: "8px",
              width: "300px",
            }}
          />
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
          {isSubmitting || loading ? "Creating Account..." : "Create Account"}
        </button>
      </div>

      <p style={{ marginTop: "20px" }}>
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{
            background: "none",
            border: "none",
            color: "blue",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Login here
        </button>
      </p>
    </div>
  );
};

export default Register;

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const ProfileManagement = () => {
  const { user, updateProfile, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    profilePictureUrl: user?.profilePictureUrl || "",
    preferences: user?.preferences || {},
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
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
    setSuccess("");

    try {
      const result = await updateProfile(formData);

      if (result.success) {
        setSuccess("Profile updated successfully!");
        setIsEditing(false);
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
      profilePictureUrl: user?.profilePictureUrl || "",
      preferences: user?.preferences || {},
    });
    setErrors({});
    setSuccess("");
    setIsEditing(false);
  };

  const renderViewMode = () => (
    <div style={{ maxWidth: "600px", margin: "20px auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h2>Profile Information</h2>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Edit Profile
        </button>
      </div>

      {success && (
        <div
          style={{
            color: "#155724",
            backgroundColor: "#d4edda",
            padding: "10px",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {success}
        </div>
      )}

      <div style={{ display: "grid", gap: "20px" }}>
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Personal Information</h3>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Name:
            </label>
            <span>
              {user?.firstName} {user?.lastName}
            </span>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Email:
            </label>
            <span>{user?.email}</span>
            {!user?.emailVerified && (
              <span
                style={{
                  marginLeft: "10px",
                  color: "#dc3545",
                  fontSize: "14px",
                  backgroundColor: "#f8d7da",
                  padding: "2px 6px",
                  borderRadius: "12px",
                }}
              >
                Not verified
              </span>
            )}
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Phone:
            </label>
            <span>{user?.phone || "Not provided"}</span>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Profile Picture:
            </label>
            {user?.profilePictureUrl ? (
              <div>
                <img
                  src={user.profilePictureUrl}
                  alt="Profile"
                  style={{
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling.style.display = "block";
                  }}
                />
                <div style={{ display: "none", color: "#666" }}>
                  Invalid image URL
                </div>
              </div>
            ) : (
              <span style={{ color: "#666" }}>No profile picture</span>
            )}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Account Information</h3>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Member Since:
            </label>
            <span>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A"}
            </span>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                fontWeight: "bold",
                display: "block",
                marginBottom: "5px",
              }}
            >
              Last Login:
            </label>
            <span>
              {user?.lastLogin
                ? new Date(user.lastLogin).toLocaleString()
                : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEditMode = () => (
    <div style={{ maxWidth: "600px", margin: "20px auto" }}>
      <h2>Edit Profile</h2>

      {errors.submit && (
        <div
          style={{
            color: "red",
            padding: "10px",
            border: "1px solid red",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          {errors.submit}
        </div>
      )}

      <div style={{ display: "grid", gap: "15px" }}>
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            First Name *:
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            disabled={isSubmitting || loading}
            style={{
              width: "100%",
              padding: "8px",
              border: errors.firstName ? "1px solid red" : "1px solid #ddd",
            }}
          />
          {errors.firstName && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "3px" }}>
              {errors.firstName}
            </div>
          )}
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Last Name *:
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            disabled={isSubmitting || loading}
            style={{
              width: "100%",
              padding: "8px",
              border: errors.lastName ? "1px solid red" : "1px solid #ddd",
            }}
          />
          {errors.lastName && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "3px" }}>
              {errors.lastName}
            </div>
          )}
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Phone:
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Enter your phone number"
            disabled={isSubmitting || loading}
            style={{
              width: "100%",
              padding: "8px",
              border: errors.phone ? "1px solid red" : "1px solid #ddd",
            }}
          />
          {errors.phone && (
            <div style={{ color: "red", fontSize: "14px", marginTop: "3px" }}>
              {errors.phone}
            </div>
          )}
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Profile Picture URL:
          </label>
          <input
            type="url"
            name="profilePictureUrl"
            value={formData.profilePictureUrl}
            onChange={handleInputChange}
            placeholder="Enter profile picture URL"
            disabled={isSubmitting || loading}
            style={{ width: "100%", padding: "8px", border: "1px solid #ddd" }}
          />
          {formData.profilePictureUrl && (
            <div style={{ marginTop: "10px" }}>
              <img
                src={formData.profilePictureUrl}
                alt="Profile Preview"
                style={{
                  width: "100px",
                  height: "100px",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextElementSibling.style.display = "block";
                }}
              />
              <div style={{ display: "none", color: "red", fontSize: "14px" }}>
                Invalid image URL
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              cursor: isSubmitting || loading ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting || loading ? "Updating..." : "Update Profile"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting || loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              cursor: isSubmitting || loading ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return isEditing ? renderEditMode() : renderViewMode();
};

export default ProfileManagement;

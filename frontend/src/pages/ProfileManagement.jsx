"use client";

import React, { useState } from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Alert,
  Avatar,
} from "@mui/material";
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
  const [uploadedImage, setUploadedImage] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        profilePicture: "File must be an image",
      }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        profilePicture: "Image too large (max 5MB)",
      }));
      return;
    }

    setUploadedImage(file);
    setFormData((prev) => ({
      ...prev,
      profilePictureUrl: URL.createObjectURL(file), // preview only
    }));
    setErrors((prev) => ({ ...prev, profilePicture: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    else if (
      formData.firstName.trim().length < 2 ||
      formData.firstName.trim().length > 50
    )
      newErrors.firstName = "First name must be 2-50 characters";

    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    else if (
      formData.lastName.trim().length < 2 ||
      formData.lastName.trim().length > 50
    )
      newErrors.lastName = "Last name must be 2-50 characters";

    if (formData.phone?.trim()) {
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
      const cleanPhone = formData.phone.replace(/[\s\-()]/g, "");
      if (!phoneRegex.test(cleanPhone))
        newErrors.phone = "Invalid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSuccess("");
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        // ❌ don’t send blob: URL to backend
        profilePictureUrl: uploadedImage ? null : formData.profilePictureUrl,
      };

      const result = await updateProfile(payload);
      if (result.success) {
        setSuccess("Profile updated successfully!");
        setIsEditing(false);
        setUploadedImage(null);
      } else {
        setErrors({ submit: result.error });
      }
    } catch {
      setErrors({ submit: "Unexpected error occurred" });
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
    setUploadedImage(null);
    setIsEditing(false);
  };

  const renderEditMode = () => (
    <Box maxWidth="600px" mx="auto" mt={4}>
      <Typography variant="h5" mb={3}>
        Edit Profile
      </Typography>

      {errors.submit && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.submit}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            fullWidth
            error={!!errors.firstName}
            helperText={errors.firstName}
            disabled={isSubmitting || loading}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            fullWidth
            error={!!errors.lastName}
            helperText={errors.lastName}
            disabled={isSubmitting || loading}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            fullWidth
            error={!!errors.phone}
            helperText={errors.phone}
            disabled={isSubmitting || loading}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            component="label"
            disabled={isSubmitting || loading}
          >
            Upload Profile Picture
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleFileChange}
            />
          </Button>
          {errors.profilePicture && (
            <Typography color="error" variant="body2">
              {errors.profilePicture}
            </Typography>
          )}
          {formData.profilePictureUrl && (
            <Box mt={1}>
              <Avatar
                src={formData.profilePictureUrl}
                sx={{ width: 80, height: 80 }}
              />
            </Box>
          )}
        </Grid>
      </Grid>

      <Box mt={3} display="flex" gap={2}>
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmit}
          disabled={isSubmitting || loading}
        >
          {isSubmitting || loading ? "Updating..." : "Update Profile"}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleCancel}
          disabled={isSubmitting || loading}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );

  const renderViewMode = () => (
    <Box maxWidth="600px" mx="auto" mt={4}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Profile Information</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setIsEditing(true)}
        >
          Edit Profile
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2">Name</Typography>
          <Typography>
            {user?.firstName} {user?.lastName}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2">Email</Typography>
          <Typography>
            {user?.email}
            {!user?.emailVerified && (
              <Box
                component="span"
                ml={1}
                px={1}
                bgcolor="#f8d7da"
                color="#dc3545"
                borderRadius="12px"
                fontSize={12}
              >
                Not Verified
              </Box>
            )}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2">Phone</Typography>
          <Typography>{user?.phone || "Not provided"}</Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2">Profile Picture</Typography>
          {user?.profilePictureUrl ? (
            <Avatar
              src={user.profilePictureUrl}
              alt="Profile"
              sx={{ width: 80, height: 80 }}
            />
          ) : (
            <Typography color="textSecondary">No profile picture</Typography>
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2">Member Since</Typography>
          <Typography>
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "N/A"}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2">Last Login</Typography>
          <Typography>
            {user?.lastLogin
              ? new Date(user.lastLogin).toLocaleString()
              : "N/A"}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );

  return isEditing ? renderEditMode() : renderViewMode();
};

export default ProfileManagement;

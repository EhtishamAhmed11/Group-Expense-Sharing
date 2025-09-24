"use client";

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  DollarSign,
  FileText,
  Users,
  User,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE_URL = "http://localhost:3005/api";

export default function CreateSettlement() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract groupId and otherUserId from query params
  const queryParams = new URLSearchParams(location.search);
  const initialGroupId = queryParams.get("groupId") || "";
  const initialOtherUserId = queryParams.get("otherUserId") || "";

  const [form, setForm] = useState({
    groupId: initialGroupId,
    otherUserId: initialOtherUserId,
    amount: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/settlements/settle/${form.groupId}/${form.otherUserId}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: form.amount,
            notes: form.notes,
          }),
        }
      );

      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Failed to create settlement");

      toast.success("Settlement created successfully!");
      navigate("/debt"); // redirect back after success
    } catch (err) {
      const errorMsg = err.message || "Unknown error";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      {/* Page Header */}
      <Box className="mb-6">
        <Button
          startIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: "none", mb: 2 }}
        >
          Back
        </Button>

        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Create Settlement
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Settle debts between group members
        </Typography>
      </Box>

      {/* Main Card */}
      <Card
        component={motion.div}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        sx={{ borderRadius: 3, boxShadow: 4 }}
      >
        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Group + Other User */}
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <TextField
                name="groupId"
                label="Group ID"
                value={form.groupId}
                onChange={handleChange}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Users className="w-4 h-4 text-gray-500" />
                    </InputAdornment>
                  ),
                }}
                placeholder="Enter group ID"
              />

              <TextField
                name="otherUserId"
                label="Other User ID"
                value={form.otherUserId}
                onChange={handleChange}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <User className="w-4 h-4 text-gray-500" />
                    </InputAdornment>
                  ),
                }}
                placeholder="Enter user ID"
              />
            </Box>

            {/* Amount */}
            <TextField
              name="amount"
              label="Settlement Amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              required
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                  </InputAdornment>
                ),
              }}
              placeholder="0.00"
              helperText="Enter the amount to settle"
              sx={{ mb: 4 }}
            />

            {/* Notes */}
            <TextField
              name="notes"
              label="Notes (Optional)"
              value={form.notes}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FileText className="w-4 h-4 text-gray-500 self-start mt-3" />
                  </InputAdornment>
                ),
              }}
              placeholder="Add any additional notes about this settlement..."
              sx={{ mb: 4 }}
            />

            <Divider sx={{ my: 4 }} />

            {/* Actions */}
            <Box className="flex gap-3">
              <Button
                type="button"
                variant="outlined"
                onClick={() => navigate(-1)}
                className="flex-1"
                sx={{
                  textTransform: "none",
                  borderRadius: "0.75rem",
                  fontWeight: 500,
                  height: "44px",
                  borderColor: "black",
                  color: "black",
                  "&:hover": {
                    borderColor: "black",
                    backgroundColor: "rgba(0,0,0,0.04)",
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                className="flex-1"
                sx={{
                  textTransform: "none",
                  borderRadius: "0.75rem",
                  fontWeight: 500,
                  height: "44px",
                  backgroundColor: "black",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "#333", // softer black on hover
                  },
                }}
                startIcon={
                  loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )
                }
              >
                {loading ? "Creating..." : "Create Settlement"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}

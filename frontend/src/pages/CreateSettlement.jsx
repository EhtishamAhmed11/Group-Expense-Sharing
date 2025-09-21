"use client";

// src/pages/CreateSettlement.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Container,
  Divider,
} from "@mui/material";
import {
  ArrowLeft,
  DollarSign,
  FileText,
  Users,
  User,
  CheckCircle,
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
      // match backend: POST /api/debts/settle/:groupId/:toUserId
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
    <Container maxWidth="md" className="py-8">
      <Box className="mb-6">
        <Button
          startIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(-1)}
          className="mb-4 text-gray-600"
          sx={{ textTransform: "none" }}
        >
          Back
        </Button>

        <Typography variant="h4" className="font-bold text-gray-900 mb-2">
          Create Settlement
        </Typography>
        <Typography variant="body2" className="text-gray-600">
          Settle debts between group members
        </Typography>
      </Box>

      <Card className="shadow-lg rounded-2xl border-0">
        <CardHeader className="pb-4">
          <Box className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <Typography variant="h6" className="font-semibold">
              Settlement Details
            </Typography>
          </Box>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert severity="error" className="rounded-lg">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                name="groupId"
                label="Group ID"
                value={form.groupId}
                onChange={handleChange}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <Users className="w-4 h-4 mr-2 text-gray-500" />
                  ),
                }}
                className="bg-gray-50"
                variant="outlined"
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
                    <User className="w-4 h-4 mr-2 text-gray-500" />
                  ),
                }}
                className="bg-gray-50"
                variant="outlined"
                placeholder="Enter user ID"
              />
            </Box>

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
                  <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
                ),
              }}
              className="bg-gray-50"
              variant="outlined"
              placeholder="0.00"
              helperText="Enter the amount to settle"
            />

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
                  <FileText className="w-4 h-4 mr-2 text-gray-500 self-start mt-3" />
                ),
              }}
              className="bg-gray-50"
              variant="outlined"
              placeholder="Add any additional notes about this settlement..."
            />

            <Divider className="my-6" />

            <Box className="flex gap-3">
              <Button
                type="button"
                variant="outlined"
                onClick={() => navigate(-1)}
                className="flex-1"
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
                sx={{
                  textTransform: "none",
                  backgroundColor: "rgb(34, 197, 94)",
                  "&:hover": {
                    backgroundColor: "rgb(21, 128, 61)",
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

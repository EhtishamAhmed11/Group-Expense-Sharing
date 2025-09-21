"use client";

// src/pages/CreateExpense.jsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
} from "@mui/material";
import { ArrowLeft, DollarSign, FileText, Tag } from "lucide-react";
import { toast } from "react-hot-toast";

const CreateExpense = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "http://localhost:3005/api/group-expense/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
          body: JSON.stringify({
            amount,
            description,
            category_name: category,
            group_id: groupId,
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        toast.success("Expense created successfully!");
        navigate(`/groups/${groupId}/expenses`);
      } else {
        setError(data.message || "Failed to create expense");
        toast.error(data.message || "Failed to create expense");
      }
    } catch (err) {
      console.error("Error creating expense:", err);
      const errorMsg = "Something went wrong";
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
          Create New Expense
        </Typography>
        <Typography variant="body2" className="text-gray-600">
          Add a new expense to group {groupId}
        </Typography>
      </Box>

      <Card className="shadow-lg rounded-2xl border-0">
        <CardHeader className="pb-4">
          <Typography variant="h6" className="font-semibold">
            Expense Details
          </Typography>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert severity="error" className="rounded-lg">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <DollarSign className="w-4 h-4 mr-2 text-gray-500" />
                ),
              }}
              className="bg-gray-50"
              variant="outlined"
              placeholder="0.00"
            />

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <FileText className="w-4 h-4 mr-2 text-gray-500" />
                ),
              }}
              className="bg-gray-50"
              variant="outlined"
              placeholder="What was this expense for?"
            />

            <TextField
              fullWidth
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              InputProps={{
                startAdornment: <Tag className="w-4 h-4 mr-2 text-gray-500" />,
              }}
              className="bg-gray-50"
              variant="outlined"
              placeholder="e.g., Food, Transport, Entertainment"
            />

            <Box className="flex gap-3 pt-4">
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
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                sx={{
                  textTransform: "none",
                  backgroundColor: "rgb(37, 99, 235)",
                  "&:hover": {
                    backgroundColor: "rgb(29, 78, 216)",
                  },
                }}
                startIcon={
                  loading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <DollarSign className="w-4 h-4" />
                  )
                }
              >
                {loading ? "Creating..." : "Create Expense"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreateExpense;

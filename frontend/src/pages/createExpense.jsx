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
import { InputAdornment } from "@mui/material";
import { motion } from "framer-motion";

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
      setError("Something went wrong");
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" className="py-10">
      {/* Back Button */}
      <Button
        startIcon={<ArrowLeft />}
        onClick={() => navigate(-1)}
        className="mb-6 text-gray-600 hover:text-gray-900 transition-colors duration-200"
        sx={{ textTransform: "none" }}
      >
        Back
      </Button>

      {/* Page Title */}
      <Typography variant="h4" className="font-bold text-gray-900 mb-2">
        Create New Expense
      </Typography>
      <Typography variant="body2" className="text-gray-600 mb-6">
        Add a new expense to group <strong>{groupId}</strong>
      </Typography>

      {/* Card */}
      <Card
        component={motion.div}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-3xl shadow-xl border-0 hover:shadow-2xl transition-shadow duration-300"
      >
        <CardHeader
          className="bg-blue-50 px-6 py-4"
          title={
            <Typography variant="h6" className="font-semibold text-blue-700">
              Expense Details
            </Typography>
          }
        />

        <CardContent className="p-6 space-y-6">
          {error && (
            <Alert severity="error" className="rounded-lg">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                  </InputAdornment>
                ),
              }}
              placeholder="0.00"
              variant="outlined"
              className="bg-gray-50 rounded-lg"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": { borderColor: "rgb(37, 99, 235)" },
                  "&.Mui-focused fieldset": { borderColor: "rgb(37, 99, 235)" },
                },
              }}
            />

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FileText className="w-4 h-4 text-gray-500" />
                  </InputAdornment>
                ),
              }}
              placeholder="What was this expense for?"
              variant="outlined"
              className="bg-gray-50 rounded-lg"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": { borderColor: "rgb(37, 99, 235)" },
                  "&.Mui-focused fieldset": { borderColor: "rgb(37, 99, 235)" },
                },
              }}
            />

            <TextField
              fullWidth
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Tag className="w-4 h-4 text-gray-500" />
                  </InputAdornment>
                ),
              }}
              placeholder="e.g., Food, Transport, Entertainment"
              variant="outlined"
              className="bg-gray-50 rounded-lg"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": { borderColor: "rgb(37, 99, 235)" },
                  "&.Mui-focused fieldset": { borderColor: "rgb(37, 99, 235)" },
                },
              }}
            />

            <Box className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outlined"
                onClick={() => navigate(-1)}
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                sx={{ textTransform: "none" }}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                sx={{
                  textTransform: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 500,
                }}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <DollarSign className="w-4 h-4 mr-2" />
                )}
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

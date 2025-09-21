"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import { DollarSign, FileText, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

const SettleDebt = ({ groupId, toUserId }) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState("cash");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSettle = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `http://localhost:3005/api/settlements/settle/${groupId}/${toUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            amount,
            description,
            settlementMethod: method,
          }),
        }
      );

      const data = await res.json();
      setResponse(data);

      if (data.success) {
        toast.success("Settlement created successfully!");
        setAmount("");
        setDescription("");
        setMethod("cash");
      } else {
        toast.error(data.message || "Failed to create settlement");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while creating settlement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <Card className="shadow-lg">
        <CardHeader
          title={
            <Typography
              variant="h5"
              className="font-semibold flex items-center gap-2"
            >
              <DollarSign className="w-6 h-6 text-blue-600" />
              Settle Debt
            </Typography>
          }
          subheader={
            <Typography variant="body2" className="text-gray-600 mt-1">
              Create a settlement to resolve outstanding debts
            </Typography>
          }
        />

        <CardContent>
          <form onSubmit={handleSettle} className="space-y-4">
            <TextField
              fullWidth
              type="number"
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DollarSign className="text-gray-400" />
                  </InputAdornment>
                ),
              }}
              required
              disabled={loading}
            />

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this settlement for?"
              multiline
              rows={2}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FileText className="text-gray-400" />
                  </InputAdornment>
                ),
              }}
              disabled={loading}
            />

            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                label="Payment Method"
                startAdornment={
                  <InputAdornment position="start">
                    <CreditCard className="text-gray-400" />
                  </InputAdornment>
                }
                disabled={loading}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank">Bank Transfer</MenuItem>
                <MenuItem value="wallet">Digital Wallet</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || !amount}
              className="bg-blue-600 hover:bg-blue-700 py-3"
            >
              {loading ? (
                <Box className="flex items-center justify-center gap-2">
                  <CircularProgress size={20} color="inherit" />
                  Creating Settlement...
                </Box>
              ) : (
                "Create Settlement"
              )}
            </Button>
          </form>

          {response && (
            <Box className="mt-4">
              <Alert
                severity={response.success ? "success" : "error"}
                className="rounded-lg"
              >
                {response.message || JSON.stringify(response, null, 2)}
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettleDebt;

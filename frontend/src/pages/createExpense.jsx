"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  TextField,
  MenuItem,
  Button,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Paper,
  Box,
  Grid,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CreateExpense = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [payerId, setPayerId] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [splitDetails, setSplitDetails] = useState([]);
  const [hasMultiplePayers, setHasMultiplePayers] = useState(false);
  const [payerDetails, setPayerDetails] = useState([]);

  // Data state
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, memRes] = await Promise.all([
          fetch("http://localhost:3005/api/expense/get-categories", {
            credentials: "include",
          }),
          fetch(`http://localhost:3005/api/groups/members/${groupId}`, {
            credentials: "include",
          }),
        ]);

        if (!catRes.ok || !memRes.ok) throw new Error("Failed to fetch data");

        const categoriesData = await catRes.json();
        const membersData = await memRes.json();

        setCategories(categoriesData.data?.categories || []);
        setMembers(membersData.data?.members || []);
      } catch (error) {
        toast.error("Failed to load categories or members");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId]);

  // Handle split inputs
  const handleSplitChange = (userId, value) => {
    setSplitDetails((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((d) => d.user_id === userId);
      if (index !== -1) updated[index].value = value;
      else updated.push({ user_id: userId, value });
      return updated;
    });
  };

  // Handle payer inputs
  const handlePayerChange = (userId, value) => {
    setPayerDetails((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((p) => p.user_id === userId);
      if (index !== -1) updated[index].amount_paid = value;
      else updated.push({ user_id: userId, amount_paid: value });
      return updated;
    });
  };

  // Validation
  const validateForm = () => {
    if (!description || !amount || !category) {
      toast.error("Please fill all required fields.");
      return false;
    }

    if (!hasMultiplePayers && !payerId) {
      toast.error("Please select a payer.");
      return false;
    }

    if (hasMultiplePayers) {
      const totalPaid = payerDetails.reduce(
        (sum, p) => sum + parseFloat(p.amount_paid || 0),
        0
      );
      if (totalPaid !== parseFloat(amount)) {
        toast.error("Total paid amount must equal total expense amount.");
        return false;
      }
    }

    if (splitType === "exact") {
      const totalSplit = splitDetails.reduce(
        (sum, d) => sum + parseFloat(d.value || 0),
        0
      );
      if (totalSplit !== parseFloat(amount)) {
        toast.error("Exact split amounts must equal total amount.");
        return false;
      }
    }

    if (splitType === "percentage") {
      const totalPercentage = splitDetails.reduce(
        (sum, d) => sum + parseFloat(d.value || 0),
        0
      );
      if (totalPercentage !== 100) {
        toast.error("Percentage split must add up to 100%.");
        return false;
      }
    }

    return true;
  };

  // Submit expense
  const handleSubmit = async () => {
    if (!validateForm()) return;

    let finalSplit = [];
    if (splitType === "equal") {
      const equalShare = parseFloat(amount) / members.length;
      finalSplit = members.map((m) => ({
        user_id: m.id,
        amount: equalShare,
      }));
    } else if (splitType === "exact") {
      finalSplit = splitDetails.map((d) => ({
        user_id: d.user_id,
        amount: parseFloat(d.value),
      }));
    } else if (splitType === "percentage") {
      finalSplit = splitDetails.map((d) => ({
        user_id: d.user_id,
        amount: (parseFloat(d.value) / 100) * parseFloat(amount),
      }));
    }

    const payload = {
      amount: parseFloat(amount),
      description,
      category_name: category,
      group_id: groupId,
      expense_type: "group",
      split_type: splitType,
      split_details: finalSplit,
      has_multiple_payers: hasMultiplePayers,
      payer_details: hasMultiplePayers
        ? payerDetails.map((p) => ({
            user_id: p.user_id,
            amount_paid: parseFloat(p.amount_paid),
          }))
        : [{ user_id: payerId, amount_paid: parseFloat(amount) }],
    };

    try {
      const res = await fetch(
        "http://localhost:3005/api/group-expense/create",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          credentials: "include",
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Expense added successfully!");
        setTimeout(() => navigate(`/groups/${groupId}/expenses`), 1200);
      } else {
        toast.error(data.message || "Failed to add expense");
      }
    } catch (error) {
      toast.error("Something went wrong while creating expense.");
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box p={4} display="flex" justifyContent="center">
      <ToastContainer />
      <Paper elevation={3} sx={{ p: 4, width: "700px" }}>
        <Typography variant="h5" gutterBottom>
          Add Expense
        </Typography>

        {/* Description */}
        <TextField
          label="Description"
          fullWidth
          margin="normal"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Amount */}
        <TextField
          label="Amount"
          type="number"
          fullWidth
          margin="normal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {/* Category */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            label="Category"
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.name}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Multiple Payers Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={hasMultiplePayers}
              onChange={(e) => setHasMultiplePayers(e.target.checked)}
              color="primary"
            />
          }
          label="Multiple Payers"
        />

        {/* Payer Section */}
        {hasMultiplePayers ? (
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>
              Who Paid (Payer Details)
            </Typography>
            <Grid container spacing={2}>
              {members.map((m) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  key={m.id}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography>{m.name}</Typography>
                  <TextField
                    type="number"
                    placeholder="Amount Paid"
                    size="small"
                    sx={{ width: "120px" }}
                    onChange={(e) => handlePayerChange(m.id, e.target.value)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : (
          <FormControl fullWidth margin="normal">
            <InputLabel>Payer</InputLabel>
            <Select
              value={payerId}
              label="Payer"
              onChange={(e) => setPayerId(e.target.value)}
            >
              {members.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Split Type */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Split Type</InputLabel>
          <Select
            value={splitType}
            label="Split Type"
            onChange={(e) => setSplitType(e.target.value)}
          >
            <MenuItem value="equal">Equal</MenuItem>
            <MenuItem value="exact">Exact</MenuItem>
            <MenuItem value="percentage">Percentage</MenuItem>
          </Select>
        </FormControl>

        {/* Split Details */}
        {(splitType === "exact" || splitType === "percentage") && (
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>
              How to Split ({splitType === "exact" ? "Amounts" : "Percentages"})
            </Typography>
            <Grid container spacing={2}>
              {members.map((m) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  key={m.id}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography>{m.name}</Typography>
                  <TextField
                    type="number"
                    placeholder={splitType === "exact" ? "Amount" : "%"}
                    size="small"
                    sx={{ width: "120px" }}
                    onChange={(e) => handleSplitChange(m.id, e.target.value)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Buttons */}
        <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            Add Expense
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default CreateExpense;

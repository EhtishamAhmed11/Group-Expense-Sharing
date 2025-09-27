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
} from "@mui/material";

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

  // Data state
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories + members
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

        if (!catRes.ok || !memRes.ok) {
          throw new Error("Failed to fetch categories or members");
        }

        const categoriesData = await catRes.json();
        const membersData = await memRes.json();
        console.log(membersData);
        setCategories(categoriesData.data?.categories || []);
        setMembers(membersData.data?.members || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId]);

  // Handle split detail input changes
  const handleSplitChange = (userId, value) => {
    setSplitDetails((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((d) => d.user_id === userId);
      if (index !== -1) {
        updated[index].value = value;
      } else {
        updated.push({ user_id: userId, value });
      }
      return updated;
    });
  };

  // Validation
  const validateForm = () => {
    if (!description || !amount || !category || !payerId) {
      alert("Please fill all required fields.");
      return false;
    }

    if (splitType === "exact") {
      const total = splitDetails.reduce(
        (sum, d) => sum + parseFloat(d.value || 0),
        0
      );
      if (total !== parseFloat(amount)) {
        alert("Exact split amounts must equal total amount.");
        return false;
      }
    }

    if (splitType === "percentage") {
      const total = splitDetails.reduce(
        (sum, d) => sum + parseFloat(d.value || 0),
        0
      );
      if (total !== 100) {
        alert("Percentage split must add up to 100%.");
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
      payer_id: payerId,
      split_type: splitType,
      split_details: finalSplit,
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
        alert("Expense added successfully!");
        navigate(`/groups/${groupId}/expenses`);
      } else {
        alert(data.message || "Failed to add expense");
      }
    } catch (error) {
      console.error("Error creating expense:", error);
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

        {/* Payer */}
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

        {/* Extra Inputs */}
        {(splitType === "exact" || splitType === "percentage") && (
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>
              Enter {splitType === "exact" ? "Amounts" : "Percentages"}
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

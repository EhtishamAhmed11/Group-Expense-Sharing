"use client";

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";

/**
 * CreateExpense dialog
 *
 * - open, onClose: optional. If onClose is provided, we CALL onClose() after success.
 *   Otherwise we navigate to /groups/:groupId/expenses (keeps backwards compatibility).
 *
 * - Robust parsing of API responses (handles resp.data.group or resp.group etc).
 * - Normalizes members to { id, name }.
 * - Normalizes categories to { id, name } (menu uses name as category_name).
 */

const normalizeMember = (m) => {
  const id =
    m?.userId ?? m?.user_id ?? m?.id ?? m?._id ?? m?.memberId ?? m?.user?.id;
  const name =
    m?.username ??
    (m?.firstName || m?.first_name
      ? `${m?.firstName ?? m?.first_name} ${
          m?.lastName ?? m?.last_name ?? ""
        }`.trim()
      : m?.name ??
        m?.fullName ??
        `${m?.first_name ?? ""} ${m?.last_name ?? ""}`.trim());
  return { id, name: name || id || "Unknown" };
};

const normalizeCategories = (raw) => {
  // raw might be: ["Food","Transport"] OR [{_id,name}, ...] OR { categories: [...] } etc
  const data = raw ?? [];
  if (Array.isArray(data)) {
    return data.map((c) =>
      typeof c === "string"
        ? { id: c, name: c }
        : {
            id: c._id ?? c.id ?? c.name,
            name:
              c.name ??
              c.label ??
              c.category_name ??
              String(c._id ?? c.id ?? c.name),
          }
    );
  }
  // fallback objects
  if (Array.isArray(raw?.categories))
    return normalizeCategories(raw.categories);
  if (Array.isArray(raw?.data)) return normalizeCategories(raw.data);
  return [];
};

const CreateExpense = ({ open = false, onClose = null }) => {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [payer, setPayer] = useState("");
  const [participants, setParticipants] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [members, setMembers] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);

  // ----------------- FETCH CATEGORIES -----------------
  useEffect(() => {
    fetch("http://localhost:3005/api/expense/get-categories", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      credentials: "include",
    })
      .then((res) => res.json()) // <-- return json so next then receives it
      .then((resp) => {
        // resp may be { success: true, data: [...] } or [...] or { categories: [...] }
        const payload = resp?.data ?? resp;
        const cats = normalizeCategories(payload);
        setCategoryOptions(cats);
        // if none selected yet, pick first (optional)
        if (!category && cats.length) setCategory(cats[0].name);
      })
      .catch((err) => {
        console.error("Categories fetch error:", err);
        setCategoryOptions([]);
      });
  }, []);

  // ----------------- FETCH GROUP + MEMBERS -----------------
  useEffect(() => {
    if (!groupId) return;

    // Group details (different backends may return resp.data.group or resp.group)
    fetch(`http://localhost:3005/api/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((resp) => {
        const payload = resp?.data ?? resp;
        // payload might already be group or { group: { ... } }
        const grp = payload?.group ?? payload;
        setGroup(grp);

        // if group includes members inside, normalize them
        const grpMembers = Array.isArray(grp?.members) ? grp.members : [];
        if (grpMembers.length) {
          const norm = grpMembers.map(normalizeMember).filter((m) => m.id);
          setMembers(norm);
          // set default payer to current user if present in members
          if (norm.length && !payer) setPayer(norm[0].id);
        }
      })
      .catch((err) => {
        console.error("Group fetch error:", err);
      });

    // Separate members endpoint (some APIs use /members/:id)
    fetch(`http://localhost:3005/api/groups/members/${groupId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      credentials: "include",
    })
      .then((res) => res.json())
      .then((resp) => {
        const payload = resp?.data ?? resp;
        const list = payload?.members ?? payload;
        if (Array.isArray(list)) {
          const norm = list.map(normalizeMember).filter((m) => m.id);
          setMembers(norm);
          if (norm.length && !payer) setPayer(norm[0].id);
        }
      })
      .catch(() => {
        // ignore — we may already have members from group object
      });
  }, [groupId]); // eslint-disable-line

  const toggleParticipant = (id) => {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Please add a description");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:3005/api/group-expense/create",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            amount,
            description,
            category_name: category,
            group_id: groupId,
            payer_id: payer,
            participants,
            date,
          }),
        }
      );

      const data = await res.json();
      if (data?.success) {
        toast.success("Expense created!");
        // If parent passed onClose (opened as dialog inside GroupExpenses) -> just close
        if (typeof onClose === "function") {
          onClose();
        } else {
          // fallback: navigate to group's expense list
          navigate(`/groups/${groupId}/expenses`);
        }
      } else {
        toast.error(data?.message || "Failed to create expense");
      }
    } catch (err) {
      console.error("Create expense error:", err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={!!open}
      onClose={() => (typeof onClose === "function" ? onClose() : null)}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3, p: 0 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
        }}
      >
        <Typography fontWeight={700}>Add Group Expense</Typography>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Add Group Expense
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ fontSize: "1.2rem", fontWeight: "bold" }}
          >
            ✕
          </IconButton>
        </DialogTitle>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {/* Type / Amount */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select value="Group" label="Type" disabled>
                <MenuItem value="Group">Group</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Grid>

          {/* Description (full width) */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this expense for?"
            />
          </Grid>

          {/* Category / Date */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
              >
                {categoryOptions.length === 0 ? (
                  <MenuItem value="">
                    <em>No categories</em>
                  </MenuItem>
                ) : (
                  categoryOptions.map((c) => (
                    <MenuItem key={c.id ?? c.name} value={c.name}>
                      {c.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Grid>

          {/* Group / Payer */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Group</InputLabel>
              <Select
                value={group?.id ?? group?._id ?? group?.name ?? ""}
                label="Group"
                disabled
              >
                <MenuItem value={group?.id ?? group?._id ?? group?.name}>
                  {group?.name ?? "Selected group"}
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Payer</InputLabel>
              <Select
                value={payer}
                label="Payer"
                onChange={(e) => setPayer(e.target.value)}
              >
                {members.length === 0 ? (
                  <MenuItem value="">
                    <em>No members</em>
                  </MenuItem>
                ) : (
                  members.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* Participants */}
          <Grid item xs={12}>
            <Typography mb={1} fontWeight={600}>
              Participants
            </Typography>
            <Grid container spacing={1}>
              {(members.length ? members : []).map((m) => (
                <Grid item xs={12} sm={6} key={m.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={participants.includes(m.id)}
                        onChange={() => toggleParticipant(m.id)}
                        sx={{
                          "&.Mui-checked": { color: "black" },
                        }}
                      />
                    }
                    label={m.name}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Actions */}
          <Grid item xs={12} textAlign="right">
            <Box sx={{ display: "inline-flex", gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() =>
                  typeof onClose === "function" ? onClose() : navigate(-1)
                }
                sx={{
                  textTransform: "none",
                  borderColor: "#ddd",
                  color: "#000",
                }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                onClick={submit}
                disabled={loading}
                sx={{
                  backgroundColor: "#000",
                  color: "#fff",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#222" },
                }}
              >
                {loading ? "Saving..." : "Save"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default CreateExpense;

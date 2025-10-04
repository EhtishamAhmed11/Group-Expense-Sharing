"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
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
  console.log("CreateSettlement rendered");
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId: initialGroupId, toUserId: initialOtherUserId } = useParams();

  const [groupName, setGroupName] = useState("");
  const [otherUserName, setOtherUserName] = useState("");
  const [form, setForm] = useState({
    groupId: initialGroupId,
    otherUserId: initialOtherUserId,
    amount: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch group name
  useEffect(() => {
    if (!initialGroupId) return;

    const fetchGroupName = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/groups/${initialGroupId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          credentials: "include",
        });
        const json = await res.json();
        if (json.success && json.data.group?.name) {
          setGroupName(json.data.group.name);
        } else {
          setGroupName("Group");
        }
      } catch (err) {
        console.error("Failed to fetch group name:", err);
        setGroupName("Group");
      }
    };

    fetchGroupName();
  }, [initialGroupId]);

  // Fetch members and find the other user's name
  useEffect(() => {
    console.log("useEffect triggered", { initialGroupId, initialOtherUserId });

    const fetchMembers = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/groups/members/${initialGroupId}`,
          { credentials: "include" }
        );
        const json = await res.json();
        console.log("Members response:", json);
        console.log("other user id:", initialOtherUserId);
        if (json.success && Array.isArray(json.data.members)) {
          const member = json.data.members.find((m) => {
            m.id.toString().trim() === initialOtherUserId.toString().trim();
            console.log("Checking member:", m);
            console.log(
              m.id.toString().trim() === initialOtherUserId.toString().trim()
            );
          });
          console.log("Found member:", member);

          if (member) {
            setOtherUserName(`${member.firstName} ${member.lastName}`);
          } else {
            setOtherUserName("Unknown User");
          }
        }
      } catch (err) {
        console.error("Failed to fetch members:", err);
        setOtherUserName("Unknown User");
      }
    };

    if (initialGroupId) fetchMembers();
  }, [initialGroupId, initialOtherUserId]);

  // Auto-fill amount if known
  useEffect(() => {
    if (!initialGroupId || !initialOtherUserId) return;

    const fetchAmount = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/debt/${initialGroupId}/detailed`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (
          json.success &&
          json.data.peopleUserOwes &&
          json.data.peopleUserOwes[initialOtherUserId]
        ) {
          setForm((f) => ({
            ...f,
            amount:
              json.data.peopleUserOwes[initialOtherUserId].totalAmount || "",
          }));
        }
      } catch (err) {
        console.warn("Could not auto-fill amount:", err);
      }
    };

    fetchAmount();
  }, [initialGroupId, initialOtherUserId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

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
      navigate("/debt");
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
          startIcon={<ArrowLeft />}
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

      {/* Card Form */}
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
            {/* Group & User */}
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <TextField
                label="Group"
                value={groupName}
                fullWidth
                InputProps={{
                  readOnly: true,
                  startAdornment: <Users className="w-4 h-4 text-gray-500" />,
                }}
              />
              <TextField
                label="User"
                value={otherUserName}
                fullWidth
                InputProps={{
                  readOnly: true,
                  startAdornment: <User className="w-4 h-4 text-gray-500" />,
                }}
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
                  <DollarSign className="w-4 h-4 text-gray-500" />
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
                  <FileText className="w-4 h-4 text-gray-500 self-start mt-3" />
                ),
              }}
              placeholder="Add any additional notes..."
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
                  "&:hover": { backgroundColor: "#333" },
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

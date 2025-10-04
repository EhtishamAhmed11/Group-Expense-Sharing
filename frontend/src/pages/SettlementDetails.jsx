"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  CircularProgress,
  Chip,
  Divider,
  Grid,
  Container,
} from "@mui/material";
import {
  FileText,
  DollarSign,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useSettlements } from "../context/SettlementsContext";

const API_BASE_URL = "http://localhost:3005/api";

export default function SettlementDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateSettlement } = useSettlements();

  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(true);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchSettlement = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/settlements/settlements/${id}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.success && data.data?.settlement)
          setSettlement(data.data.settlement);
        else toast.error("Settlement not found");
      } catch (err) {
        toast.error("Failed to load settlement details");
      } finally {
        setLoading(false);
      }
    };
    fetchSettlement();
  }, [id]);

  const fullyConfirmed =
    settlement?.confirmationStatus?.fullyConfirmed ||
    settlement?.status === "confirmed";
  const canTakeAction =
    settlement &&
    !fullyConfirmed &&
    !settlement.disputed &&
    ((settlement.userRole === "payer" &&
      !settlement.confirmationStatus?.confirmedByPayer) ||
      (settlement.userRole === "receiver" &&
        !settlement.confirmationStatus?.confirmedByReceiver));

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "pending":
        return "warning";
      case "disputed":
        return "error";
      default:
        return "default";
    }
  };

  const handleConfirmAction = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settlements/${id}/confirm`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm, disputeReason: reason }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to update");

      toast.success(confirm ? "Settlement confirmed!" : "Settlement disputed");

      // Update global context
      updateSettlement(id, { status: confirm ? "confirmed" : "disputed" });

      navigate("/settlements");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading)
    return (
      <Box className="flex items-center justify-center min-h-64">
        <CircularProgress />
      </Box>
    );
  if (!settlement)
    return (
      <Box className="max-w-xl mx-auto p-6 text-center text-gray-600">
        Settlement not found
      </Box>
    );

  return (
    <Container maxWidth="lg" className="py-10">
      <Box className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Button
          startIcon={<ArrowLeft />}
          onClick={() => navigate("/settlements")}
          className="text-gray-600 hover:text-gray-800"
        >
          Back to Settlements
        </Button>
        <Typography
          variant="h4"
          className="font-bold flex items-center gap-3 text-gray-900 mt-2"
        >
          <FileText className="w-8 h-8 text-grey-600" /> Settlement Details
        </Typography>
        <Typography variant="body1" className="text-gray-600 mt-2">
          View detailed information and take actions
        </Typography>
      </Box>

      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} md={7}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-md rounded-2xl">
              <CardHeader
                title={
                  <Typography variant="h6" className="font-semibold">
                    Settlement Information
                  </Typography>
                }
              />
              <CardContent className="space-y-4">
                <Grid container spacing={4}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" className="text-gray-600">
                      Settlement ID
                    </Typography>
                    <Typography
                      variant="body1"
                      className="font-mono break-words"
                    >
                      {settlement.id}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" className="text-gray-600">
                      Group
                    </Typography>
                    <Typography
                      variant="body1"
                      className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      {settlement.group?.name || settlement.groupId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" className="text-gray-600">
                      Payer
                    </Typography>
                    <Typography variant="body1">
                      {settlement.payer?.name || settlement.payer?.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" className="text-gray-600">
                      Receiver
                    </Typography>
                    <Typography variant="body1">
                      {settlement.receiver?.name || settlement.receiver?.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" className="text-gray-600">
                      Amount
                    </Typography>
                    <Typography
                      variant="h6"
                      className="font-bold flex items-center gap-2 text-green-600"
                    >
                      <DollarSign className="w-5 h-5" />${settlement.amount}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" className="text-gray-600">
                      Payment Method
                    </Typography>
                    <Typography
                      variant="body1"
                      className="flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      {settlement.method || "N/A"}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider />

                <Box>
                  <Typography variant="body2" className="text-gray-600 mb-1">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {settlement.description?.replace(
                      settlement.groupId,
                      settlement.group?.name || "N/A"
                    ) || "No description provided"}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" className="text-gray-600 mb-1">
                    Status
                  </Typography>
                  <Chip
                    label={settlement.status}
                    color={getStatusColor(settlement.status)}
                    icon={
                      fullyConfirmed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )
                    }
                    className="capitalize"
                  />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={5}>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {fullyConfirmed ? (
              <Card className="shadow-md rounded-2xl border-green-200 text-center p-6 space-y-4">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                <Typography
                  variant="h6"
                  className="font-semibold text-green-600"
                >
                  Settlement Confirmed
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Confirmed by both parties
                </Typography>
              </Card>
            ) : canTakeAction ? (
              <Card className="shadow-md rounded-2xl">
                <CardHeader
                  title={
                    <Typography variant="h6" className="font-semibold">
                      Take Action
                    </Typography>
                  }
                  subheader={
                    <Typography variant="body2" className="text-gray-600">
                      Confirm or dispute this settlement
                    </Typography>
                  }
                />
                <CardContent className="space-y-4">
                  <FormControl component="fieldset">
                    <FormLabel className="text-gray-700 font-semibold">
                      Your Decision
                    </FormLabel>
                    <RadioGroup
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value === "true")}
                    >
                      <FormControlLabel
                        value={true}
                        control={<Radio className="text-green-600" />}
                        label="Confirm Settlement"
                      />
                      <FormControlLabel
                        value={false}
                        control={<Radio className="text-red-600" />}
                        label="Dispute Settlement"
                      />
                    </RadioGroup>
                  </FormControl>
                  {!confirm && (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Reason for Dispute"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explain why you're disputing"
                      required
                    />
                  )}
                  <Button
                    onClick={handleConfirmAction}
                    disabled={actionLoading || (!confirm && !reason.trim())}
                    variant="contained"
                    fullWidth
                    className={`py-3 rounded-xl ${
                      confirm
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {actionLoading ? (
                      <Box className="flex items-center gap-2 justify-center">
                        <CircularProgress size={20} color="inherit" />
                        Processing...
                      </Box>
                    ) : confirm ? (
                      "Confirm Settlement"
                    ) : (
                      "Dispute Settlement"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-md rounded-2xl text-center p-6 space-y-4">
                <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto" />
                <Typography
                  variant="h6"
                  className="font-semibold text-gray-600"
                >
                  No Action Required
                </Typography>
                <Typography variant="body2" className="text-gray-500">
                  No further actions available at this time.
                </Typography>
              </Card>
            )}
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  );
}

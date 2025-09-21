"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  Alert,
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
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:3005/api";

export default function SettlementDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirm, setConfirm] = useState(true);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchSettlement = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/settlements/settlements/${id}`,
          {
            credentials: "include",
          }
        );
        const data = await res.json();
        if (data.success && data.data?.settlement) {
          setSettlement(data.data.settlement);
        } else {
          toast.error("Settlement not found");
          setSettlement(null);
        }
      } catch (err) {
        toast.error("Failed to load settlement details");
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettlement();
  }, [id]);

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

      toast.success(
        confirm ? "Settlement confirmed successfully!" : "Settlement disputed"
      );

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
        <Typography variant="body2" className="ml-3 text-gray-600">
          Loading settlement details...
        </Typography>
      </Box>
    );

  if (error)
    return (
      <Box className="max-w-2xl mx-auto p-6">
        <Alert severity="error" className="rounded-lg">
          {error}
        </Alert>
      </Box>
    );

  if (!settlement)
    return (
      <Box className="max-w-2xl mx-auto p-6">
        <Alert severity="warning" className="rounded-lg">
          No settlement found
        </Alert>
      </Box>
    );

  const fullyConfirmed =
    settlement.confirmationStatus?.fullyConfirmed ||
    settlement.status === "confirmed";

  const canTakeAction =
    !fullyConfirmed &&
    !settlement.disputed &&
    ((settlement.userRole === "payer" &&
      !settlement.confirmationStatus?.confirmedByPayer) ||
      (settlement.userRole === "receiver" &&
        !settlement.confirmationStatus?.confirmedByReceiver));

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <Box className="mb-6">
        <Button
          startIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate("/settlements")}
          className="mb-4 text-gray-600 hover:text-gray-800"
        >
          Back to Settlements
        </Button>
        <Typography variant="h4" className="font-bold flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          Settlement Details
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Settlement Info */}
        <Grid item xs={12} md={8}>
          <Card className="shadow-lg">
            <CardHeader>
              <Typography variant="h6" className="font-semibold">
                Settlement Information
              </Typography>
            </CardHeader>
            <CardContent className="space-y-4">
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" className="text-gray-600">
                    Settlement ID
                  </Typography>
                  <Typography variant="body1" className="font-mono">
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
                  {settlement.description || "No description provided"}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" className="text-gray-600 mb-1">
                  Status
                </Typography>
                <Chip
                  label={settlement.status}
                  color={fullyConfirmed ? "success" : "warning"}
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
        </Grid>

        {/* Action Card */}
        <Grid item xs={12} md={4}>
          {fullyConfirmed ? (
            <Card className="shadow-lg border-green-200">
              <CardContent className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                <Typography
                  variant="h6"
                  className="font-semibold text-green-600"
                >
                  Settlement Confirmed
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  This settlement has been confirmed by both parties
                </Typography>
                <Divider />
                <Box className="space-y-2 text-left">
                  <Box className="flex justify-between">
                    <Typography variant="body2" className="text-gray-600">
                      Confirmed by Payer:
                    </Typography>
                    <Typography variant="body2" className="font-semibold">
                      {settlement.confirmationStatus?.confirmedByPayer
                        ? "Yes"
                        : "No"}
                    </Typography>
                  </Box>
                  <Box className="flex justify-between">
                    <Typography variant="body2" className="text-gray-600">
                      Confirmed by Receiver:
                    </Typography>
                    <Typography variant="body2" className="font-semibold">
                      {settlement.confirmationStatus?.confirmedByReceiver
                        ? "Yes"
                        : "No"}
                    </Typography>
                  </Box>
                  <Box className="flex justify-between">
                    <Typography variant="body2" className="text-gray-600">
                      Confirmed At:
                    </Typography>
                    <Typography variant="body2" className="font-semibold">
                      {settlement.dates?.confirmedAt
                        ? new Date(
                            settlement.dates.confirmedAt
                          ).toLocaleString()
                        : "-"}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ) : canTakeAction ? (
            <Card className="shadow-lg">
              <CardHeader>
                <Typography variant="h6" className="font-semibold">
                  Take Action
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Confirm or dispute this settlement
                </Typography>
              </CardHeader>
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
                  className={`py-3 ${
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
            <Card className="shadow-lg">
              <CardContent className="text-center space-y-4">
                <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto" />
                <Typography
                  variant="h6"
                  className="font-semibold text-gray-600"
                >
                  No Action Required
                </Typography>
                <Typography variant="body2" className="text-gray-500">
                  No further actions are available for this settlement at this
                  time.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </div>
  );
}

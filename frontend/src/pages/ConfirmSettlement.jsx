// src/pages/ConfirmSettlement.jsx
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Alert,
  CircularProgress,
} from "@mui/material";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function ConfirmSettlement({ settlementId }) {
  const [confirm, setConfirm] = useState("true");
  const [reason, setReason] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `http://localhost:3005/api/settlements/settlements/${settlementId}/confirm`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            confirm: confirm === "true",
            disputeReason: reason,
          }),
        }
      );
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error(err);
      setError("Failed to process settlement confirmation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-xl shadow-lg rounded-2xl">
        <CardHeader
          title={
            <Typography variant="h5" className="font-bold">
              Settlement Confirmation
            </Typography>
          }
          subheader="Review and confirm or dispute this settlement"
        />
        <CardContent className="space-y-6">
          {error && (
            <Alert severity="error" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </Alert>
          )}

          <div className="space-y-4">
            <Typography variant="subtitle1" className="font-medium">
              Your Decision
            </Typography>
            <RadioGroup
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            >
              <FormControlLabel
                value="true"
                control={<Radio color="success" />}
                label={
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Confirm Settlement
                  </span>
                }
              />
              <FormControlLabel
                value="false"
                control={<Radio color="error" />}
                label={
                  <span className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Dispute Settlement
                  </span>
                }
              />
            </RadioGroup>
          </div>

          {confirm === "false" && (
            <TextField
              fullWidth
              required
              label="Dispute Reason"
              placeholder="Please explain why you're disputing this settlement"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}

          {response && (
            <Alert
              severity={response.success ? "success" : "error"}
              className="flex items-center gap-2"
            >
              {response.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              {response.message ||
                (response.success
                  ? "Settlement processed successfully!"
                  : "Failed to process settlement")}
            </Alert>
          )}
        </CardContent>

        <CardActions className="p-4">
          <Button
            fullWidth
            variant="contained"
            color={confirm === "true" ? "success" : "error"}
            onClick={handleConfirm}
            disabled={loading || (confirm === "false" && !reason.trim())}
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : confirm === "true" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )
            }
          >
            {loading
              ? "Processing..."
              : confirm === "true"
              ? "Confirm Settlement"
              : "Dispute Settlement"}
          </Button>
        </CardActions>
      </Card>
    </div>
  );
}

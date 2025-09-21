// src/pages/SettlementDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.success && data.data?.settlement) {
          setSettlement(data.data.settlement);
        } else {
          setSettlement(null);
        }
      } catch (err) {
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

      if (data.message === "Settlement already confirmed by both parties") {
        alert("Settlement is already fully confirmed ✅");
      } else {
        alert(confirm ? "Settlement confirmed ✅" : "Settlement disputed ❌");
      }

      navigate("/settlements");
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <p>Loading settlement...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!settlement) return <p>No settlement found</p>;

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
    <div style={{ padding: 16, maxWidth: 600 }}>
      <h2>Settlement Details</h2>
      <p>
        <strong>ID:</strong> {settlement.id}
      </p>
      <p>
        <strong>Group:</strong> {settlement.group?.name || settlement.groupId}
      </p>
      <p>
        <strong>Payer:</strong>{" "}
        {settlement.payer?.name || settlement.payer?.email}
      </p>
      <p>
        <strong>Receiver:</strong>{" "}
        {settlement.receiver?.name || settlement.receiver?.email}
      </p>
      <p>
        <strong>Amount:</strong> ${settlement.amount}
      </p>
      <p>
        <strong>Status:</strong>{" "}
        <span style={{ color: fullyConfirmed ? "green" : "orange" }}>
          {settlement.status}
        </span>
      </p>
      <p>
        <strong>Method:</strong> {settlement.method}
      </p>
      <p>
        <strong>Description:</strong> {settlement.description || "—"}
      </p>

      {fullyConfirmed ? (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            border: "1px solid #28a745",
            borderRadius: 6,
            background: "#f6fffa",
          }}
        >
          <h3 style={{ color: "#28a745" }}>✅ Settlement Fully Confirmed</h3>
          <p>
            <strong>Confirmed By Payer:</strong>{" "}
            {settlement.confirmationStatus?.confirmedByPayer ? "Yes" : "No"}
          </p>
          <p>
            <strong>Confirmed By Receiver:</strong>{" "}
            {settlement.confirmationStatus?.confirmedByReceiver ? "Yes" : "No"}
          </p>
          <p>
            <strong>Confirmed At:</strong>{" "}
            {settlement.dates?.confirmedAt
              ? new Date(settlement.dates.confirmedAt).toLocaleString()
              : "-"}
          </p>
        </div>
      ) : canTakeAction ? (
        <div style={{ marginTop: 20 }}>
          <h3>Take Action</h3>
          <label>
            <input
              type="radio"
              checked={confirm === true}
              onChange={() => setConfirm(true)}
            />
            Confirm
          </label>
          <label style={{ marginLeft: 12 }}>
            <input
              type="radio"
              checked={confirm === false}
              onChange={() => setConfirm(false)}
            />
            Dispute
          </label>

          {!confirm && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="Reason for dispute"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: "100%", padding: 8 }}
              />
            </div>
          )}

          <button
            onClick={handleConfirmAction}
            disabled={actionLoading}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              background: confirm ? "#28a745" : "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {actionLoading
              ? "Processing..."
              : confirm
              ? "Confirm Settlement"
              : "Dispute Settlement"}
          </button>
        </div>
      ) : (
        <p style={{ marginTop: 20, color: "#6c757d" }}>
          No further actions available for this settlement.
        </p>
      )}
    </div>
  );
}

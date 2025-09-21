// src/pages/CreateSettlement.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE_URL = "http://localhost:3005/api";

export default function CreateSettlement() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract groupId and otherUserId from query params
  const queryParams = new URLSearchParams(location.search);
  const initialGroupId = queryParams.get("groupId") || "";
  const initialOtherUserId = queryParams.get("otherUserId") || "";

  const [form, setForm] = useState({
    groupId: initialGroupId,
    otherUserId: initialOtherUserId,
    amount: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // match backend: POST /api/debts/settle/:groupId/:toUserId
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

      navigate("/debt"); // redirect back after success
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 500 }}>
      <h2>Create Settlement</h2>
      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Group ID
          <input
            name="groupId"
            value={form.groupId}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Other User ID
          <input
            name="otherUserId"
            value={form.otherUserId}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Amount
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          Notes
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 16px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {loading ? "Creating..." : "Create Settlement"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </div>
  );
}

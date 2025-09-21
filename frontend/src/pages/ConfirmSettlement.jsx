import React, { useState } from "react";

const ConfirmSettlement = ({ settlementId }) => {
  const [confirm, setConfirm] = useState(true);
  const [reason, setReason] = useState("");
  const [response, setResponse] = useState(null);

  const handleConfirm = async () => {
    try {
      const res = await fetch(
        `http://localhost:3005/api/settlements/settlements/${settlementId}/confirm`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ confirm, disputeReason: reason }),
        }
      );
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Confirm/Dispute Settlement</h2>
      <label>
        <input
          type="radio"
          checked={confirm === true}
          onChange={() => setConfirm(true)}
        />
        Confirm
      </label>
      <label>
        <input
          type="radio"
          checked={confirm === false}
          onChange={() => setConfirm(false)}
        />
        Dispute
      </label>
      {!confirm && (
        <input
          type="text"
          placeholder="Dispute Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      <button onClick={handleConfirm}>
        {confirm ? "Confirm Settlement" : "Dispute Settlement"}
      </button>
      {response && <pre>{JSON.stringify(response, null, 2)}</pre>}
    </div>
  );
};

export default ConfirmSettlement;

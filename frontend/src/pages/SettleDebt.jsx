import React, { useState } from "react";

const SettleDebt = ({ groupId, toUserId }) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState("cash");
  const [response, setResponse] = useState(null);

  const handleSettle = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `http://localhost:3005/api/settlements/settle/${groupId}/${toUserId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            amount,
            description,
            settlementMethod: method,
          }),
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
      <h2>Settle Debt</h2>
      <form onSubmit={handleSettle}>
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">Cash</option>
          <option value="bank">Bank Transfer</option>
          <option value="wallet">Wallet</option>
        </select>
        <button type="submit">Settle</button>
      </form>
      {response && <pre>{JSON.stringify(response, null, 2)}</pre>}
    </div>
  );
};

export default SettleDebt;

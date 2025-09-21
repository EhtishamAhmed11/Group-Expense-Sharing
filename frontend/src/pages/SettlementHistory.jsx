import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SettlementHistory = () => {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:3005/api/settlements/settlements`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        }
      );
      const data = await res.json();
      if (data.success) {
        setSettlements(data.data.settlements || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case "confirmed":
        return {
          background: "#28a745",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
        };
      case "pending":
        return {
          background: "#ffc107",
          color: "black",
          padding: "4px 8px",
          borderRadius: "4px",
        };
      case "disputed":
        return {
          background: "#dc3545",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
        };
      default:
        return {};
    }
  };

  const renderTable = (list, title) => (
    <div style={{ marginBottom: "24px" }}>
      <h3>{title}</h3>
      {list.length === 0 ? (
        <p>No {title.toLowerCase()}</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "10px",
          }}
        >
          <thead>
            <tr style={{ background: "#f8f9fa" }}>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={tdStyle}>{s.displayText}</td>
                <td style={tdStyle}>${s.amount}</td>
                <td style={tdStyle}>
                  <span style={getStatusStyle(s.status)}>{s.status}</span>
                </td>
                <td style={tdStyle}>
                  {s.createdAt
                    ? new Date(s.createdAt).toLocaleDateString()
                    : "-"}
                </td>
                <td style={tdStyle}>
                  <Link
                    to={`/settlements/${s.id}`}
                    style={{
                      padding: "6px 12px",
                      background: "#007bff",
                      color: "white",
                      borderRadius: "4px",
                      textDecoration: "none",
                    }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  if (loading) return <p>Loading...</p>;

  const incoming = settlements.filter(
    (s) => s.direction === "incoming" && s.status === "pending"
  );
  const outgoing = settlements.filter(
    (s) => s.direction === "outgoing" && s.status === "pending"
  );
  const confirmed = settlements.filter((s) => s.status === "confirmed");

  return (
    <div style={{ padding: 20 }}>
      <h2>Settlement History</h2>
      {renderTable(incoming, "Incoming Settlements (Waiting for You)")}
      {renderTable(outgoing, "Outgoing Settlements (Waiting for Others)")}
      {renderTable(confirmed, "Confirmed Settlements")}
    </div>
  );
};

const thStyle = { textAlign: "left", padding: "8px" };
const tdStyle = { padding: "8px" };

export default SettlementHistory;

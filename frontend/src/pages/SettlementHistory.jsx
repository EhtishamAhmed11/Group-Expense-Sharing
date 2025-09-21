import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SettlementHistory = () => {
  const [settlements, setSettlements] = useState([]);
  const [filters, setFilters] = useState({ status: "", direction: "" });
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    const params = new URLSearchParams(filters).toString();
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:3005/api/settlements/settlements?${params}`,
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
  }, [filters]);

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

  return (
    <div style={{ padding: 20 }}>
      <h2>Settlement History</h2>

      {/* Filters */}
      <div style={{ marginBottom: "16px", display: "flex", gap: "12px" }}>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="disputed">Disputed</option>
        </select>
        <select
          value={filters.direction}
          onChange={(e) =>
            setFilters({ ...filters, direction: e.target.value })
          }
        >
          <option value="">All Directions</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
        </select>
        <button onClick={fetchHistory}>Refresh</button>
        <button onClick={() => setFilters({ status: "", direction: "" })}>
          Clear
        </button>
      </div>

      {/* Settlements Table */}
      {loading ? (
        <p>Loading...</p>
      ) : settlements.length === 0 ? (
        <p>No settlements found</p>
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
            {settlements.map((s) => (
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
};

// small styles for table
const thStyle = { textAlign: "left", padding: "8px" };
const tdStyle = { padding: "8px" };

export default SettlementHistory;

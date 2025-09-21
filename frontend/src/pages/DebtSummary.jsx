// DebtSummary.jsx
import React, { useEffect, useState } from "react";
import DebtChart from "./DebtChart";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE_URL = "http://localhost:3005/api";

const SummaryCard = ({ title, value, subtitle }) => (
  <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
    <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
    <div style={{ fontSize: 20, fontWeight: "700" }}>${value.toFixed(2)}</div>
    {subtitle && <div style={{ fontSize: 12, color: "#888" }}>{subtitle}</div>}
  </div>
);

export default function DebtSummary() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const openDetailed = (groupId) => {
    navigate(`/debt/${groupId}/detailed`);
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/debt/`, {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to load");
      setData(json.data);
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) return <div>Loading debt summary...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!data) return null;

  const {
    summary,
    groupBalances = [],
    urgentDebts = [],
    recentActivity = [],
  } = data;

  const totalOwedToUser = summary?.totalOwedToUser || 0;
  const totalUserOwes = summary?.totalUserOwes || 0;
  const netBalance = summary?.netBalance || 0;

  return (
    <div style={{ padding: 16 }}>
      <h2>Debt Summary</h2>

      {/* ✅ Back button if inside /debt/:groupId */}
      {location.pathname !== "/debt" && (
        <button
          onClick={() => navigate("/debt")}
          style={{
            marginBottom: 16,
            padding: "6px 12px",
            borderRadius: 6,
            background: "#f8f9fa",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          ← Back to Debt Summary
        </button>
      )}

      {/* Top Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <SummaryCard
          title="You're owed"
          value={totalOwedToUser}
          subtitle="Total others owe you"
        />
        <SummaryCard
          title="You owe"
          value={totalUserOwes}
          subtitle="Total you owe others"
        />
        <SummaryCard
          title="Net balance"
          value={netBalance}
          subtitle={
            netBalance >= 0 ? "You are net creditor" : "You are net debtor"
          }
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Left column */}
        <div>
          <h3>Group balances</h3>
          {groupBalances.length === 0 ? (
            <div>No group balances to show.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {groupBalances.map((g) => (
                <div
                  key={g.groupId}
                  style={{
                    border: "1px solid #eee",
                    padding: 12,
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "700" }}>{g.groupName}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {g.groupDescription || ""}
                    </div>
                    <div style={{ fontSize: 12, color: "#444", marginTop: 6 }}>
                      Unsettled: {g.unsettledExpensesCount} — Last expense:{" "}
                      {g.lastExpenseDate
                        ? g.lastExpenseDate.split("T")[0]
                        : "-"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: "700" }}>
                      ${g.netBalance.toFixed(2)}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: g.netBalance >= 0 ? "green" : "crimson",
                      }}
                    >
                      {g.netBalance >= 0 ? "You're owed" : "You owe"}
                    </div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                      <button
                        onClick={() => openDetailed(g.groupId)}
                        style={{ padding: "6px 10px", borderRadius: 6 }}
                      >
                        View
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/settlements/create?groupId=${g.groupId}`)
                        }
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: "#28a745",
                          color: "white",
                        }}
                      >
                        Settle Up
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ marginTop: 18 }}>Urgent debts</h3>
          {urgentDebts.length === 0 ? (
            <div>No urgent debts</div>
          ) : (
            urgentDebts.map((d) => (
              <div
                key={d.expenseId}
                style={{
                  border: "1px solid #f2dede",
                  background: "#fff7f7",
                  padding: 10,
                  marginBottom: 8,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontWeight: "700" }}>{d.expenseDescription}</div>
                <div style={{ fontSize: 12, color: "#333" }}>
                  {d.groupName} • {d.payerName} • {d.daysOld} days old
                </div>
                <div style={{ marginTop: 6 }}>
                  Amount you owe: ${d.userDebtAmount.toFixed(2)}
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => openDetailed(d.groupId)}
                    style={{ padding: "6px 10px", borderRadius: 6 }}
                  >
                    Open group
                  </button>
                  <button
                    onClick={() =>
                      navigate(
                        `/settlements/create?groupId=${d.groupId}&otherUserId=${d.payerId}`
                      )
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "#007bff",
                      color: "white",
                    }}
                  >
                    Settle with {d.payerName}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right column */}
        <div>
          <h3>Recent activity</h3>
          {recentActivity.length === 0 ? (
            <div>No recent settlements</div>
          ) : (
            recentActivity.map((a) => (
              <div
                key={a.settlementId}
                style={{
                  borderBottom: "1px solid #eee",
                  paddingBottom: 8,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: "700" }}>
                  {a.transactionType === "paid" ? "Paid" : "Received"} — $
                  {a.amount.toFixed(2)}
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {a.otherPartyName} • {a.groupName}
                </div>
                <div style={{ fontSize: 12, color: "#999" }}>
                  {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}

          <div style={{ marginTop: 18 }}>
            <h4>Net balances visualization</h4>
            <DebtChart
              netBalances={groupBalances.map((g) => ({
                key: g.groupId,
                label: g.groupName,
                amount: g.netBalance,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

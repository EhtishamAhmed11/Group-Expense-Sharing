// DebtChart.jsx
import React from "react";

/*
  Props:
    netBalances: array of { key, label, amount }
  This renders a simple horizontal bar for each entry.
*/

export default function DebtChart({ netBalances = [] }) {
  if (!Array.isArray(netBalances) || netBalances.length === 0) {
    return <div>No data for chart</div>;
  }

  // find max absolute for scaling
  const maxAbs = Math.max(...netBalances.map((n) => Math.abs(n.amount)), 1);

  return (
    <div style={{ padding: 8 }}>
      {netBalances.map((n) => {
        const widthPercent = Math.min(100, (Math.abs(n.amount) / maxAbs) * 100);
        const positive = n.amount >= 0;
        return (
          <div key={n.key} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{n.label}</div>
            <div
              style={{
                background: "#eee",
                height: 18,
                borderRadius: 6,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${widthPercent}%`,
                  background: positive
                    ? "rgba(0,128,0,0.8)"
                    : "rgba(220,20,60,0.9)",
                  color: "white",
                  textAlign: "right",
                  paddingRight: 6,
                  fontSize: 12,
                  lineHeight: "18px",
                  boxSizing: "border-box",
                }}
              >
                {n.amount >= 0
                  ? `+${n.amount.toFixed(2)}`
                  : `${n.amount.toFixed(2)}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

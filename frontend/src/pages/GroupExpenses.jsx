// src/pages/GroupExpenses.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GroupExpenses = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await fetch(`http://localhost:3005/api/group-expense/${groupId}/expenses`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          credentials: "include",
        });
        const data = await res.json();
        console.log(data);
        if (data.success) {
          setExpenses(data.data.expenses || []);
          setSummary(data.data.summary || null);
        }
      } catch (err) {
        console.error("Error fetching expenses:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [groupId]);

  if (loading) return <p>Loading expenses...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Group Expenses</h2>
      <Link to={`/groups/${groupId}/expenses/create`}>➕ Add New Expense</Link>

      {summary && (
        <div
          style={{
            margin: "20px 0",
            padding: "10px",
            border: "1px solid #ccc",
          }}
        >
          <h4>Summary</h4>
          <p>Total Expenses: {summary.totalExpenses}</p>
          <p>Total Amount: ${summary.totalAmount}</p>
          <p>Unsettled Amount: ${summary.totalUnsettled}</p>
          <p>Average Expense: ${summary.averageExpense}</p>
        </div>
      )}

      <h4>Expense List</h4>
      {expenses.length === 0 ? (
        <p>No expenses found for this group.</p>
      ) : (
        <ul>
          {expenses.map((exp) => (
            <li key={exp.id} style={{ marginBottom: "12px" }}>
              <strong>{exp.description}</strong> — ${exp.amount} <br />
              Payer: {exp.payer?.name || "Unknown"}{" "}
              {exp.userInfo?.isUserPayer && "(You)"}
              <br />
              {exp.userInfo?.userAmountOwed > 0 && (
                <span>
                  You owe ${exp.userInfo.userAmountOwed}{" "}
                  {exp.userInfo.userIsSettled ? "(Settled)" : "(Pending)"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GroupExpenses;

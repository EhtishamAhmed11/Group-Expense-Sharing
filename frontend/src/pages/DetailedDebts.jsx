import React, { useEffect, useState } from "react";
import DebtChart from "./DebtChart";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = "http://localhost:3005/api";

export default function DetailedDebts() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const handleBack = () => {
    navigate("/debt"); // go back in browser history
  };
  // Search & filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [minAmount, setMinAmount] = useState(""); // string so input can stay empty
  const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'user_owes' | 'user_is_owed'

  // debounce searchTerm -> debouncedSearch (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const url = groupId ? `${API_BASE_URL}/debt/${groupId}/detailed` : null;

  const fetchDetailed = async () => {
    if (!url) {
      setError("No group selected. Open a group to view detailed debts.");
      setData(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      const json = await res.json();
      console.log("DetailedDebts response:", json);

      if (!json.success) throw new Error(json.message || "Failed to load");
      setData(json.data);
    } catch (err) {
      setError(err.message || "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // reset filters on group change
    setSearchTerm("");
    setDebouncedSearch("");
    setOverdueOnly(false);
    setMinAmount("");
    setRoleFilter("all");

    fetchDetailed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  if (loading) return <div>Loading detailed debts...</div>;

  if (error)
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "red", marginBottom: 8 }}>{error}</div>
        <div>
          <button onClick={handleBack} style={{ marginRight: 8 }}>
            Back
          </button>
          <button onClick={() => fetchDetailed()}>Retry</button>
        </div>
      </div>
    );

  if (!data)
    return (
      <div style={{ padding: 16 }}>
        <div>No data to show.</div>
        <div style={{ marginTop: 8 }}>
          <button onClick={handleBack} style={{ marginRight: 8 }}>
            Back
          </button>
          <button onClick={() => fetchDetailed()}>Refresh</button>
        </div>
      </div>
    );

  // Raw arrays
  const rawNetBalances = Object.values(data.netBalances || {});
  const rawPeopleOweUser = Object.values(data.peopleWhoOweUser || {});
  const rawPeopleUserOwes = Object.values(data.peopleUserOwes || {});

  // helper: safe string include
  const matches = (text, q) => {
    if (!text || !q) return false;
    return String(text).toLowerCase().includes(q);
  };

  // Build overdue map
  const overdueMap = {};
  const addOverdueInfo = (entry) => {
    if (!entry?.person || !entry?.group || !Array.isArray(entry.expenses))
      return;
    const key = `${entry.person.id}_${entry.group.id}`;
    overdueMap[key] = entry.expenses.some((e) => !!e.isOverdue);
  };
  rawPeopleOweUser.forEach(addOverdueInfo);
  rawPeopleUserOwes.forEach(addOverdueInfo);

  // compute totals
  const totalAmountForEntry = (entry) => {
    if (!entry) return 0;
    if (typeof entry.totalAmount === "number") return entry.totalAmount;
    if (!Array.isArray(entry.expenses)) return 0;
    return entry.expenses.reduce(
      (s, e) => s + (parseFloat(e.debtAmount) || 0),
      0
    );
  };

  // parse numeric minAmount
  const minAmountNum = parseFloat(minAmount);
  const hasMinAmount = !Number.isNaN(minAmountNum) && minAmount !== "";

  const q = debouncedSearch;

  // filter netBalances
  const filterNetBalances = (arr) =>
    arr.filter((b) => {
      if (roleFilter === "user_owes" && b.netPosition !== "user_owes")
        return false;
      if (roleFilter === "user_is_owed" && b.netPosition !== "user_is_owed")
        return false;

      if (hasMinAmount && Math.abs(b.netAmount || 0) < minAmountNum)
        return false;

      if (overdueOnly) {
        const key = `${b.person.id}_${b.group.id}`;
        if (!overdueMap[key]) return false;
      }

      if (!q) return true;
      if (matches(b.person?.name, q) || matches(b.group?.name, q)) return true;

      return false;
    });

  // filter people lists
  const filterPeopleList = (arr) =>
    arr.filter((entry) => {
      let netPos = "settled";
      const theyOwe = parseFloat(entry.theyOwe || 0);
      const userOwes = parseFloat(entry.userOwes || 0);
      const netAmount = theyOwe - userOwes;

      if (netAmount > 0) netPos = "user_is_owed";
      else if (netAmount < 0) netPos = "user_owes";

      if (roleFilter === "user_owes" && netPos !== "user_owes") return false;
      if (roleFilter === "user_is_owed" && netPos !== "user_is_owed")
        return false;

      if (hasMinAmount && Math.abs(totalAmountForEntry(entry)) < minAmountNum)
        return false;

      const key = `${entry.person.id}_${entry.group.id}`;
      if (overdueOnly && !overdueMap[key]) return false;

      if (!q) return true;
      if (matches(entry.person?.name, q) || matches(entry.group?.name, q))
        return true;
      if (Array.isArray(entry.expenses)) {
        return entry.expenses.some((e) => matches(e.description, q));
      }

      return false;
    });

  const netBalancesArray = filterNetBalances(rawNetBalances);
  const peopleOweUser = filterPeopleList(rawPeopleOweUser);
  const peopleUserOwes = filterPeopleList(rawPeopleUserOwes);

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>
          Detailed debts {groupId ? `— group ${groupId}` : ""}
        </h2>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            aria-label="Search debts"
            placeholder="Search by person, group or expense..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              minWidth: 260,
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{ padding: "8px 10px", borderRadius: 6 }}
            >
              Clear
            </button>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            Overdue only
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Min amount
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="e.g. 10"
              style={{
                width: 90,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
          </label>
          <label>
            Role:
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ marginLeft: 6, padding: "6px 8px", borderRadius: 6 }}
            >
              <option value="all">All</option>
              <option value="user_owes">You owe</option>
              <option value="user_is_owed">You're owed</option>
            </select>
          </label>
          <button
            onClick={handleBack}
            style={{ padding: "8px 10px", borderRadius: 6 }}
          >
            Back
          </button>
          <button
            onClick={() => fetchDetailed()}
            style={{ padding: "8px 10px", borderRadius: 6 }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Layout: list + sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 350px",
          gap: 16,
          marginTop: 12,
        }}
      >
        {/* LEFT SIDE */}
        <div>
          <h3>Net balances (per person / group)</h3>
          {netBalancesArray.length === 0 ? (
            <div style={{ color: "#666" }}>No balances found.</div>
          ) : (
            netBalancesArray.map((b, idx) => (
              <div
                key={idx}
                style={{
                  padding: 10,
                  border: "1px solid #eee",
                  marginBottom: 8,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {b.person.name} — {b.group.name}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Net:</strong> ${b.netAmount.toFixed(2)} (
                  {b.netPosition})
                </div>
                <div style={{ marginTop: 6 }}>
                  <div>
                    <strong>You owe:</strong> ${b.userOwes.toFixed(2)}
                  </div>
                  <div>
                    <strong>They owe:</strong> ${b.theyOwe.toFixed(2)}
                  </div>
                </div>
                {overdueMap[`${b.person.id}_${b.group.id}`] && (
                  <div style={{ marginTop: 6, color: "crimson" }}>
                    Has overdue expenses
                  </div>
                )}
              </div>
            ))
          )}

          {/* People who owe user */}
          <h3 style={{ marginTop: 12 }}>People who owe you</h3>
          {peopleOweUser.length === 0 ? (
            <div style={{ color: "#666" }}>None</div>
          ) : (
            peopleOweUser.map((p, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #f0fff0",
                  padding: 8,
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {p.person.name} — {p.group.name}
                </div>
                <div>
                  Total owed: ${totalAmountForEntry(p).toFixed(2)} • Expenses:{" "}
                  {p.expenseCount}
                </div>
                <div style={{ marginTop: 6 }}>
                  {p.expenses.map((e) => (
                    <div
                      key={e.expenseId}
                      style={{
                        borderTop: "1px dashed #eee",
                        paddingTop: 6,
                        marginTop: 6,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {e.description} — ${e.debtAmount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Expense date:{" "}
                        {e.expenseDate ? e.expenseDate.split("T")[0] : "-"} —{" "}
                        {e.isOverdue ? "Overdue" : "OK"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* People user owes */}
          <h3 style={{ marginTop: 12 }}>People you owe</h3>
          {peopleUserOwes.length === 0 ? (
            <div style={{ color: "#666" }}>None</div>
          ) : (
            peopleUserOwes.map((p, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #fff0f0",
                  padding: 8,
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {p.person.name} — {p.group.name}
                </div>
                <div>
                  Total you owe: ${totalAmountForEntry(p).toFixed(2)} •
                  Expenses: {p.expenseCount}
                </div>
                <div style={{ marginTop: 6 }}>
                  {p.expenses.map((e) => (
                    <div
                      key={e.expenseId}
                      style={{
                        borderTop: "1px dashed #eee",
                        paddingTop: 6,
                        marginTop: 6,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {e.description} — ${e.debtAmount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        Expense date:{" "}
                        {e.expenseDate ? e.expenseDate.split("T")[0] : "-"} —{" "}
                        {e.isOverdue ? "Overdue" : "OK"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT SIDE (Sidebar) */}
        <aside>
          <h4>Net balances chart</h4>
          <DebtChart
            netBalances={netBalancesArray.map((b) => ({
              key: `${b.person.id}_${b.group.id}`,
              label: `${b.person.name} (${b.group.name})`,
              amount: b.netAmount,
            }))}
          />

          <div style={{ marginTop: 16 }}>
            <h4>Settlement suggestions</h4>
            {data.settlementSuggestion?.length ? (
              <ul>
                {data.settlementSuggestion.map((s, i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <div>No suggestions</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

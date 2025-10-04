"use client";

import { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_URL = "http://localhost:3005/api/settlements/settlements";

const SettlementsContext = createContext();

export const SettlementsProvider = ({ children }) => {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setSettlements(data.data.settlements || []);
      else toast.error("Failed to fetch settlement history");
    } catch (err) {
      toast.error("Error fetching settlement history");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettlement = (id, updatedFields) => {
    setSettlements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updatedFields } : s))
    );
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  return (
    <SettlementsContext.Provider
      value={{
        settlements,
        setSettlements,
        loading,
        fetchSettlements,
        updateSettlement,
      }}
    >
      {children}
    </SettlementsContext.Provider>
  );
};

export const useSettlements = () => useContext(SettlementsContext);

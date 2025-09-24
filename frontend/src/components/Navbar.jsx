"use client";

import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  Handshake,
  User,
  LogOut,
} from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Expenses", path: "/expenses", icon: Receipt },
    { label: "Groups", path: "/groups", icon: Users },
    { label: "Debt", path: "/debt", icon: CreditCard },
    { label: "Settlements", path: "/settlements", icon: Handshake },
    { label: "Profile", path: "/profile", icon: User },
  ];

  return (
    <nav className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <h1
          className="text-lg font-semibold text-gray-900 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          Splitly
        </h1>

        {/* Menu */}
        <div className="hidden md:flex items-center space-x-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center text-sm font-medium transition-colors ${
                  isActive
                    ? "text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* User */}
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-700 font-medium">
            {user?.firstName} {user?.lastName}
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-500 flex items-center"
          >
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

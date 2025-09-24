"use client";

import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
} from "@mui/material";
import {
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  Handshake,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = async () => {
    await logout();
    setAnchorEl(null);
  };

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const menuItems = [
    { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
    { label: "Expenses", path: "/expenses", icon: Receipt },
    { label: "Groups", path: "/groups", icon: Users },
    { label: "Debt", path: "/debt", icon: CreditCard },
    { label: "Settlements", path: "/settlements", icon: Handshake },
    { label: "Profile", path: "/profile", icon: User },
  ];

  return (
    <AppBar
      component={motion.div}
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      position="sticky"
      elevation={1}
      sx={{
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb",
        color: "text.primary",
        backdropFilter: "saturate(180%) blur(6px)",
      }}
    >
      <Toolbar className="px-6 flex justify-between">
        {/* Logo */}
        <Typography
          variant="h6"
          className="font-bold text-gray-900 cursor-pointer"
          sx={{ fontWeight: 700 }}
          onClick={() => navigate("/dashboard")}
        >
          ExpenseTracker
        </Typography>

        {/* Navigation Links */}
        <Box className="hidden md:flex items-center space-x-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <motion.div
                key={item.path}
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                style={{ display: "inline-block" }}
              >
                <Button
                  onClick={() => navigate(item.path)}
                  startIcon={<Icon className="w-4 h-4" />}
                  sx={{
                    textTransform: "none",
                    minWidth: 100,
                    px: 3,
                    py: 1,
                    borderRadius: "12px",
                    fontWeight: isActive ? 700 : 500,
                    backgroundColor: isActive
                      ? "rgba(59, 130, 246, 0.10)"
                      : "transparent",
                    color: isActive ? "#2563eb" : "#374151",
                    "&:hover": {
                      backgroundColor: isActive
                        ? "rgba(59, 130, 246, 0.15)"
                        : "rgba(0,0,0,0.04)",
                    },
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  {item.label}
                </Button>
              </motion.div>
            );
          })}
        </Box>

        {/* User Menu */}
        <Box className="flex items-center space-x-2">
          <Chip
            label={`${user?.firstName} ${user?.lastName}`}
            variant="outlined"
            size="small"
            sx={{
              borderColor: "#d1d5db",
              color: "#4b5563",
              fontWeight: 500,
              cursor: "default",
            }}
          />

          <IconButton
            onClick={handleMenuOpen}
            size="small"
            sx={{
              ml: 1,
              p: 0,
              borderRadius: "50%",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.05)" },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "rgba(59,130,246,0.1)",
                color: "#2563eb",
                fontSize: "0.875rem",
                fontWeight: 600,
                boxShadow: "0 0 4px rgba(0,0,0,0.1)",
              }}
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Avatar>
            <ChevronDown className="w-4 h-4 ml-1 text-gray-500" />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              sx: {
                borderRadius: 2,
                mt: 1,
                minWidth: 180,
                boxShadow:
                  "0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
              },
            }}
          >
            <MenuItem
              onClick={() => {
                navigate("/profile");
                handleMenuClose();
              }}
              sx={{
                px: 3,
                py: 1,
                "&:hover": { backgroundColor: "rgba(59,130,246,0.1)" },
              }}
            >
              <User className="w-4 h-4 mr-3 text-gray-500" />
              Profile
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={handleLogout}
              sx={{
                px: 3,
                py: 1,
                color: "#ef4444",
                "&:hover": { backgroundColor: "rgba(239,68,68,0.1)" },
              }}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

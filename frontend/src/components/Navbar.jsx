import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const menuItems = [
    { label: "Overview", path: "/dashboard" },
    { label: "Expenses", path: "/expenses" },
    { label: "Groups", path: "/groups" },
    { label: "Debt", path: "/debt" },
    { label: "Profile", path: "/profile" },
  ];

  return (
    <nav
      style={{
        padding: "20px",
        borderBottom: "1px solid #ddd",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                marginRight: "10px",
                padding: "8px 16px",
                backgroundColor:
                  location.pathname === item.path ? "#007bff" : "#f8f9fa",
                color: location.pathname === item.path ? "white" : "black",
                border: "1px solid #ddd",
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: "15px" }}>
            Welcome, {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  TextField,
  Divider,
  Select,
  MenuItem,
} from "@mui/material";

const API_BASE_URL = "http://localhost:3005/api";

const GroupManagement = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState("list"); // 'list', 'create', 'details', 'join'
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/groups/get-user-groups`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) setGroups(data.data.groups || []);
      else setError(data.message || "Failed to fetch groups");
    } catch (err) {
      console.error("Fetch groups error:", err);
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchUserGroups();
  }, [user]);
  const handleViewGroup = (group) => {
    setSelectedGroup(group);
    setCurrentView("details");
  };
  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const renderNavigation = () => (
    <Box display="flex" gap={2} mb={3}>
      {["list", "create", "join"].map((view) => (
        <Button
          key={view}
          variant={currentView === view ? "contained" : "outlined"}
          color={currentView === view ? "primary" : "inherit"}
          onClick={() => {
            setCurrentView(view);
            clearMessages();
          }}
        >
          {view === "list"
            ? "My Groups"
            : view === "create"
            ? "Create Group"
            : "Join Group"}
        </Button>
      ))}
    </Box>
  );

  const renderMessages = () => (
    <>
      {error && (
        <Box
          bgcolor="#f8d7da"
          color="#721c24"
          p={2}
          mb={2}
          borderRadius={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <span>{error}</span>
          <Button size="small" onClick={() => setError("")}>
            ×
          </Button>
        </Box>
      )}
      {success && (
        <Box
          bgcolor="#d4edda"
          color="#155724"
          p={2}
          mb={2}
          borderRadius={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <span>{success}</span>
          <Button size="small" onClick={() => setSuccess("")}>
            ×
          </Button>
        </Box>
      )}
    </>
  );

  const renderGroupsList = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5">My Groups</Typography>
        <Button
          variant="contained"
          color="success"
          onClick={fetchUserGroups}
          disabled={loading}
        >
          {loading ? <CircularProgress size={18} color="inherit" /> : "Refresh"}
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading groups...</Typography>
      ) : groups.length === 0 ? (
        <Box textAlign="center" p={5}>
          <Typography>You’re not a member of any groups yet.</Typography>
          <Typography>
            Create a new group or join one to get started!
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {groups.map((group) => (
            <Card
              key={group.id}
              variant="outlined"
              sx={{ borderRadius: 2, boxShadow: 1 }}
            >
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="h6" mr={1}>
                        {group.name}
                      </Typography>
                      <Box
                        component="span"
                        sx={{
                          bgcolor:
                            group.userRole === "admin"
                              ? "error.main"
                              : "success.main",
                          color: "white",
                          px: 1,
                          py: "2px",
                          borderRadius: 1,
                          fontSize: 12,
                        }}
                      >
                        {group.userRole}
                      </Box>
                      {group.stats.hasActivity && (
                        <Box
                          component="span"
                          sx={{
                            bgcolor: "primary.main",
                            color: "white",
                            px: 1,
                            py: "2px",
                            borderRadius: 1,
                            fontSize: 12,
                            ml: 1,
                          }}
                        >
                          Active
                        </Box>
                      )}
                    </Box>

                    {group.description && (
                      <Typography color="text.secondary">
                        {group.description}
                      </Typography>
                    )}

                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Members: {group.memberCount} • Total Expenses:{" "}
                      {group.stats.totalExpenses} • Amount: $
                      {group.stats.totalAmount.toFixed(2)}
                    </Typography>
                    {group.userBalance !== 0 && (
                      <Typography
                        mt={0.5}
                        fontWeight="bold"
                        color={
                          group.userBalance > 0 ? "success.main" : "error.main"
                        }
                      >
                        {group.userBalance > 0
                          ? `You are owed $${group.userBalance.toFixed(2)}`
                          : `You owe $${Math.abs(group.userBalance).toFixed(
                              2
                            )}`}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Joined: {new Date(group.joinedAt).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Box display="flex" flexDirection="column" gap={1}>
                    <Link
                      to={`/groups/${group.id}/expenses`}
                      style={{ textDecoration: "none" }}
                    >
                      <Button variant="contained" color="primary">
                        View Expenses
                      </Button>
                    </Link>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );

  if (!user) return <Typography>Please log in to manage groups</Typography>;

  return (
    <Box maxWidth="1200px" mx="auto" p={3}>
      <Typography variant="h4" mb={3}>
        Group Management
      </Typography>
      {renderNavigation()}
      {renderMessages()}

      {currentView === "list" && renderGroupsList()}
      {currentView === "create" && (
        <GroupForm
          onCancel={() => setCurrentView("list")}
          onSuccess={(g) => {
            setSuccess("Group created successfully!");
            setCurrentView("list");
            fetchUserGroups();
          }}
          setError={setError}
        />
      )}
      {currentView === "join" && (
        <JoinGroup
          onCancel={() => setCurrentView("list")}
          onSuccess={(g) => {
            setSuccess(`Joined "${g.name}"!`);
            setCurrentView("list");
            fetchUserGroups();
          }}
          setError={setError}
        />
      )}
      {currentView === "details" && selectedGroup && (
        <GroupDetails
          group={selectedGroup}
          onBack={() => setCurrentView("list")}
          onGroupUpdate={() => {
            setSuccess("Group updated successfully!");
            fetchUserGroups();
          }}
          onLeaveGroup={() => {
            setSuccess("Left group successfully");
            setCurrentView("list");
            fetchUserGroups();
          }}
          setError={setError}
          setSuccess={setSuccess}
        />
      )}
    </Box>
  );
};

//////////////////////////////////////////////////////////////////
// GroupForm Component
//////////////////////////////////////////////////////////////////
const GroupForm = ({ onCancel, onSuccess, setError }) => {
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError("Group name is required");
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/groups/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      data.success
        ? onSuccess(data.data.group)
        : setError(data.message || "Failed to create group");
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: 3, borderRadius: 2, boxShadow: 2, maxWidth: 500 }}>
      <Typography variant="h5" mb={2}>
        Create New Group
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Group Name *"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          fullWidth
          disabled={loading}
          margin="normal"
          required
        />
        <TextField
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          fullWidth
          disabled={loading}
          margin="normal"
          multiline
          rows={3}
        />
        <Box display="flex" gap={2} mt={2}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={18} /> : "Create Group"}
          </Button>
          <Button
            type="button"
            variant="outlined"
            color="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </Box>
      </form>
    </Card>
  );
};

//////////////////////////////////////////////////////////////////
// JoinGroup Component
//////////////////////////////////////////////////////////////////
const JoinGroup = ({ onCancel, onSuccess, setError }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return setError("Invite code is required");
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/groups/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });
      const data = await response.json();
      data.success
        ? onSuccess(data.data.group)
        : setError(data.message || "Failed to join group");
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: 3, borderRadius: 2, boxShadow: 2, maxWidth: 400 }}>
      <Typography variant="h5" mb={2}>
        Join Group
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Invite Code *"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          fullWidth
          disabled={loading}
          margin="normal"
          inputProps={{ style: { textTransform: "uppercase" } }}
          required
        />
        <Box display="flex" gap={2} mt={2}>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={loading || !inviteCode.trim()}
          >
            {loading ? <CircularProgress size={18} /> : "Join Group"}
          </Button>
          <Button
            type="button"
            variant="outlined"
            color="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </Box>
      </form>
    </Card>
  );
};

export default GroupManagement;

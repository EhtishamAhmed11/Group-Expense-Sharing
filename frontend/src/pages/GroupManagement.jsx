import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext"; 

const GroupManagement = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState("list"); // 'list', 'create', 'details', 'join'
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const API_BASE_URL = "http://localhost:3005/api";

  // Fetch user's groups
  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/groups/get-user-groups`, {
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setGroups(data.data.groups || []);
      } else {
        setError(data.message || "Failed to fetch groups");
      }
    } catch (error) {
      setError("Network error occurred");
      console.error("Fetch groups error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load groups on mount
  useEffect(() => {
    if (user) {
      fetchUserGroups();
    }
  }, [user]);

  // Handle view group details
  const handleViewGroup = (group) => {
    setSelectedGroup(group);
    setCurrentView("details");
  };

  // Clear messages
  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  // Render navigation
  const renderNavigation = () => (
    <div
      style={{
        marginBottom: "20px",
        display: "flex",
        gap: "10px",
        alignItems: "center",
      }}
    >
      <button
        onClick={() => {
          setCurrentView("list");
          clearMessages();
        }}
        style={{
          padding: "8px 16px",
          backgroundColor: currentView === "list" ? "#007bff" : "#f8f9fa",
          color: currentView === "list" ? "white" : "black",
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
      >
        My Groups
      </button>
      <button
        onClick={() => {
          setCurrentView("create");
          clearMessages();
        }}
        style={{
          padding: "8px 16px",
          backgroundColor: currentView === "create" ? "#007bff" : "#f8f9fa",
          color: currentView === "create" ? "white" : "black",
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
      >
        Create Group
      </button>
      <button
        onClick={() => {
          setCurrentView("join");
          clearMessages();
        }}
        style={{
          padding: "8px 16px",
          backgroundColor: currentView === "join" ? "#007bff" : "#f8f9fa",
          color: currentView === "join" ? "white" : "black",
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
      >
        Join Group
      </button>
    </div>
  );

  // Render error and success messages
  const renderMessages = () => (
    <>
      {error && (
        <div
          style={{
            color: "red",
            backgroundColor: "#f8d7da",
            padding: "10px",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={{
              background: "none",
              border: "none",
              color: "red",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div
          style={{
            color: "#155724",
            backgroundColor: "#d4edda",
            padding: "10px",
            border: "1px solid #c3e6cb",
            borderRadius: "4px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{success}</span>
          <button
            onClick={() => setSuccess("")}
            style={{
              background: "none",
              border: "none",
              color: "#155724",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );

  // Render groups list
  const renderGroupsList = () => (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>My Groups</h2>
        <button
          onClick={fetchUserGroups}
          disabled={loading}
          style={{
            padding: "8px 16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div>Loading groups...</div>
      ) : (
        <div>
          {groups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <p>You're not a member of any groups yet.</p>
              <p>Create a new group or join an existing one to get started!</p>
            </div>
          ) : (
            <div>
              {groups.map((group) => (
                <div
                  key={group.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "20px",
                    marginBottom: "15px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          marginBottom: "10px",
                        }}
                      >
                        <h4 style={{ margin: 0, marginRight: "15px" }}>
                          {group.name}
                        </h4>
                        <span
                          style={{
                            backgroundColor:
                              group.userRole === "admin"
                                ? "#dc3545"
                                : "#28a745",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        >
                          {group.userRole}
                        </span>
                        {group.stats.hasActivity && (
                          <span
                            style={{
                              backgroundColor: "#007bff",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              marginLeft: "8px",
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>

                      {group.description && (
                        <p style={{ margin: "5px 0", color: "#666" }}>
                          {group.description}
                        </p>
                      )}

                      <div style={{ fontSize: "14px", color: "#666" }}>
                        <p style={{ margin: "5px 0" }}>
                          Members: {group.memberCount} • Total Expenses:{" "}
                          {group.stats.totalExpenses} • Amount: $
                          {group.stats.totalAmount.toFixed(2)}
                        </p>

                        {group.userBalance !== 0 && (
                          <p
                            style={{
                              margin: "5px 0",
                              color:
                                group.userBalance > 0 ? "#28a745" : "#dc3545",
                              fontWeight: "bold",
                            }}
                          >
                            {group.userBalance > 0
                              ? `You are owed $${group.userBalance.toFixed(2)}`
                              : `You owe $${Math.abs(group.userBalance).toFixed(
                                  2
                                )}`}
                          </p>
                        )}

                        <p style={{ margin: "5px 0" }}>
                          Joined:{" "}
                          {new Date(group.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={() => handleViewGroup(group)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!user) {
    return <div>Please log in to manage groups</div>;
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      <h1>Group Management</h1>

      {renderNavigation()}
      {renderMessages()}

      {currentView === "list" && renderGroupsList()}
      {currentView === "create" && (
        <GroupForm
          onCancel={() => setCurrentView("list")}
          onSuccess={(group) => {
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
          onSuccess={(group) => {
            setSuccess(`Successfully joined "${group.name}"!`);
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
    </div>
  );
};

//////////////////////////////////////////////////////////////////
// GroupForm Component
//////////////////////////////////////////////////////////////////
const GroupForm = ({ onCancel, onSuccess, setError }) => {
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = "http://localhost:3005/api";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Group name is required");
      return;
    }

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
      if (data.success) {
        onSuccess(data.data.group);
      } else {
        setError(data.message || "Failed to create group");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Create New Group</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: "500px" }}>
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Group Name *:
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="Enter group name"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Description:
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="Enter group description (optional)"
            rows={3}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
            }}
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

//////////////////////////////////////////////////////////////////
// JoinGroup Component
//////////////////////////////////////////////////////////////////
const JoinGroup = ({ onCancel, onSuccess, setError }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = "http://localhost:3005/api";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("Invite code is required");
      return;
    }

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
      if (data.success) {
        onSuccess(data.data.group);
      } else {
        setError(data.message || "Failed to join group");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Join Group</h2>
      <form onSubmit={handleSubmit} style={{ maxWidth: "400px" }}>
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Invite Code *:
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            disabled={loading}
            placeholder="Enter invite code"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              textTransform: "uppercase",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="submit"
            disabled={loading || !inviteCode.trim()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
            }}
          >
            {loading ? "Joining..." : "Join Group"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

//////////////////////////////////////////////////////////////////
// GroupDetails Component
//////////////////////////////////////////////////////////////////
const GroupDetails = ({
  group,
  onBack,
  onGroupUpdate,
  onLeaveGroup,
  setError,
  setSuccess,
}) => {
  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");

  const API_BASE_URL = "http://localhost:3005/api";

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/groups/${group.id}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setGroupDetails(data.data.group);
      } else {
        setError(data.message || "Failed to fetch group details");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [group.id]);

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/groups/${group.id}/leave`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        onLeaveGroup();
      } else {
        setError(data.message || "Failed to leave group");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferUserId) {
      setError("Please select a member to transfer ownership");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/groups/${group.id}/transfer-ownership`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ newOwnerId: transferUserId }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setSuccess("Ownership transferred successfully!");
        setTransferUserId("");
        fetchGroupDetails();
        onGroupUpdate();
      } else {
        setError(data.message || "Failed to transfer ownership");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !groupDetails) return <div>Loading group details...</div>;
  if (!groupDetails) return <div>Failed to load group details</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2>{groupDetails.name}</h2>
        <button
          onClick={onBack}
          style={{
            padding: "8px 16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
          }}
        >
          Back to Groups
        </button>
      </div>

      {showEditForm && groupDetails.userContext.isAdmin ? (
        <GroupEditForm
          group={groupDetails}
          onCancel={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            fetchGroupDetails();
            onGroupUpdate();
          }}
          setError={setError}
        />
      ) : (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3>Group Information</h3>
          {groupDetails.description && <p>{groupDetails.description}</p>}
          <p>
            Created by: {groupDetails.createdBy.firstName}{" "}
            {groupDetails.createdBy.lastName}
          </p>
          <p>
            Created: {new Date(groupDetails.createdAt).toLocaleDateString()}
          </p>
          <p>Members: {groupDetails.memberCount}</p>
          <p>
            Your Role: <strong>{groupDetails.userContext.role}</strong>
          </p>

          {groupDetails.userContext.isAdmin && groupDetails.inviteCode && (
            <div
              style={{
                backgroundColor: "#f8f9fa",
                padding: "10px",
                marginTop: "15px",
              }}
            >
              <strong>Invite Code:</strong> {groupDetails.inviteCode}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            {groupDetails.userContext.isAdmin && (
              <button
                onClick={() => setShowEditForm(true)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#ffc107",
                  border: "none",
                }}
              >
                Edit Group
              </button>
            )}
            {groupDetails.userContext.isCreator && (
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <select
                  value={transferUserId}
                  onChange={(e) => setTransferUserId(e.target.value)}
                >
                  <option value="">Select member</option>
                  {groupDetails.members
                    .filter((m) => m.id !== groupDetails.createdBy.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleTransferOwnership}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#17a2b8",
                    border: "none",
                    color: "white",
                  }}
                >
                  Transfer Ownership
                </button>
              </div>
            )}
            <button
              onClick={handleLeaveGroup}
              style={{
                padding: "6px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
              }}
            >
              Leave Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

//////////////////////////////////////////////////////////////////
// GroupEditForm Component
//////////////////////////////////////////////////////////////////
const GroupEditForm = ({ group, onCancel, onSuccess, setError }) => {
  const [formData, setFormData] = useState({
    name: group.name || "",
    description: group.description || "",
  });
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = "http://localhost:3005/api";

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) onSuccess(data.data.group);
      else setError(data.message || "Failed to update group");
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "500px" }}>
      <h3>Edit Group</h3>
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        disabled={loading}
      />
      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        disabled={loading}
      />
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="submit"
          disabled={loading}
          style={{ backgroundColor: "#007bff", color: "white" }}
        >
          {loading ? "Updating..." : "Update Group"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{ backgroundColor: "#6c757d", color: "white" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default GroupManagement;

import { pool } from "../connections/db.js";
import { cacheService } from "../utils/cache.js";

const validateGroupMember = async (req, res, next) => {
  let client;
  try {
    const groupId = req.params.id || req.body.group_id || req.body.groupId;
    const userId = req.userId;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
        timestamp: new Date().toISOString(),
      });
    }
    const cacheKey = `membership"${userId}:${groupId}`;
    const cachedMembership = await cacheService.client.get(cacheKey);
    if (cachedMembership) {
      const membership = JSON.parse(cachedMembership);
      req.groupMembership = membership;
      req.groupId = groupId;
      return next();
    }
    client = await pool.connect();

    const membershipQuery = `SELECT 
        gm.role,
        gm.joined_at,
        gm.is_active as membership_active,
        g.name as group_name,
        g.is_active as group_active
      FROM group_members gm
      JOIN groups g ON gm.group_id = g.id
      WHERE gm.group_id = $1 
        AND gm.user_id = $2 
        AND gm.is_active = true 
        AND g.is_active = true`;

    const result = await client.query(membershipQuery, [groupId, userId]);

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You are not a member of this group or group does not exist.",
        timestamp: new Date().toISOString(),
      });
    }
    const membership = {
      role: result.rows[0].role,
      joinedAt: result.rows[0].joined_at,
      isActive: result.rows[0].membership_active,
      groupName: result.rows[0].group_name,
      isAdmin: result.rows[0].role === "admin",
    };

    try {
      await cacheService.client.setEx(
        cacheKey,
        30 * 60,
        JSON.stringify(membership)
      );
    } catch (cacheError) {
      console.log(`Failed to cacheMemberShip:${cacheError.message}`);
    }
    req.groupMembership = membership;
    req.groupId = groupId;
    next();
  } catch (error) {
    console.error("Group membership validation error:", error);

    res.status(500).json({
      success: false,
      message: "Membership validation failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

const validateGroupAdmin = async (req, res, next) => {
  await validateGroupMember(req, res, () => {
    if (!req.groupMembership) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        timestamp: new Date().toISOString(),
      });
    }
    if (!req.groupMembership.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin privileges required for this action",
        timestamp: new Date().toISOString(),
      });
    }

    next();
  });
};

export const groupMemberAuth = [validateGroupMember];
export const groupAdminAuth = [validateGroupAdmin];

import { pool } from "../connections/db.js";
import { cacheService } from "../utils/cache.js";

const generateInviteCode = () => {
  // Generates a random 8-character alphanumeric code
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createGroup = async (req, res) => {
  let client;
  try {
    const { name, description } = req.body;

    const userId = req.userId;
    const errors = [];

    if (!name || !name.trim()) {
      errors.push("Group name is required");
    } else if (name.trim().length < 2 || name.trim().length > 100) {
      errors.push("Group name must be between 2 and 100 characters");
    }

    if (description && description.trim() && description.trim().length > 500) {
      errors.push("Description cannot exceed 500 characters");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
        timestamp: new Date().toISOString(),
      });
    }
    client = await pool.connect();
    const checkUserQuery = `
      SELECT id, first_name, last_name, email FROM users 
      WHERE id = $1 AND is_active = true
    `;
    const userResult = await client.query(checkUserQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User does not exist or is inactive",
        timestamp: new Date().toISOString(),
      });
    }

    const user = userResult.rows[0];

    let inviteCode;
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
      inviteCode = generateInviteCode();
      const codeCheckQuery = ` SELECT id from groups WHERE invite_code = $1 `;
      const codeResult = await client.query(codeCheckQuery, [inviteCode]);

      if (codeResult.rows.length === 0) {
        break;
      }
      attempts++;
      if (attempts >= maxAttempts) {
        return res.status(500).json({
          success: false,
          message: "Unable to generate unique invite code. Please try again.",
          timestamp: new Date().toISOString(),
        });
      }
    }
    console.log(inviteCode);
    await client.query("BEGIN");
    const checkDuplicateQuery = `
      SELECT id FROM groups 
      WHERE name = $1 AND created_by = $2 AND is_active = true
    `;
    const sanitizedName = name.trim().replace(/[<>]/g, "");
    const duplicateResult = await client.query(checkDuplicateQuery, [
      sanitizedName,
      userId,
    ]);

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You already have a group with this name",
        timestamp: new Date().toISOString(),
      });
    }

    const insertGroupQuery = `
           INSERT INTO groups (name, description, created_by, invite_code, member_count, is_active, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING id, name, description, invite_code, member_count, created_by, created_at, updated_at
    `;

    const sanitizedDescription =
      description && description.trim()
        ? description.trim().replace(/[<>]/g, "")
        : null;

    const insertParams = [
      sanitizedName,
      sanitizedDescription,
      userId,
      inviteCode,
      0,
      true,
    ];
    const groupResult = await client.query(insertGroupQuery, insertParams);
    const newGroup = groupResult.rows[0];

    const groupMemberQuery = `
        INSERT INTO group_members (group_id, user_id, role, joined_at, is_active) 
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, true)
      RETURNING id, role, joined_at
    `;
    const memberParams = [newGroup.id, userId, "admin"];
    const memberResult = await client.query(groupMemberQuery, memberParams);
    const membership = memberResult.rows[0];

    await client.query("COMMIT");

    try {
      await cacheService.invalidateUserGroupCache(userId);
    } catch (cacheError) {
      console.log(
        `Cache invalidation failed for userId ${userId}:`,
        cacheError.message
      );
    }
    const responseData = {
      id: newGroup.id,
      name: newGroup.name,
      description: newGroup.description,
      inviteCode: newGroup.invite_code,
      memberCount: newGroup.member_count,
      createdBy: newGroup.created_by,
      userRole: membership.role,
      createdAt: newGroup.created_at,
      updatedAt: newGroup.updated_at,
      members: [
        {
          userId: userId,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: membership.role,
          joinedAt: membership.joined_at,
        },
      ],
    };
    res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: {
        group: responseData,
      },
      timestamp: new Date().toISOString(),
    });
    console.log(
      `New group created: ${newGroup.id} (${
        newGroup.name
      }) by user ${userId} at ${new Date().toISOString()}`
    );
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.log(`Error in create group controller: ${error.message} `);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const getUserGroups = async (req, res) => {
  let client;
  try {
    const userId = req.userId;
    const cachedGroups = await cacheService.getUserGroups(userId);
    if (cachedGroups) {
      return res.status(200).json({
        success: true,
        data: {
          groups: cachedGroups,
        },
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    client = await pool.connect();

    const getUserGroupsQuery = `
      SELECT 
        g.id,
        g.name,
        g.description,
        g.invite_code,
        g.member_count,
        g.is_active as group_active,
        g.created_at,
        g.updated_at,
        gm.role,
        gm.joined_at,
        gm.is_active as membership_active,
        -- Creator info
        creator.first_name as creator_first_name,
        creator.last_name as creator_last_name,
        creator.id as creator_id,
        -- Recent activity stats
        COALESCE(expense_stats.total_expenses, 0) as total_expenses,
        COALESCE(expense_stats.total_amount, 0) as total_amount,
        COALESCE(expense_stats.recent_expense_date, NULL) as recent_expense_date,
        -- User's balance in this group
        COALESCE(user_balance.balance, 0) as user_balance
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      JOIN users creator ON g.created_by = creator.id
      -- Get expense statistics for each group
      LEFT JOIN (
        SELECT 
          group_id,
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          MAX(expense_date) as recent_expense_date
        FROM expenses 
        WHERE group_id IS NOT NULL 
          AND expense_type = 'group'
          AND deleted_at IS NULL
        GROUP BY group_id
      ) expense_stats ON g.id = expense_stats.group_id
      -- Get user's current balance in each group (simplified - you'll need actual balance logic)
      LEFT JOIN (
        SELECT 
          ep.expense_id,
          e.group_id,
          SUM(ep.amount_owed) as balance
        FROM expense_participants ep
        JOIN expenses e ON ep.expense_id = e.id
        WHERE ep.user_id = $1 
          AND ep.is_settle = false
          AND e.deleted_at IS NULL
        GROUP BY e.group_id, ep.expense_id
      ) user_balance ON g.id = user_balance.group_id
      WHERE gm.user_id = $1 
        AND gm.is_active = true 
        AND g.is_active = true
      ORDER BY 
        CASE 
          WHEN expense_stats.recent_expense_date IS NOT NULL 
          THEN expense_stats.recent_expense_date 
          ELSE gm.joined_at 
        END DESC
    `;

    const result = await client.query(getUserGroupsQuery, [userId]);

    const groups = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      inviteCode: row.invite_code,
      memberCount: row.member_count,
      isActive: row.group_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userRole: row.role,
      joinedAt: row.joined_at,
      membershipActive: row.membership_active,

      createdBy: {
        id: row.creator_id,
        firstName: row.creator_first_name,
        lastName: row.creator_last_name,
      },

      stats: {
        totalExpenses: parseInt(row.total_expenses),
        totalAmount: parseFloat(row.total_amount || 0),
        recentExpenseDate: row.recent_expense_date,
        hasActivity: parseInt(row.total_expenses) > 0,
      },
      userBalance: parseFloat(row.user_balance || 0),
      isOwedMoney: parseFloat(row.user_balance || 0) > 0,
      owesMoney: parseFloat(row.user_balance || 0) < 0,
    }));

    try {
      await cacheService.setUserGroups(userId, groups, 24 * 60 * 60); //30 mins
    } catch (cacheError) {
      console.log(
        `Failed to cache user groups for userId ${userId}:`,
        cacheError.message
      );
    }
    const summary = {
      totalGroups: groups.length,
      adminGroups: groups.filter((g) => g.userRole === "admin").length,
      memberGroups: groups.filter((g) => g.userRole === "member").length,
      activeGroups: groups.filter((g) => g.stats.hasActivity).length,
      totalOwed: groups.reduce((sum, g) => sum + Math.max(0, g.userBalance), 0),
      totalOwing: groups.reduce(
        (sum, g) => sum + Math.abs(Math.min(0, g.userBalance)),
        0
      ),
    };

    res.status(200).json({
      success: true,
      data: {
        groups,
        summary,
      },
      cached: false,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Retrieved ${
        groups.length
      } groups for user ${userId} at ${new Date().toISOString()}`
    );
  } catch (error) {
    console.error("Get user groups error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const getGroupDetail = async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    client = await pool.connect();
    const membershipCheckQuery = `
      SELECT role FROM group_members 
      WHERE group_id = $1 AND user_id = $2 AND is_active = true
    `;
    const membershipResult = await client.query(membershipCheckQuery, [
      id,
      userId,
    ]);

    if (membershipResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this group.",
        timestamp: new Date().toISOString(),
      });
    }

    const groupDetailQuery = `
      WITH group_info AS (
        SELECT 
          g.id,
          g.name,
          g.description,
          g.invite_code,
          g.member_count,
          g.created_at,
          g.created_by,
          creator.first_name as creator_first_name,
          creator.last_name as creator_last_name
        FROM groups g
        JOIN users creator ON g.created_by = creator.id
        WHERE g.id = $1 AND g.is_active = true
      ),

      members AS (
        SELECT 
          gm.user_id,
          gm.role,
          gm.joined_at,
          u.first_name,
          u.last_name,
          u.profile_picture_url
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = $1 AND gm.is_active = true
      ),

      financial_summary AS (
        SELECT 
          COUNT(*) as total_expenses,
          SUM(amount) as total_amount,
          COUNT(CASE WHEN is_settled = false THEN 1 END) as unsettled_expenses
        FROM expenses
        WHERE group_id = $1 
          AND expense_type = 'group' 
          AND deleted_at IS NULL
      ),

      member_balances AS (
        SELECT 
          m.user_id,
          m.first_name,
          m.last_name,
          COALESCE(
            SUM(e.amount) FILTER (
              WHERE e.paid_by = m.user_id 
                AND e.group_id = $1
                AND e.expense_type = 'group'
                AND e.is_settled = false
                AND e.deleted_at IS NULL
            ), 0
          )
          -
          COALESCE(
            SUM(ep.amount_owed) FILTER (
              WHERE ep.user_id = m.user_id
                AND e.group_id = $1
                AND e.expense_type = 'group'
                AND ep.is_settle = false
                AND e.deleted_at IS NULL
            ), 0
          ) AS net_balance
        FROM members m
        LEFT JOIN expenses e ON e.group_id = $1
        LEFT JOIN expense_participants ep ON ep.expense_id = e.id
        GROUP BY m.user_id, m.first_name, m.last_name
      ),

      user_context AS (
        SELECT 
          gm.role as user_role,
          COALESCE(mb.net_balance, 0) as user_balance
        FROM group_members gm
        LEFT JOIN member_balances mb ON gm.user_id = mb.user_id
        WHERE gm.group_id = $1 AND gm.user_id = $2
      )

      SELECT 
        gi.*,
        COALESCE(fs.total_expenses, 0) as total_expenses,
        COALESCE(fs.total_amount, 0) as total_amount,
        COALESCE(fs.unsettled_expenses, 0) as unsettled_expenses,
        uc.user_role,
        uc.user_balance,
        CASE WHEN uc.user_role = 'admin' THEN true ELSE false END as user_is_admin
      FROM group_info gi
      LEFT JOIN financial_summary fs ON true
      LEFT JOIN user_context uc ON true
    `;

    const result = await client.query(groupDetailQuery, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found or inactive",
        timestamp: new Date().toISOString(),
      });
    }

    const group = result.rows[0];

    const membersQuery = `
      SELECT 
        gm.user_id,
        gm.role,
        gm.joined_at,
        u.first_name,
        u.last_name,
        u.profile_picture_url
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1 AND gm.is_active = true
      ORDER BY 
        CASE WHEN gm.role = 'admin' THEN 0 ELSE 1 END,
        gm.joined_at ASC
    `;

    const memberResult = await client.query(membersQuery, [id]);

    //members balance
    const balanceQuery = `
       WITH member_balances AS (
        SELECT 
          gm.user_id,
          u.first_name,
          u.last_name,
          COALESCE(
            SUM(e.amount) FILTER (
              WHERE e.paid_by = gm.user_id 
                AND e.group_id = $1
                AND e.expense_type = 'group'
                AND e.is_settled = false
                AND e.deleted_at IS NULL
            ), 0
          )
          -
          COALESCE(
            SUM(ep.amount_owed) FILTER (
              WHERE ep.user_id = gm.user_id
                AND e.group_id = $1
                AND e.expense_type = 'group'
                AND ep.is_settle = false
                AND e.deleted_at IS NULL
            ), 0
          ) AS net_balance
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        LEFT JOIN expenses e ON e.group_id = $1
        LEFT JOIN expense_participants ep ON ep.expense_id = e.id
        WHERE gm.group_id = $1 AND gm.is_active = true
        GROUP BY gm.user_id, u.first_name, u.last_name
      )
      SELECT user_id, first_name, last_name, net_balance
      FROM member_balances
      WHERE net_balance != 0
      ORDER BY ABS(net_balance) DESC
    `;
    const balanceResult = await client.query(balanceQuery, [id]);

    const members = memberResult.rows.map((row) => ({
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      profilePictureUrl: row.profile_picture_url,
      role: row.role,
      joinedAt: row.joined_at,
    }));

    const balances = balanceResult.rows.map((row) => ({
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      netBalance: parseFloat(row.net_balance),
      isOwed: parseFloat(row.net_balance) > 0,
      owes: parseFloat(row.net_balance) < 0,
    }));

    const responseData = {
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group.member_count,
      createdAt: group.created_at,
      createdBy: {
        id: group.created_by,
        firstName: group.creator_first_name,
        lastName: group.creator_last_name,
      },
      financialSummary: {
        totalExpenses: parseInt(group.total_expenses),
        totalAmount: parseFloat(group.total_amount || 0),
        unsettledExpenses: parseInt(group.unsettled_expenses),
        hasActivity: parseInt(group.total_expenses) > 0,
      },
      userContext: {
        role: group.user_role,
        balance: parseFloat(group.user_balance || 0),
        isAdmin: group.user_is_admin,
        canInvite: group.user_is_admin,
        canManageGroup: group.user_is_admin,
      },

      members: members,
      balances: balances,

      ...(group.user_is_admin && {
        inviteCode: group.invite_code,
      }),
    };
    res.status(200).json({
      success: true,
      data: {
        group: responseData,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Group details retrieved: ${
        group.id
      } by user ${userId} at ${new Date().toISOString()}`
    );
  } catch (error) {
    console.error("Get group  details controller error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const joinGroup = async (req, res) => {
  let client;
  try {
    const { inviteCode } = req.body;
    const userId = req.userId;
    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        message: "Invite code is required",
      });
    }
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    client = await pool.connect();
    const findGroupQuery = `
      SELECT id, name, description, invite_code, member_count, is_active, created_at, updated_at
      FROM groups 
      WHERE invite_code = $1 AND is_active = true
    `;
    const groupResult = await client.query(findGroupQuery, [inviteCode]);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code or group not found",
      });
    }

    const group = groupResult.rows[0];
    const checkMembershipQuery = `
      SELECT 
        gm.role, gm.joined_at, gm.is_active
      FROM group_members gm
      WHERE gm.user_id = $1 
      AND gm.group_id = $2
      AND gm.is_active = true
    `;
    const membershipResult = await client.query(checkMembershipQuery, [
      userId,
      group.id,
    ]);

    if (membershipResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You are already a member of this group",
        data: {
          group: {
            id: group.id,
            name: group.name,
            description: group.description,
            memberCount: group.member_count,
          },
          membership: membershipResult.rows[0],
        },
      });
    }
    await client.query("BEGIN");
    const joinMemberQuery = `
      INSERT INTO group_members(group_id,user_id,role,joined_at,is_active) VALUES ($1,$2,'member',CURRENT_TIMESTAMP,true)
      RETURNING id,role,joined_at,is_active
    `;
    const insertResult = await client.query(joinMemberQuery, [
      group.id,
      userId,
    ]);

    const updatedGroupQuery = `
      SELECT id,name,description,member_count,created_at,updated_at FROM groups WHERE id=$1
    `;
    const updatedGroupResult = await client.query(updatedGroupQuery, [
      group.id,
    ]);

    const existingMembersQuery = `
      SELECT user_id FROM group_members
      WHERE group_id =$1 AND user_id != $2 AND is_active = true
    `;

    const existingMembersResult = await client.query(existingMembersQuery, [
      group.id,
      userId,
    ]);
    const existingMemberIds = existingMembersResult.rows.map(
      (row) => row.user_id
    );
    await client.query("COMMIT");

    try {
      await cacheService.invalidateCachesForNewMember(
        userId,
        group.id,
        existingMemberIds
      );
      // await cacheService.invalidateGroupInviteCache(inviteCode);
    } catch (cacheError) {
      console.log(
        `Don't fail the request if cache invalidation fails:${cacheError}`
      );
    }
    res.status(200).json({
      success: true,
      message: "Successfully joined the group",
      data: {
        group: {
          id: updatedGroupResult.rows[0].id,
          name: updatedGroupResult.rows[0].name,
          description: updatedGroupResult.rows[0].description,
          memberCount: updatedGroupResult.rows[0].member_count,
          createdAt: updatedGroupResult.rows[0].created_at,
          updatedAt: updatedGroupResult.rows[0].updated_at,
        },
        membership: {
          id: insertResult.rows[0].id,
          role: insertResult.rows[0].role,
          joinedAt: insertResult.rows[0].joined_at,
          isActive: insertResult.rows[0].is_active,
        },
      },
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
    }
    console.error("Error joining group:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while joining group",
    });
  } finally {
    if (client) client.release();
  }
};

export const getGroupMemberList = async (req, res) => {
  let client;
  try {
    const { id: groupId } = req.params;
    const userId = req.userId;
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
        timestamp: new Date().toISOString(),
      });
    }
    try {
      const cachedMembers = await cacheService.getGroupMembers(groupId);
      if (cachedMembers) {
        console.log(`Cache hit for group members:${groupId}`);
        return res.status(200).json({
          success: true,
          data: {
            members: cachedMembers,
          },
          cache: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (cacheError) {
      console.log(
        `Cache read failed for group members:${groupId}:`,
        cacheError.message
      );
    }

    client = await pool.connect();

    const getMembersQuery = `
      SELECT 
      u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_picture_url,
        u.last_login,
        gm.role,
        gm.joined_at,
        gm.is_active
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = $1 
        AND gm.is_active = true 
        AND u.is_active = true
      ORDER BY 
        CASE WHEN gm.role = 'admin' THEN 1 ELSE 2 END,
        gm.joined_at ASC
    `;
    const result = await client.query(getMembersQuery, [groupId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active members found in this group",
        timestamp: new Date().toISOString(),
      });
    }
    const members = result.rows.map((member) => ({
      id: member.id,
      name: `${member.first_name} ${member.last_name}`.trim(),
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      profilePictureUrl: member.profile_picture_url,
      role: member.role,
      isActive: member.is_active,
      joinedAt: member.joined_at,
      lastLogin: member.last_login,
      isAdmin: member.role === "admin",
      isCurrentUser: member.id === userId,
    }));

    const admins = members.filter((m) => m.role === "admin");
    const regularMembers = members.filter((m) => m.role === "member");
    const responseData = {
      members,
      summary: {
        totalMembers: members.length,
        adminCount: admins.length,
        memberCount: regularMembers.length,
      },
      admins,
      regularMembers,
      cache: false,
    };
    try {
      await cacheService.setGroupMembers(groupId, members, 10 * 60);
    } catch (cacheError) {
      console.log(`Failed to cache group members: ${cacheError.message}`);
    }
    res.status(200).json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Members list retrieved for group: ${groupId} by user: ${userId} (${members.length} members)`
    );
  } catch (error) {
    console.error(`Error in getGroupMemberList: ${error.message}`, {
      groupId: req.params.id,
      userId: req.userId,
      stack: error.stack,
    });

    // Handle specific database errors
    if (error.code === "22P02") {
      // Invalid UUID format
      return res.status(400).json({
        success: false,
        message: "Invalid group ID format",
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to retrieve group members",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

export const getMemberCount = async (req, res) => {
  let client;
  try {
    const { id: groupId } = req.params;
    try {
      const cachedGroup = await cacheService.getGroupDetails(groupId);
      if (cachedGroup && cachedGroup.member_count !== undefined) {
        return res.status(200).json({
          success: true,
          data: { memberCount: cachedGroup.member_count },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (cacheError) {
      console.log(`Cache read error: ${cacheError.message}`);
    }
    client = await pool.connect();

    const countQuery = `
      SELECT member_count 
      FROM groups 
      WHERE id = $1 AND is_active = true
    `;

    const result = await client.query(countQuery, [groupId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      data: { memberCount: result.rows[0].member_count },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error in getGroupMemberCount: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve member count",
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

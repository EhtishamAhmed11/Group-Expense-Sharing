import { pool } from "../connections/db.js";
import { cacheService } from "../utils/cache.js";
export const settleDebt = async (req, res) => {
  let client;
  try {
    const { groupId, toUserId } = req.params;
    const {
      expenseIds,
      amount,
      settlementMethod = "cash",
      description,
    } = req.body;

    if (!groupId || !toUserId) {
      return res.status(400).json({
        success: false,
        message: "Group ID and recipient user ID are required",
        timestamp: new Date().toISOString(),
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Settlement amount must be greater than 0",
        timestamp: new Date().toISOString(),
      });
    }

    const userId = req.userId;
    if (userId === toUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot settle debt with yourself",
        timestamp: new Date().toISOString(),
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const debtQuery = `
      SELECT 
        e.id as expense_id,
        e.amount as expense_total,
        e.description as expense_description,
        e.expense_date,
        e.created_at,
        ep.amount_owed,
        ep.percentage
      FROM expenses e 
      JOIN expense_participants ep ON e.id = ep.expense_id
      WHERE e.paid_by = $1 
        AND e.group_id = $2 
        AND e.expense_type = 'group'
        AND e.is_settled = false 
        AND ep.user_id = $3 
        AND ep.is_settle = false
      ORDER BY e.expense_date ASC, e.created_at ASC
    `;

    const params = [toUserId, groupId, userId];
    const debtResult = await client.query(debtQuery, params);

    if (debtResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "No unsettled debts found between these users in this group",
        timestamp: new Date().toISOString(),
      });
    }

    const totalDebtAmount = debtResult.rows.reduce(
      (sum, debt) => sum + parseFloat(debt.amount_owed),
      0
    );
    const settlementAmount = parseFloat(amount);

    if (settlementAmount > totalDebtAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Settlement amount ($${settlementAmount}) cannot exceed total debt ($${totalDebtAmount})`,
        timestamp: new Date().toISOString(),
      });
    }

    const createSettlementQuery = `
      INSERT INTO settlements (
        from_user_id, to_user_id, amount, group_id, 
        description, settlement_method, status, 
        confirmed_by_payer, confirmed_by_receiver, confirmed_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, created_at
    `;

    const settlementDescription =
      description || `Debt settlement in ${groupId}`;
    const settlementResult = await client.query(createSettlementQuery, [
      userId, // from_user_id (person paying)
      toUserId, // to_user_id (person receiving payment)
      settlementAmount,
      groupId,
      settlementDescription,
      settlementMethod,
    ]);

    const settlementId = settlementResult.rows[0].id;

    //Apply settlement to expenses (oldest first)
    let remainingAmount = settlementAmount;
    const settledExpenses = [];
    const partiallySettledExpenses = [];

    for (const debt of debtResult.rows) {
      if (remainingAmount <= 0) break;

      const debtAmount = parseFloat(debt.amount_owed);

      if (remainingAmount >= debtAmount) {
        await client.query(
          `UPDATE expense_participants 
           SET is_settle = true 
           WHERE expense_id = $1 AND user_id = $2`,
          [debt.expense_id, userId]
        );

        settledExpenses.push({
          expenseId: debt.expense_id,
          description: debt.expense_description,
          settledAmount: debtAmount,
          fullySettled: true,
        });

        remainingAmount -= debtAmount;

        const remainingParticipantsQuery = `
          SELECT COUNT(*) as unsettled_count
          FROM expense_participants 
          WHERE expense_id = $1 AND is_settle = false
        `;
        const remainingResult = await client.query(remainingParticipantsQuery, [
          debt.expense_id,
        ]);

        if (parseInt(remainingResult.rows[0].unsettled_count) === 0) {
          await client.query(
            `UPDATE expenses SET is_settled = true WHERE id = $1`,
            [debt.expense_id]
          );
        }
      } else if (remainingAmount > 0) {
        // Partial settlement - this is complex and might need business logic decision
        // For now, we'll record the partial payment but not mark as settled
        partiallySettledExpenses.push({
          expenseId: debt.expense_id,
          description: debt.expense_description,
          partialAmount: remainingAmount,
          totalOwed: debtAmount,
          fullySettled: false,
        });

        remainingAmount = 0;
      }
    }

    const updatedDebtResult = await client.query(debtQuery, params);
    const remainingDebt = updatedDebtResult.rows.reduce(
      (sum, debt) => sum + parseFloat(debt.amount_owed),
      0
    );

    await client.query("COMMIT");

    try {
      await cacheService.invalidateDebtCaches([userId, toUserId]);
      console.log(
        `Invalidated debt caches after settlement between ${userId} and ${toUserId}`
      );
    } catch (cacheError) {
      console.log(`Debt cache invalidation error: ${cacheError.message}`);
    }

    const responseData = {
      settlement: {
        id: settlementId,
        amount: settlementAmount,
        method: settlementMethod,
        description: settlementDescription,
        fromUser: userId,
        toUser: toUserId,
        groupId: groupId,
        createdAt: settlementResult.rows[0].created_at,
        status: "confirmed",
      },
      settledExpenses: settledExpenses,
      partiallySettledExpenses: partiallySettledExpenses,
      summary: {
        totalSettled: settlementAmount,
        expensesFullySettled: settledExpenses.length,
        expensesPartiallySettled: partiallySettledExpenses.length,
        remainingDebt: remainingDebt,
        isFullySettled: remainingDebt === 0,
      },
    };

    res.status(200).json({
      success: true,
      message:
        remainingDebt === 0
          ? "All debts settled successfully"
          : `Partial settlement completed. $${remainingDebt} remaining`,
      data: responseData,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Settlement completed: ${userId} paid ${toUserId} $${settlementAmount} in group ${groupId}`
    );
  } catch (error) {
    // Rollback on error
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Error rolling back settlement transaction:",
          rollbackError
        );
      }
    }

    console.error(`Error in settleDebt: ${error.message}`, {
      groupId: req.params.groupId,
      toUserId: req.params.toUserId,
      userId: req.userId,
      amount: req.body.amount,
      stack: error.stack,
    });

    // Handle specific database errors
    if (error.code === "23503") {
      // Foreign key violation
      return res.status(400).json({
        success: false,
        message: "Invalid user ID or group ID",
        timestamp: new Date().toISOString(),
      });
    }

    if (error.code === "22P02") {
      // Invalid UUID format
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to process debt settlement",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const confirmSettlement = async (req, res) => {
  const client = await pool.connect();
  try {
    const { settlementId } = req.params;
    const { confirm, disputeReason } = req.body;
    const userId = req.user.id;

    await client.query("BEGIN");

    const settlementResult = await client.query(
      `SELECT * FROM settlements WHERE id = $1`,
      [settlementId]
    );
    if (settlementResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Settlement not found" });
    }
    const settlement = settlementResult.rows[0];
    if (![settlement.from_user_id, settlement.to_user_id].includes(userId)) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }
    if (settlement.status === "confirmed" || settlement.status === "disputed") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ success: false, message: "Already finalized" });
    }

    let confirmedByPayer = settlement.confirmed_by_payer;
    let confirmedByReceiver = settlement.confirmed_by_receiver;
    let newStatus = "pending";
    let confirmedAt = null;

    if (!confirm) {
      newStatus = "disputed";
      await client.query(
        `UPDATE settlements
         SET status = $1, dispute_reason = $2, updated_at = NOW()
         WHERE id = $3`,
        [newStatus, disputeReason || null, settlementId]
      );
      await client.query("COMMIT");
      return res.json({ success: true, message: "Settlement disputed" });
    }

    if (userId === settlement.from_user_id) {
      confirmedByPayer = true;
    }
    if (userId === settlement.to_user_id) {
      confirmedByReceiver = true;
    }

    if (confirmedByPayer && confirmedByReceiver) {
      newStatus = "confirmed";
      confirmedAt = new Date();
    }

    const updateRes = await client.query(
      `UPDATE settlements
       SET confirmed_by_payer = $1,
           confirmed_by_receiver = $2,
           status = $3,
           confirmed_at = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        confirmedByPayer,
        confirmedByReceiver,
        newStatus,
        confirmedAt,
        settlementId,
      ]
    );

    if (newStatus === "confirmed") {
      await client.query(
        `UPDATE expense_participants
         SET is_settled = true
         WHERE user_id = $1
           AND expense_id IN (
             SELECT id FROM expenses WHERE group_id = $2
           )`,
        [settlement.from_user_id, settlement.group_id]
      );
    }

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Settlement updated",
      data: updateRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error confirming settlement:", err);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
};

export const getSettlementHistory = async (req, res) => {
  let client;
  try {
    const userId = req.userId;

    const {
      page = 1,
      limit = 20,
      status = "",
      groupId = "",
      otherUserId = "",
      direction = "", // 'incoming', 'outgoing', 'all'
      dateFrom = "",
      dateTo = "",
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    const pageNum = parseInt(page) > 0 ? parseInt(page) : 1;
    const limitNum = Math.min(100, parseInt(limit) || 20);
    const offset = (pageNum - 1) * limitNum;

    const allowedSortFields = [
      "created_at",
      "amount",
      "confirmed_at",
      "status",
    ];
    const validSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "created_at";

    const validSortOrder =
      sortOrder.toUpperCase() === "ASC" || sortOrder.toUpperCase() === "DESC"
        ? sortOrder.toUpperCase()
        : "DESC";

    const cacheKey = `settlements:${userId}:${pageNum}:${limitNum}:${status}:${groupId}:${otherUserId}:${direction}:${dateFrom}:${dateTo}:${validSortBy}:${validSortOrder}`;

    try {
      const cachedData = await cacheService.client.get(cacheKey);

      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: "Retrieved settlement history from cache",
          data: JSON.parse(cachedData),
          fromCache: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (cacheError) {
      console.log("Cache read error:", cacheError.message);
    }

    client = await pool.connect();

    let whereConditions = ["(s.from_user_id = $1 OR s.to_user_id = $1)"];
    let queryParams = [userId];
    let paramIndex = 2;

    if (status && status !== "all") {
      whereConditions.push(`s.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (groupId) {
      whereConditions.push(`s.group_id = $${paramIndex}`);
      queryParams.push(groupId);
      paramIndex++;
    }

    if (otherUserId) {
      whereConditions.push(`(
        (s.from_user_id = $1 AND s.to_user_id = $${paramIndex})
        OR
        (s.from_user_id = $${paramIndex} AND s.to_user_id = $1)
      )`);
      queryParams.push(otherUserId);
      paramIndex++;
    }

    if (direction && direction !== "all") {
      if (direction === "outgoing") {
        whereConditions.push("s.from_user_id = $1");
      } else if (direction === "incoming") {
        whereConditions.push("s.to_user_id = $1");
      }
    }

    if (dateFrom) {
      whereConditions.push(`s.created_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`s.created_at <= $${paramIndex}`);
      queryParams.push(dateTo + " 23:59:59");
      paramIndex++;
    }

    const settlementQuery = `
        SELECT 
            s.id,s.amount,s.description,s.settlement_method,s.status,s.confirmed_by_payer,s.confirmed_by_receiver,s.created_at,s.confirmed_at,s.updated_at,

            CASE WHEN s.from_user_id = $1 THEN 'outgoing'
                WHEN s.to_user_id = $1 THEN 'incoming' END as direction,

              CASE WHEN s.from_user_id = $1 THEN s.to_user_id
             WHEN s.to_user_id = $1 THEN s.from_user_id END as other_party_id,

        CASE WHEN s.from_user_id = $1 THEN to_user.first_name || ' ' || to_user.last_name
             WHEN s.to_user_id = $1 THEN from_user.first_name || ' ' || from_user.last_name END as other_party_name,

        CASE WHEN s.from_user_id = $1 THEN to_user.email
             WHEN s.to_user_id = $1 THEN from_user.email END as other_party_email,

        g.id as group_id, g.name as group_name,

        CASE WHEN s.from_user_id = $1 THEN s.confirmed_by_payer
             WHEN s.to_user_id = $1 THEN s.confirmed_by_receiver END as confirmed_by_user,

        CASE WHEN s.from_user_id = $1 THEN s.confirmed_by_receiver
             WHEN s.to_user_id = $1 THEN s.confirmed_by_payer END as confirmed_by_other

      FROM settlements s
      JOIN users from_user ON s.from_user_id = from_user.id
      JOIN users to_user ON s.to_user_id = to_user.id
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY s.${validSortBy} ${validSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
     
    `;
    const countQuery = `
        SELECT COUNT(*) as total_count
        FROM settlements s
        WHERE ${whereConditions.join(" AND ")}
    `;
    queryParams.push(limitNum, offset);

    const [settlementsResult, countResult] = await Promise.all([
      client.query(settlementQuery, queryParams),
      client.query(countQuery, queryParams.slice(0, paramIndex - 1)),
    ]);

    const totalSettlements = parseInt(countResult.rows[0].total_count);
    const totalPages = Math.ceil(totalSettlements / limitNum);

    const settlements = settlementsResult.rows.map((row) => {
      const fullyConfirmed =
        row.confirmed_by_payer && row.confirmed_by_receiver;

      return {
        id: row.id,
        amount: parseFloat(row.amount),
        description: row.description,
        method: row.settlement_method,
        status: row.status,
        direction: row.direction,

        otherParty: {
          id: row.other_party_id,
          name: row.other_party_name,
          email: row.other_party_email,
        },

        group: row.group_id ? { id: row.group_id, name: row.group_name } : null,

        confirmationStatus: {
          confirmedByUser: row.confirmed_by_user,
          confirmedByOther: row.confirmed_by_other,
          fullyConfirmed: fullyConfirmed,
          pendingConfirmation: row.status === "pending",
          disputed: row.status === "disputed",
        },

        dates: {
          createdAt: row.created_at,
          confirmedAt: row.confirmed_at,
          updatedAt: row.updated_at,
        },

        displayText:
          row.direction === "outgoing"
            ? `You paid ${row.other_party_name} $${parseFloat(row.amount)}`
            : `${row.other_party_name} paid you $${parseFloat(row.amount)}`,

        actionRequired: row.status === "pending" && !row.confirmed_by_user,
      };
    });

    let totalAmount = 0;
    let outgoingAmount = 0;
    let incomingAmount = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    let disputedCount = 0;
    let actionRequiredCount = 0;

    for (let s of settlements) {
      totalAmount += s.amount;
      if (s.direction === "outgoing") outgoingAmount += s.amount;
      if (s.direction === "incoming") incomingAmount += s.amount;
      if (s.status === "pending") pendingCount++;
      if (s.status === "confirmed") confirmedCount++;
      if (s.status === "disputed") disputedCount++;
      if (s.actionRequired) actionRequiredCount++;
    }
    const summary = {
      totalSettlements,
      totalAmount,
      outgoingAmount,
      incomingAmount,
      pendingCount,
      confirmedCount,
      disputedCount,
      actionRequiredCount,
    };

    const responseData = {
      settlements,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalSettlements,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
      filters: {
        status,
        groupId,
        otherUserId,
        direction,
        dateFrom,
        dateTo,
        sortBy: validSortBy,
        sortOrder: validSortOrder,
      },
      summary,
    };

    try {
      await cacheService.client.setEx(
        cacheKey,
        3 * 60,
        JSON.stringify(responseData)
      );
      console.log(`Response Cached`);
    } catch (cacheError) {
      console.log("Cache write error:", cacheError.message);
    }
    res.status(200).json({
      success: true,
      message: `Retrieved ${settlements.length} settlements (page ${pageNum} of ${totalPages})`,
      data: responseData,
      fromCache: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in getSettlementHistory:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve settlement history",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

export const getSettlementDetails = async (req, res) => {
  let client;
  try {
    const { id: settlementId } = req.params;
    const userId = req.userId;

    client = await pool.connect();

    const detailsQuery = `
        SELECT 
            s.*,
            from_user.first_name || ' ' || from_user.last_name as payer_name,
            from_user.email as payer_email,
            to_user.email as receiver_email,
            g.name as group_name,

            -- user's role in this settlement
            CASE 
                WHEN s.from_user_id = $1 THEN 'payer'
                WHEN s.to_user_id =$1 THEN 'receiver'
                ELSE 'none'
            END as user_role

            FROM settlements s 
            JOIN users from_user ON s.from_user_id = from_user.id
            JOIN users to_user ON s.to_user_id = to_user.id
            LEFT JOIN groups g ON s.group_id=g.id
            WHERE s.id =$2 AND (s.from_user_id=$1 OR s.to_user_id = $1)
    `;
    const result = await client.query(detailsQuery, [userId, settlementId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Settlement not found or access denied",
        timestamp: new Date().toISOString(),
      });
    }
    const settlement = result.rows[0];
    res.status(200).json({
      success: true,
      message: "Settlement details retrieved successfully",
      data: {
        settlement: {
          id: settlement.id,
          amount: parseFloat(settlement.amount),
          description: settlement.description,
          method: settlement.settlement_method,
          status: settlement.status,

          payer: {
            id: settlement.from_user_id,
            name: settlement.payer_name,
            email: settlement.payer_email,
          },

          receiver: {
            id: settlement.to_user_id,
            name: settlement.receiver_name,
            email: settlement.receiver_email,
          },

          group: settlement.group_id
            ? {
                id: settlement.group_id,
                name: settlement.group_name,
              }
            : null,

          confirmationStatus: {
            confirmedByPayer: settlement.confirmed_by_payer,
            confirmedByReceiver: settlement.confirmed_by_receiver,
            fullyConfirmed:
              settlement.confirmed_by_payer && settlement.confirmed_by_receiver,
          },

          userRole: settlement.user_role,
          canConfirm:
            settlement.status === "pending" && settlement.user_role !== "none",

          dates: {
            createdAt: settlement.created_at,
            confirmedAt: settlement.confirmed_at,
            updatedAt: settlement.updated_at,
          },
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error in getSettlementDetails: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve settlement details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

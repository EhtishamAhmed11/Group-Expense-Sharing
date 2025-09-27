import { pool } from "../connections/db.js";
import { cacheService } from "../utils/cache.js";

function calculateEqualSplit(members, totalAmount, payerId) {
  const memberCount = members.length;
  const amountInCents = Math.round(totalAmount * 100);
  const baseAmountCents = Math.floor(amountInCents / memberCount);
  const remainderCents = amountInCents % memberCount;

  console.log(`Equal split: $${totalAmount} among ${memberCount} members`);
  console.log(`Base amount: ${baseAmountCents} cents per person`);
  console.log(`Remainder: ${remainderCents} cents to distribute`);

  const participantRecords = [];

  for (let i = 0; i < members.length; i++) {
    const member = members[i];

    const extraCent = i < remainderCents ? 1 : 0;
    const memberAmountCents = baseAmountCents + extraCent;
    const memberAmount = memberAmountCents / 100;
    const percentage = Math.round((memberAmount / totalAmount) * 10000) / 100;

    if (member.user_id === payerId) {
      participantRecords.push({
        userId: member.user_id,
        role: member.role,
        amountOwed: 0,
        fairShare: memberAmount,
        percentage: percentage,
        isPayer: true,
        netCredit: totalAmount - memberAmount,
        explanation: `Paid $${totalAmount}, fair share $${memberAmount}, net credit: $${
          totalAmount - memberAmount
        }`,
      });
    } else {
      participantRecords.push({
        userId: member.user_id,
        role: member.role,
        amountOwed: memberAmount,
        percentage: percentage,
        isPayer: false,
        netDebt: memberAmount,
        explanation: `Owes $${memberAmount} to the payer`,
      });
    }
  }
  return participantRecords;
}

function calculateExactSplit(members, totalAmount, payerId, splitDetails) {
  console.log(`Exact split: $${totalAmount} with custom amounts`);

  const participantRecords = [];
  let payerFairShare = 0;

  const splitMap = {};

  splitDetails.forEach((detail) => {
    splitMap[detail.user_id] = parseFloat(detail.amount);
  });

  for (const member of members) {
    const memberAmount = splitMap[member.user_id] || 0;
    const percentage = Math.round((memberAmount / totalAmount) * 10000) / 100;

    if (member.user_id === payerId) {
      payerFairShare = memberAmount;

      participantRecords.push({
        userId: member.user_id,
        role: member.role,
        amountOwed: 0,
        fairShare: memberAmount,
        percentage: percentage,
        isPayer: true,
        netCredit: totalAmount - memberAmount,
        explanation: `Paid $${totalAmount}, fair share $${memberAmount}, net credit: $${
          totalAmount - memberAmount
        }`,
      });
    } else {
      participantRecords.push({
        userId: member.user_id,
        role: member.role,
        amountOwed: memberAmount,
        percentage: percentage,
        isPayer: false,
        netDebt: memberAmount,
        explanation: `Owes $${memberAmount} to the payer (exact split)`,
      });
    }
  }
  console.log(
    `Exact split calculated with payer fair share: $${payerFairShare}`
  );
  return participantRecords;
}

function calculatePercentageSplit(members, totalAmount, payerId, splitDetails) {
  console.log(`Percentage split: $${totalAmount} with custom percentages`);

  const participantRecords = [];
  let payerFairShare = 0;

  const splitMap = {};
  splitDetails.forEach((detail) => {
    splitMap[detail.user_id] = parseFloat(detail.percentage);
  });

  for (const member of members) {
    const percentage = splitMap[member.user_id] || 0;
    const memberAmount =
      Math.round(((totalAmount * percentage) / 100) * 100) / 100;

    if (member.user_id === payerId) {
      payerFairShare = memberAmount;
      participantRecords.push({
        userId: member.user_id,
        role: member.role,
        amountOwed: 0,
        fairShare: memberAmount,
        percentage: percentage,
        isPayer: true,
        netCredit: totalAmount - memberAmount,
        explanation: `Paid $${totalAmount}, fair share $${memberAmount} (${percentage}%), net credit: $${
          totalAmount - memberAmount
        }`,
      });
    } else {
      participantRecords.push({
        userId: member.user_id,
        role: member.role,
        amountOwed: memberAmount,
        percentage: percentage,
        isPayer: false,
        netDebt: memberAmount,
        explanation: `Owes $${memberAmount} (${percentage}%) to the payer`,
      });
    }
  }
  console.log(
    `Percentage split calculated with payer fair share: $${payerFairShare} (${splitMap[payerId]}%)`
  );
  return participantRecords;
}

export const createGroupExpense = async (req, res) => {
  let client;
  try {
    const {
      amount,
      description,
      category_name,
      group_id,
      expense_type = "group",
      split_type = "equal",
      split_details = null,
    } = req.body;

    const userId = req.userId;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
        timestamp: new Date().toISOString(),
      });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
        timestamp: new Date().toISOString(),
      });
    }

    if (!group_id) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount format",
        timestamp: new Date().toISOString(),
      });
    }

    const validSplitTypes = ["equal", "exact", "percentage"];
    if (!validSplitTypes.includes(split_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid split_type. Must be one of: ${validSplitTypes.join(
          ", "
        )}`,
        timestamp: new Date().toISOString(),
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const getMembersQuery = `
      SELECT user_id, role 
      FROM group_members 
      WHERE group_id = $1 AND is_active = true
      ORDER BY joined_at ASC
    `;
    const memberResult = await client.query(getMembersQuery, [group_id]);

    if (memberResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "No active members found in this group",
        timestamp: new Date().toISOString(),
      });
    }

    const members = memberResult.rows;
    const memberCount = members.length;
    const memberIds = members.map((member) => member.user_id);

    const isCreatorMember = members.some((member) => member.user_id === userId);
    if (!isCreatorMember) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "You must be a member of the group to create expenses",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`Found ${memberCount} active members in group ${group_id}`);

    if (split_type !== "equal") {
      if (!split_details || !Array.isArray(split_details)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "split_details array is required for non-equal splits",
          timestamp: new Date().toISOString(),
        });
      }

      if (split_details.length !== memberCount) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: `split_details must include all ${memberCount} group members`,
          timestamp: new Date().toISOString(),
        });
      }

      for (const detail of split_details) {
        if (!detail.user_id) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: "Each split_detail must have a user_id",
            timestamp: new Date().toISOString(),
          });
        }

        const isMember = members.some(
          (member) => member.user_id === detail.user_id
        );
        if (!isMember) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: `User ${detail.user_id} is not an active group member`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (split_type === "exact") {
        let totalSplitAmount = 0;
        for (const detail of split_details) {
          if (!detail.amount || detail.amount <= 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              success: false,
              message: "All amounts in split_details must be greater than 0",
              timestamp: new Date().toISOString(),
            });
          }
          totalSplitAmount += parseFloat(detail.amount);
        }

        if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: `Sum of split amounts ($${totalSplitAmount}) must equal total amount ($${totalAmount})`,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (split_type === "percentage") {
        let totalPercentage = 0;
        for (const detail of split_details) {
          if (!detail.percentage || detail.percentage <= 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
              success: false,
              message:
                "All percentages in split_details must be greater than 0",
              timestamp: new Date().toISOString(),
            });
          }
          totalPercentage += parseFloat(detail.percentage);
        }

        // Check if percentages sum to 100
        if (Math.abs(totalPercentage - 100) > 0.01) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            message: `Sum of percentages (${totalPercentage}%) must equal 100%`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    let categoryId = null;
    if (category_name) {
      const categoryQuery = `
        SELECT id FROM expense_categories 
        WHERE LOWER(name) = LOWER($1) 
        LIMIT 1
      `;
      const categoryResult = await client.query(categoryQuery, [category_name]);

      if (categoryResult.rows.length > 0) {
        categoryId = categoryResult.rows[0].id;
      } else {
        const createCategoryQuery = `
          INSERT INTO expense_categories (name, is_default) 
          VALUES ($1, false) 
          RETURNING id
        `;
        const newCategoryResult = await client.query(createCategoryQuery, [
          category_name,
        ]);
        categoryId = newCategoryResult.rows[0].id;
        console.log(`Created new category: ${category_name}`);
      }
    }

    const createExpenseQuery = `
      INSERT INTO expenses (
        amount, description, category_id, expense_date, 
        created_by, paid_by, group_id, expense_type, split_type,
        is_settled, created_at, updated_at
      ) VALUES (
        $1, $2, $3, CURRENT_DATE, 
        $4, $5, $6, $7, $8,
        false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, created_at
    `;

    const expenseValues = [
      totalAmount,
      description.trim(),
      categoryId,
      userId,
      userId,
      group_id,
      expense_type,
      split_type,
    ];

    const expenseResult = await client.query(createExpenseQuery, expenseValues);
    const expenseId = expenseResult.rows[0].id;
    const expenseCreatedAt = expenseResult.rows[0].created_at;

    console.log(`Created expense ${expenseId} for $${totalAmount}`);

    if (memberCount === 1) {
      const singleMember = members[0];

      if (singleMember.user_id !== userId) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Single group member must be the expense creator",
          timestamp: new Date().toISOString(),
        });
      }

      const singleParticipantQuery = `
        INSERT INTO expense_participants (
          expense_id, user_id, amount_owed, percentage, is_settle, created_at
        ) VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
      `;

      await client.query(singleParticipantQuery, [
        expenseId,
        singleMember.user_id,
        totalAmount,
        100.0,
      ]);

      await client.query("COMMIT");

      try {
        await cacheService.invalidateGroupCache(group_id);
        await cacheService.invalidateUserExpenseCache(userId);
      } catch (cacheError) {
        console.log(`Cache invalidation error: ${cacheError.message}`);
      }

      return res.status(201).json({
        success: true,
        message: "Personal expense created successfully (single participant)",
        data: {
          expense: {
            id: expenseId,
            amount: totalAmount,
            description: description.trim(),
            categoryName: category_name,
            groupId: group_id,
            expenseType: expense_type,
            splitType: split_type,
            createdBy: userId,
            paidBy: userId,
            createdAt: expenseCreatedAt,
            isSettled: true,
          },
          splitDetails: {
            totalAmount: totalAmount,
            participantCount: 1,
            splitType: split_type,
            participants: [
              {
                userId: singleMember.user_id,
                role: singleMember.role,
                amountOwed: totalAmount,
                percentage: 100.0,
                isPayer: true,
                isSettled: true,
              },
            ],
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `Multiple participants: ${memberCount} total, calculating ${split_type} split`
    );

    let participantCalculations = [];

    // Calculation based on split_type
    switch (split_type) {
      case "equal":
        participantCalculations = calculateEqualSplit(
          members,
          totalAmount,
          userId
        );
        break;
      case "exact":
        participantCalculations = calculateExactSplit(
          members,
          totalAmount,
          userId,
          split_details
        );
        break;
      case "percentage":
        participantCalculations = calculatePercentageSplit(
          members,
          totalAmount,
          userId,
          split_details
        );
        break;
      default:
        throw new Error(`Unsupported split_type: ${split_type}`);
    }

    console.log(
      `Calculated splits for ${participantCalculations.length} participants`
    );

    const participantInsertQuery = `
      INSERT INTO expense_participants (
        expense_id, user_id, amount_owed, percentage, is_settle, created_at
      ) VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)
    `;

    let totalDebtCreated = 0;
    let payerFairShare = 0;

    for (const participant of participantCalculations) {
      if (participant.isPayer) {
        payerFairShare = participant.fairShare;
        console.log(
          `PAYER ${participant.userId}: Fair share $${participant.fairShare}, actual debt $0, net credit $${participant.netCredit}`
        );
      } else {
        // Insert debt record for non-payers
        await client.query(participantInsertQuery, [
          expenseId,
          participant.userId,
          participant.amountOwed,
          participant.percentage,
        ]);

        totalDebtCreated += participant.amountOwed;
        console.log(
          `DEBTOR ${participant.userId}: owes $${participant.amountOwed} (${participant.percentage}%) to payer`
        );
      }
    }

    const expectedTotalDebt = totalAmount - payerFairShare;

    if (Math.abs(totalDebtCreated - expectedTotalDebt) > 0.01) {
      await client.query("ROLLBACK");
      throw new Error(
        `Split calculation error: Created debts total $${totalDebtCreated}, but should be $${expectedTotalDebt}`
      );
    }

    const allAmountsSum = participantCalculations.reduce((sum, p) => {
      return sum + (p.isPayer ? p.fairShare : p.amountOwed);
    }, 0);

    if (Math.abs(allAmountsSum - totalAmount) > 0.01) {
      await client.query("ROLLBACK");
      throw new Error(
        `Math error: Individual amounts sum to $${allAmountsSum}, but total expense is $${totalAmount}`
      );
    }

    console.log(` Verification passed:`);
    console.log(`  - Total expense: $${totalAmount}`);
    console.log(`  - Payer fair share: $${payerFairShare}`);
    console.log(`  - Total debt created: $${totalDebtCreated}`);
    console.log(`  - Payer net credit: $${totalAmount - payerFairShare}`);

    await client.query("COMMIT");

    // Cache invalidation
    try {
      const promises = [cacheService.invalidateGroupCache(group_id)];
      for (const member of members) {
        promises.push(cacheService.invalidateUserExpenseCache(member.user_id));
      }
      await Promise.all(promises);
      console.log(
        `Invalidated caches for group ${group_id} and ${members.length} members`
      );
    } catch (cacheError) {
      console.log(`Cache invalidation error: ${cacheError.message}`);
    }

    const payerRecord = participantCalculations.find((p) => p.isPayer);
    const debtorRecords = participantCalculations.filter((p) => !p.isPayer);

    const responseData = {
      expense: {
        id: expenseId,
        amount: totalAmount,
        description: description.trim(),
        categoryName: category_name,
        groupId: group_id,
        expenseType: expense_type,
        splitType: split_type,
        createdBy: userId,
        paidBy: userId,
        createdAt: expenseCreatedAt,
        isSettled: false,
      },
      splitDetails: {
        totalAmount: totalAmount,
        participantCount: memberCount,
        splitType: split_type,
        participants: participantCalculations,
        payerInfo: payerRecord
          ? {
              userId: payerRecord.userId,
              amountPaid: totalAmount,
              amountOwed: payerRecord.amountOwed,
              fairShare: payerRecord.fairShare,
              netCredit: payerRecord.netCredit,
              explanation: payerRecord.explanation,
            }
          : null,
        debtSummary: debtorRecords.map((d) => ({
          userId: d.userId,
          role: d.role,
          owesToPayer: d.amountOwed,
          explanation: d.explanation,
        })),
      },
      summary: {
        totalParticipants: memberCount,
        averageAmount: Math.round((totalAmount / memberCount) * 100) / 100,
        createdBy: userId,
        debtRelationships: debtorRecords.length,
        mathVerification: {
          totalSplit: allAmountsSum,
          originalAmount: totalAmount,
          payerNetCredit: totalAmount - payerFairShare,
          totalDebtCreated: totalDebtCreated,
          isBalanced: Math.abs(allAmountsSum - totalAmount) < 0.01,
        },
      },
    };

    res.status(201).json({
      success: true,
      message: `Group expense created successfully with ${split_type} split`,
      data: responseData,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Successfully created group expense: ${expenseId} for $${totalAmount} split among ${memberCount} members using ${split_type} method`
    );
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
    }

    console.error(`Error in createGroupExpense: ${error.message}`, {
      groupId: req.body.group_id,
      userId: req.userId,
      amount: req.body.amount,
      splitType: req.body.split_type,
      stack: error.stack,
    });

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid group ID or user ID",
        timestamp: new Date().toISOString(),
      });
    }

    if (error.code === "22P02") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        timestamp: new Date().toISOString(),
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Duplicate expense entry",
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create group expense",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const getGroupExpense = async (req, res) => {
  let client;
  try {
    const groupId =
      req.params.groupId ||
      req.params.id ||
      req.body.group_id ||
      req.body.groupId;

    const userId = req.userId;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "Group ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "expense_date",
      sortOrder = "DESC",
      category = "",
      paidBy = "",
      dateFrom = "",
      dateTo = "",
      minAmount = "",
      maxAmount = "",
      settlementStatus = "",
      userRole = "",
    } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50;
    const offset = (page - 1) * limit;

    const allowedSortFields = [
      "expense_date",
      "amount",
      "description",
      "created_at",
      "updated_at",
    ];
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = "expense_date";
    }
    sortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const cacheKey = `group_expenses:${groupId}:${page}:${limit}:${search}:${sortBy}:${sortOrder}:${category}:${paidBy}:${dateFrom}:${dateTo}:${minAmount}:${maxAmount}:${settlementStatus}:${userRole}`;
    try {
      const cachedData = await cacheService.client.get(cacheKey);
      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: "Retrieved group expenses from cache",
          data: JSON.parse(cachedData),
          fromCache: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.log("Cache read error:", err.message);
    }

    client = await pool.connect();

    const groupQuery = `SELECT id, name, description, invite_code, member_count, created_by, created_at
                        FROM groups WHERE id = $1 AND is_active = true`;
    const groupResult = await client.query(groupQuery, [groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found or inactive",
        timestamp: new Date().toISOString(),
      });
    }
    const group = groupResult.rows[0];

    let whereClause = `WHERE e.group_id = $1 AND e.expense_type = 'group'`;
    let queryParams = [groupId];
    let paramIndex = 2;

    if (search.trim()) {
      whereClause += ` AND (LOWER(e.description) LIKE LOWER($${paramIndex}) OR LOWER(COALESCE(e.notes, '')) LIKE LOWER($${paramIndex}))`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (category.trim()) {
      whereClause += ` AND ec.name ILIKE $${paramIndex}`;
      queryParams.push(`%${category.trim()}%`);
      paramIndex++;
    }

    if (paidBy.trim()) {
      whereClause += ` AND (
        LOWER(u_payer.first_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(u_payer.last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(CONCAT(u_payer.first_name, ' ', u_payer.last_name)) LIKE LOWER($${paramIndex})
      )`;
      queryParams.push(`%${paidBy.trim()}%`);
      paramIndex++;
    }

    if (dateFrom.trim()) {
      whereClause += ` AND e.expense_date >= $${paramIndex}`;
      queryParams.push(dateFrom.trim());
      paramIndex++;
    }
    if (dateTo.trim()) {
      whereClause += ` AND e.expense_date <= $${paramIndex}`;
      queryParams.push(dateTo.trim());
      paramIndex++;
    }

    if (minAmount && !isNaN(parseFloat(minAmount))) {
      whereClause += ` AND e.amount >= $${paramIndex}`;
      queryParams.push(parseFloat(minAmount));
      paramIndex++;
    }
    if (maxAmount && !isNaN(parseFloat(maxAmount))) {
      whereClause += ` AND e.amount <= $${paramIndex}`;
      queryParams.push(parseFloat(maxAmount));
      paramIndex++;
    }

    if (settlementStatus === "settled") {
      whereClause += ` AND e.is_settled = true`;
    } else if (settlementStatus === "pending") {
      whereClause += ` AND e.is_settled = false`;
    }
    const expensesQuery = `
      SELECT 
        e.id as expense_id, e.amount, e.description, e.category_id,
        e.expense_date, e.created_by, e.paid_by, e.split_type,
        e.is_settled, e.created_at, e.updated_at, e.notes,
        ec.id as category_id, ec.name as category_name, ec.description as category_description,
        ec.color as category_color, ec.icon as category_icon,
        u_payer.first_name as payer_first_name, u_payer.last_name as payer_last_name, u_payer.email as payer_email,
        u_creator.first_name as creator_first_name, u_creator.last_name as creator_last_name
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN users u_payer ON e.paid_by = u_payer.id
      LEFT JOIN users u_creator ON e.created_by = u_creator.id
      ${whereClause}
      ORDER BY e.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    console.log(`WHERE CLAUSE:${whereClause}`);
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN users u_payer ON e.paid_by = u_payer.id
      ${whereClause}
    `;

    const [expensesResult, countResult] = await Promise.all([
      client.query(expensesQuery, queryParams),
      client.query(countQuery, queryParams.slice(0, paramIndex - 1)),
    ]);

    const totalExpenses = parseInt(countResult.rows[0].total_count);
    const totalPages = Math.ceil(totalExpenses / limit);

    const responseData = {
      group,
      expenses: expensesResult.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalExpenses,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: {
        search,
        category,
        paidBy,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        settlementStatus,
        userRole,
        sortBy,
        sortOrder,
      },
    };

    try {
      const cacheTime =
        search || category || paidBy || dateFrom || dateTo ? 120 : 300;
      await cacheService.client.setEx(
        cacheKey,
        cacheTime,
        JSON.stringify(responseData)
      );
    } catch (err) {
      console.log("Cache write error:", err.message);
    }

    res.status(200).json({
      success: true,
      message: `Retrieved expenses (page ${page} of ${totalPages})`,
      data: responseData,
      fromCache: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in getGroupExpense:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve group expenses",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

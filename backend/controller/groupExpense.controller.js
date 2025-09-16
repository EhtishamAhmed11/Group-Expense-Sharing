import { pool } from "../connections/db.js";
import { cacheService } from "../utils/cache.js";

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
    console.log(`Found ${memberCount} active members in group ${group_id}`);

    const isCreatorMember = members.some((member) => member.user_id === userId);
    if (!isCreatorMember) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "You must be a member of the group to create expenses",
        timestamp: new Date().toISOString(),
      });
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

      console.log(
        `Single participant expense: ${userId} paid $${totalAmount} for themselves`
      );

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
            splitType: "equal",
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
            note: "Single participant - no actual debts created",
          },
          summary: {
            totalParticipants: 1,
            averageAmount: totalAmount,
            createdBy: userId,
            debtRelationships: 0,
            isPersonalExpense: true,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `Multiple participants: ${memberCount} total, creating debts for ${
        memberCount - 1
      } debtors`
    );

    const amountInCents = Math.round(totalAmount * 100);
    const baseAmountCents = Math.floor(amountInCents / memberCount);
    const remainderCents = amountInCents % memberCount;

    console.log(`Splitting $${totalAmount} among ${memberCount} members`);
    console.log(`Base amount: ${baseAmountCents} cents per person`);
    console.log(`Remainder: ${remainderCents} cents to distribute`);

    let payerIndex = -1;
    for (let i = 0; i < members.length; i++) {
      if (members[i].user_id === userId) {
        payerIndex = i;
        break;
      }
    }

    if (payerIndex === -1) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Expense creator must be a member of the group",
        timestamp: new Date().toISOString(),
      });
    }

    const payerExtraCent = payerIndex < remainderCents ? 1 : 0;
    const payerAmountCents = baseAmountCents + payerExtraCent;
    const payerFairShare = payerAmountCents / 100;

    console.log(
      `Payer's fair share would be: $${payerFairShare} (but they don't owe it)`
    );

    const participantInsertQuery = `
      INSERT INTO expense_participants (
        expense_id, user_id, amount_owed, percentage, is_settle, created_at
      ) VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)
    `;

    const participantRecords = [];
    let totalDebtCreated = 0;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];

      const extraCent = i < remainderCents ? 1 : 0;
      const memberAmountCents = baseAmountCents + extraCent;
      const memberAmount = memberAmountCents / 100;
      const percentage = Math.round((memberAmount / totalAmount) * 10000) / 100;

      if (member.user_id === userId) {
        participantRecords.push({
          userId: member.user_id,
          role: member.role,
          amountOwed: 0, // Payer owes nothing
          fairShare: memberAmount, // What they would owe (us k hisse me jo amount bnti thi )
          percentage: percentage,
          isPayer: true,
          netCredit: totalAmount - memberAmount,
          explanation: `Paid $${totalAmount}, fair share $${memberAmount}, net credit: $${
            totalAmount - memberAmount
          }`,
        });

        console.log(
          `PAYER ${
            member.user_id
          }: Fair share $${memberAmount}, actual debt $0, net credit $${
            totalAmount - memberAmount
          }`
        );
      } else {
        await client.query(participantInsertQuery, [
          expenseId,
          member.user_id,
          memberAmount,
          percentage,
        ]);

        participantRecords.push({
          userId: member.user_id,
          role: member.role,
          amountOwed: memberAmount,
          percentage: percentage,
          isPayer: false,
          netDebt: memberAmount,
          explanation: `Owes $${memberAmount} to the payer`,
        });

        totalDebtCreated += memberAmount;
        console.log(
          `DEBTOR ${member.user_id}: owes $${memberAmount} (${percentage}%) to payer`
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

    const allAmountsSum = participantRecords.reduce((sum, p) => {
      return sum + (p.isPayer ? p.fairShare : p.amountOwed);
    }, 0);

    if (Math.abs(allAmountsSum - totalAmount) > 0.01) {
      await client.query("ROLLBACK");
      throw new Error(
        `Math error: Individual amounts sum to $${allAmountsSum}, but total expense is $${totalAmount}`
      );
    }

    console.log(`✅ Verification passed:`);
    console.log(`  - Total expense: $${totalAmount}`);
    console.log(`  - Payer fair share: $${payerFairShare}`);
    console.log(`  - Total debt created: $${totalDebtCreated}`);
    console.log(`  - Payer net credit: $${totalAmount - payerFairShare}`);
    console.log(
      `  - Math check: $${payerFairShare} + $${totalDebtCreated} = $${
        payerFairShare + totalDebtCreated
      } ✅`
    );

    const debtRelationships = participantRecords
      .filter((p) => !p.isPayer)
      .map((p) => `${p.userId} owes payer $${p.amountOwed}`);

    console.log(`Created ${debtRelationships.length} debt relationships:`);
    debtRelationships.forEach((debt) => console.log(`  - ${debt}`));

    await client.query("COMMIT");

    try {
      const promises = [];

      promises.push(cacheService.invalidateGroupCache(group_id));

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

    const payerRecord = participantRecords.find((p) => p.isPayer);
    const debtorRecords = participantRecords.filter((p) => !p.isPayer);

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
        splitType: "equal",
        participants: participantRecords,
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
      message: "Group expense created successfully",
      data: responseData,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `✅ Successfully created group expense: ${expenseId} for $${totalAmount} split among ${memberCount} members`
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

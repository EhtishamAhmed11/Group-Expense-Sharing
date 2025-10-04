import { pool } from "../connections/db.js";
import { cacheService } from "../utils/cache.js";

export const getUserDebts = async (req, res) => {
  let client;
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
        timestamp: new Date().toISOString(),
      });
    }
    const cacheKey = `user_debts:${userId}`;

    try {
      const cachedData = await cacheService.client.get(cacheKey);
      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: "Retrieved debt summary from cache",
          data: JSON.parse(cachedData),
          fromCache: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (cacheError) {
      console.log(`Cache read error: ${cacheError.message}`);
    }
    client = await pool.connect();

    const userSummaryQuery = `
        SELECT 
            user_id,
            user_name,
            email,
            total_owed_to_user,
            total_user_owes,
            net_balance,
            total_unsettled_expenses
        FROM user_debt_summary
        WHERE user_id = $1
    `;

    const userSummaryResult = await client.query(userSummaryQuery, [userId]);

    if (userSummaryResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No debt data found for user",
        data: {
          summary: {
            totalOwedToUser: 0,
            totalUserOwes: 0,
            netBalance: 0,
            totalUnsettledExpenses: 0,
          },
          groupBalances: [],
          urgentDebts: [],
          recentActivity: [],
        },
        fromCache: false,
        timestamp: new Date().toISOString(),
      });
    }
    const userSummary = userSummaryResult.rows[0];

    const groupBalanceQuery = `
        SELECT *
FROM (
    SELECT 
        g.id as group_id,
        g.name as group_name,
        g.description as group_description,
        COALESCE(SUM(CASE
            WHEN e.paid_by = $1 AND ep.user_id != $1 AND ep.is_settle = false
            THEN ep.amount_owed
            ELSE 0
        END), 0) as owed_to_user,
        COALESCE(SUM(CASE
            WHEN ep.user_id = $1 AND e.paid_by != $1 AND ep.is_settle = false
            THEN ep.amount_owed
            ELSE 0
        END), 0) as user_owes,
        COALESCE(SUM(CASE 
            WHEN e.paid_by = $1 AND ep.user_id != $1 AND ep.is_settle = false
            THEN ep.amount_owed 
            ELSE 0 
        END), 0) - 
        COALESCE(SUM(CASE 
            WHEN ep.user_id = $1 AND e.paid_by != $1 AND ep.is_settle = false
            THEN ep.amount_owed 
            ELSE 0 
        END), 0) as net_balance,
        MAX(e.expense_date) as last_expense_date,
        COUNT(DISTINCT CASE
            WHEN (e.paid_by = $1 OR ep.user_id = $1) AND ep.is_settle = false
            THEN e.id
        END) as unsettled_expenses_count
        FROM groups g 
        JOIN expenses e ON g.id = e.group_id
        JOIN expense_participants ep ON e.id = ep.expense_id
        WHERE g.id IN (
            SELECT gm.group_id
            FROM group_members gm
            WHERE gm.user_id = $1 AND gm.is_active = true
        )
        AND e.expense_type = 'group'
        AND (e.paid_by = $1 OR ep.user_id = $1)
        GROUP BY g.id, g.name, g.description
        HAVING (COALESCE(SUM(CASE
            WHEN e.paid_by = $1 AND ep.user_id != $1 AND ep.is_settle = false
            THEN ep.amount_owed
            ELSE 0
        END),0) - COALESCE(SUM(CASE
            WHEN ep.user_id = $1 AND e.paid_by != $1 AND ep.is_settle = false
            THEN ep.amount_owed
            ELSE 0
        END),0)) != 0
        ) sub
        ORDER BY ABS(net_balance) DESC, last_expense_date DESC;

    `;

    const groupBalancesResult = await client.query(groupBalanceQuery, [userId]);

    const urgentDebtsQuery = `
    
        SELECT 
            e.id as expense_id,
            e.description as expense_description,
            e.amount as expense_amount,
            e.expense_date,
            e.created_at,
            g.id as group_id,
            g.name as group_name,

            payer.first_name || ' ' || payer.last_name as payer_name,
            payer.email as payer_email,
            e.paid_by as payer_id,
            
            --user's debt amount
            ep.amount_owed as user_debt_amount,
            ep.percentage as user_percentage,

            --Days since expense
(CURRENT_DATE - e.expense_date) as days_old

            FROM expenses e
            JOIN expense_participants ep ON e.id = ep.expense_id
            JOIN groups g ON e.group_id = g.id
            JOIN users payer ON e.paid_by = payer.id
            WHERE ep.user_id = $1
                AND ep.is_settle= false
                AND e.paid_by !=$1 -- user didnt pay (so they owe money)
                AND e.expense_type = 'group'
            ORDER BY 
                ep.amount_owed DESC, -- largest amounts first 
                e.expense_date ASC -- oldest expenses first
            LIMIT 10

    `;
    const urgentDebtsResult = await client.query(urgentDebtsQuery, [userId]);

    const recentActivityQuery = `
        SELECT 
            s.id as settlement_id,
            s.amount,
            s.description,
            s.settlement_method,
            s.status,
            s.created_at,

            --other party info (who user paid or received from)

            CASE
                WHEN s.from_user_id = $1 THEN 'paid'
                WHEN s.to_user_id = $1 THEN 'received'
            END as transaction_type,

            CASE 
                WHEN s.from_user_id = $1 THEN to_user.first_name || ' ' || to_user.last_name
                WHEN s.to_user_id = $1 THEN from_user.first_name || ' ' || from_user.last_name
            END as other_party_name,

            g.name as group_name

            FROM settlements s
            LEFT JOIN users from_user ON s.from_user_id = from_user.id
            LEFT JOIN users to_user ON s.to_user_id = to_user.id
            LEFT JOIN groups g ON s.group_id = g.id
            WHERE (s.from_user_id = $1 OR s.to_user_id =$1)
                AND s.created_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days')
            ORDER BY s.created_at DESC
            LIMIT 10
        `;
    const recentActivityResult = await client.query(recentActivityQuery, [
      userId,
    ]);

    const responseData = {
      summary: {
        totalOwedToUser: parseFloat(userSummary.total_owed_to_user) || 0,
        totalUserOwes: parseFloat(userSummary.total_user_owes) || 0,
        netBalance: parseFloat(userSummary.net_balance) || 0,
        netPosition:
          parseFloat(userSummary.net_balance) >= 0 ? "creditor" : "debtor",
        totalUnsettledExpenses:
          parseInt(userSummary.total_unsettled_expenses) || 0,
      },

      groupBalances: groupBalancesResult.rows.map((group) => ({
        groupId: group.group_id,
        groupName: group.group_name,
        groupDescription: group.group_description,
        owedToUser: parseFloat(group.owed_to_user) || 0,
        userOwes: parseFloat(group.user_owes) || 0,
        netBalance: parseFloat(group.net_balance) || 0,
        netPosition: parseFloat(group.net_balance) >= 0 ? "creditor" : "debtor",
        lastExpenseDate: group.last_expense_date,
        unsettledExpensesCount: parseInt(group.unsettled_expenses_count) || 0,
      })),

      urgentDebts: urgentDebtsResult.rows.map((debt) => ({
        expenseId: debt.expense_id,
        expenseDescription: debt.expense_description,
        expenseAmount: parseFloat(debt.expense_amount),
        expenseDate: debt.expense_date,
        groupId: debt.group_id,
        groupName: debt.group_name,
        payerName: debt.payer_name,
        payerEmail: debt.payer_email,
        payerId: debt.payer_id,
        userDebtAmount: parseFloat(debt.user_debt_amount),
        userPercentage: parseFloat(debt.user_percentage),
        daysOld: parseInt(debt.days_old),
        urgencyLevel:
          parseInt(debt.days_old) > 30
            ? "high"
            : parseInt(debt.days_old) > 14
            ? "medium"
            : "low",
      })),
      recentActivity: recentActivityResult.rows.map((activity) => ({
        settlementId: activity.settlement_id,
        amount: parseFloat(activity.amount),
        description: activity.description,
        method: activity.settlement_method,
        status: activity.status,
        createdAt: activity.created_at,
        transactionType: activity.transaction_type,
        otherPartyName: activity.other_party_name,
        groupName: activity.group_name,
      })),
    };
    try {
      await cacheService.client.setEx(
        cacheKey,
        5 * 60,
        JSON.stringify(responseData) //5 min
      );
      console.log(`Cached debt summary for user: ${userId}`);
    } catch (cacheError) {
      console.log(`Cache write error: ${cacheError.message}`);
    }

    res.status(200).json({
      success: true,
      message: "Retrieved debt summary successfully",
      data: responseData,
      fromCache: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error in getUserDebts: ${error.message}`, {
      userId: req.userId,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve debt summary",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

export const getDetailedDebts = async (req, res) => {
  let client;
  try {
    const userId = req.userId;
    const { groupId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
        timestamp: new Date().toISOString(),
      });
    }

    const cacheKey = `user_debts_detailed:${userId}:${groupId || "all"}`;

    try {
      const cachedData = await cacheService.client.get(cacheKey);
      if (cachedData) {
        return res.status(200).json({
          success: true,
          message: "Retrieved detailed debts from cache",
          data: JSON.parse(cachedData),
          fromCache: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (cacheError) {
      console.log(`Cache read error: ${cacheError.message}`);
    }
    client = await pool.connect();

    let creditorQuery = `
    SELECT 
        debtor.id as debtor_id,
        debtor.first_name || ' ' || debtor.last_name as debtor_name,
        debtor.email as debtor_email,
        debtor.profile_picture_url as debtor_profile_pic,

        g.id as group_id,
        g.name as group_name,

        --individual expense details
        e.id as expense_id,
        e.description as expense_description,
        e.amount as expense_total_amount,
        e.expense_date,
        e.created_at as expense_created_at,

        -- Debt details
        ep.amount_owed as debt_amount,
        ep.percentage as debt_percentage,
        ep.is_settle,

        -- Days overdue
        (CURRENT_DATE - e.expense_date) as days_since_expense
        
    FROM expenses e
    JOIN expense_participants ep ON e.id = ep.expense_id
    JOIN users debtor ON ep.user_id = debtor.id
    JOIN groups g ON e.group_id = g.id
    WHERE e.paid_by = $1 --user paid for these expenses
        AND ep.user_id !=$1 -- other participated
        AND ep.is_settle = false -- still unsettled
        AND e.expense_type = 'group'
    `;

    let creditorParams = [userId];

    if (groupId) {
      creditorQuery += ` AND g.id = $2`;
      creditorParams.push(groupId);
    }

    creditorQuery += `
      ORDER BY g.name, debtor.first_name, e.expense_date DESC
    `;

    let debtorQuery = `
        SELECT 
            creditor.id as creditor_id,
            creditor.first_name || ' ' || creditor.last_name as creditor_name,
            creditor.email as creditor_email,
            creditor.profile_picture_url as creditor_profile_pic,

            g.id as group_id,
            g.name as group_name,

            -- Individual expense details
        e.id as expense_id,
        e.description as expense_description,
        e.amount as expense_total_amount,
        e.expense_date,
        e.created_at as expense_created_at,
        
        -- Debt details
        ep.amount_owed as debt_amount,
        ep.percentage as debt_percentage,
        ep.is_settle,
        
        -- Days overdue
        (CURRENT_DATE - e.expense_date) as days_since_expense
        
        FROM expenses e
        JOIN expense_participants ep ON e.id = ep.expense_id
        JOIN users creditor ON e.paid_by = creditor.id
        JOIN groups g ON e.group_id = g.id
        WHERE ep.user_id = $1 -- user participated in these expenses
            AND e.paid_by != $1 -- but didn't pay for them
            AND ep.is_settle = false -- still unsettled
            AND e.expense_type = 'group'
    `;
    let debtorParams = [userId];

    if (groupId) {
      debtorQuery += ` AND g.id = $2`;
      debtorParams.push(groupId);
    }

    debtorQuery += `
      ORDER BY g.name, creditor.first_name, e.expense_date DESC
    `;

    const [creditorResult, debtorResult] = await Promise.all([
      client.query(creditorQuery, creditorParams),
      client.query(debtorQuery, debtorParams),
    ]);

    //group data by person and group

    //group people who owe user money
    const peopleWhoOweUser = {};
    creditorResult.rows.forEach((row) => {
      const key = `${row.debtor_id}_${row.group_id}`;

      if (!peopleWhoOweUser[key]) {
        peopleWhoOweUser[key] = {
          person: {
            id: row.debtor_id,
            name: row.debtor_name,
            email: row.debtor_email,
            profilePicUrl: row.debtor_profile_pic,
          },
          group: {
            id: row.group_id,
            name: row.group_name,
          },
          totalAmount: 0,
          expenseCount: 0,
          expenses: [],
        };
      }
      peopleWhoOweUser[key].totalAmount += parseFloat(row.debt_amount);
      peopleWhoOweUser[key].expenseCount++;
      peopleWhoOweUser[key].expenses.push({
        expenseId: row.expense_id,
        description: row.expense_description,
        totalAmount: parseFloat(row.expense_total_amount),
        expenseDate: row.expense_date,
        debtAmount: parseFloat(row.debt_amount),
        percentage: parseFloat(row.debt_percentage),
        daysSinceExpense: parseInt(row.days_since_expense),
        isOverdue: parseInt(row.days_since_expense) > 14,
      });
    });

    //people user owes to
    const peopleUserOwes = {};

    debtorResult.rows.forEach((row) => {
      const key = `${row.creditor_id}_${row.group_id}`;

      if (!peopleUserOwes[key]) {
        peopleUserOwes[key] = {
          person: {
            id: row.creditor_id,
            name: row.creditor_name,
            email: row.creditor_email,
            profilePicUrl: row.creditor_profile_pic,
          },
          group: {
            id: row.group_id,
            name: row.group_name,
          },
          totalAmount: 0,
          expenseCount: 0,
          expenses: [],
        };
      }
      peopleUserOwes[key].totalAmount += parseFloat(row.debt_amount);
      peopleUserOwes[key].expenseCount++;
      peopleUserOwes[key].expenses.push({
        expenseId: row.expense_id,
        description: row.expense_description,
        totalAmount: parseFloat(row.expense_total_amount),
        expenseDate: row.expense_date,
        debtAmount: parseFloat(row.debt_amount),
        percentage: parseFloat(row.debt_percentage),
        daysSinceExpense: parseInt(row.days_since_expense),
        isOverdue: parseInt(row.days_since_expense) > 14,
      });
    });

    const netBalances = {};

    //case where user OWES others
    const userOwesArray = Object.values(peopleUserOwes);

    for (let i = 0; i < userOwesArray.length; i++) {
      const debt = userOwesArray[i];

      //finding if this same person and group exists in peopleWhoOweUser array
      let reverseKey = null;
      const creditEntries = Object.keys(peopleWhoOweUser);

      for (let j = 0; j < creditEntries.length; j++) {
        const key = creditEntries[j];
        const credit = peopleWhoOweUser[key];
        if (
          credit.person.id === debt.person.id &&
          credit.group.id === debt.group.id
        ) {
          reverseKey = key;
          break; //stop once we find the match
        }
      }

      const netKey = debt.person.id + "_" + debt.group.id;

      const userOwes = debt.totalAmount; // how much the user owes
      let theyOwe = 0;
      if (reverseKey !== null) {
        theyOwe = peopleWhoOweUser[reverseKey].totalAmount;
      }
      const netAmount = theyOwe - userOwes;

      let netPosition = "settled"; //default
      if (netAmount > 0) {
        netPosition = "user_is_owed";
      } else if (netAmount < 0) {
        netPosition = "user_owes";
      }
      netBalances[netKey] = {
        person: debt.person,
        group: debt.group,
        userOwes: userOwes,
        theyOwe: theyOwe,
        netAmount: netAmount,
        netPosition: netPosition,
      };
    }

    //case where OTHERS OWE USERS (but user doesn't owe them back)

    const theyOweArray = Object.values(peopleWhoOweUser);

    for (let i = 0; i < theyOweArray.length; i++) {
      const credit = theyOweArray[i];
      const netKey = credit.person.id + "_" + credit.group.id;

      if (!netBalances[netKey]) {
        netBalances[netKey] = {
          person: credit.person,
          group: credit.group,
          userOwes: 0,
          theyOwe: credit.totalAmount,
          netAmount: credit.totalAmount,
          netPosition: "user_is_owed",
        };
      }
    }

    let totalOwedToUser = 0;
    for (const debt of Object.values(peopleWhoOweUser)) {
      totalOwedToUser += debt.totalAmount;
    }

    let totalUserOwes = 0;
    for (const debt of Object.values(peopleUserOwes)) {
      totalUserOwes += debt.totalAmount;
    }

    let netBalance = 0;
    for (const balance of Object.values(netBalances)) {
      netBalance += balance.netAmount;
    }

    const uniqueCreditors = Object.values(peopleWhoOweUser).length;
    const uniqueDebtor = Object.values(peopleUserOwes).length;

    let totalExpenseCount = 0;
    for (const debt of Object.values(peopleWhoOweUser)) {
      totalExpenseCount += debt.expenseCount;
    }
    for (const debt of Object.values(peopleUserOwes)) {
      totalExpenseCount += debt.expenseCount;
    }

    //settlement suggestions
    const settlementMessages = [];

    for (const balance of Object.values(netBalances)) {
      if (balance.netAmount < 0) {
        // User owes this person
        settlementMessages.push(
          `You owe ${balance.person.name} $${Math.abs(
            balance.netAmount
          )} in group "${balance.group.name}".`
        );
      } else if (balance.netAmount > 0) {
        // This person owes the user
        settlementMessages.push(
          `${balance.person.name} owes you $${balance.netAmount} in group "${balance.group.name}".`
        );
      } else {
        // Settled
        settlementMessages.push(
          `Your balance with ${balance.person.name} in group "${balance.group.name}" is settled.`
        );
      }
    }

    const responseData = {
      summary: {
        totalOwedToUser: totalOwedToUser,
        totalUserOwes: totalUserOwes,
        netBalance: netBalance,
        uniqueCreditors: uniqueCreditors,
        uniqueDebtor: uniqueDebtor,
        totalExpenseCount: totalExpenseCount,
      },
      netBalances: netBalances,
      peopleWhoOweUser: peopleWhoOweUser,
      peopleUserOwes: peopleUserOwes,
      settlementSuggestion: settlementMessages,
    };

    try {
      await cacheService.client.setEx(
        cacheKey,
        5 * 60,
        JSON.stringify(responseData)
      );
      console.log(`Cached detailed debts for user: ${userId}`);
    } catch (cacheError) {
      console.log(`Cache write error: ${cacheError.message}`);
    }

    res.status(200).json({
      success: true,
      message: "Retrieved detailed debt breakdown successfully",
      data: responseData,
      fromCache: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Error in getDetailedDebts: ${error.message}`, {
      userId: req.userId,
      groupId: req.params.groupId,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: "Failed to retrieve detailed debt breakdown",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

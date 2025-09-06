import { v4 as uuid } from "uuid";
import { pool } from "../connections/db.js";
import { cacheService } from "../utils/cache.js";

function getRandomHexColor() {
  const hex = Math.floor(Math.random() * 0xffffff).toString(16);
  return `#${hex.padStart(6, "0")}`;
}
export const createPersonalExpense = async (req, res) => {
  let client;
  try {
    const {
      //expense table
      amount,
      description,
      category,
      notes,
      expenseDate,
      receiptUrl,
      //personal_expense table
      isRecurring,
      recurringType,
      recurringInterval,
      recurringEndDate,
      nextDueDate,
      paymentMethod,
      location,
      tags,
    } = req.body;

    const userId = req.userId;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount is required and should be greater than 0" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({
        message: "Description is required",
      });
    }

    client = await pool.connect();

    const findCategoryQuery = `SELECT id FROM expense_categories WHERE name = $1 `;

    const categoryResult = await client.query(findCategoryQuery, [category]);

    let categoryId;

    if (categoryResult.rows.length === 0) {
      const color = getRandomHexColor();
      const addCategoryQuery = `INSERT INTO expense_categories (name,color,is_default,created_at) VALUES ($1,$2,false,CURRENT_TIMESTAMP) RETURNING id`;
      const addCategoryResult = await client.query(addCategoryQuery, [
        category,
        color,
      ]);
      categoryId = addCategoryResult.rows[0].id;
    } else {
      categoryId = categoryResult.rows[0].id;
    }

    const parsedExpenseDate = expenseDate ? new Date(expenseDate) : new Date();
    if (isNaN(parsedExpenseDate.getTime())) {
      return res.status(400).json({
        message: "Please provide a valid expense date",
      });
    }

    if (isRecurring) {
      if (
        !recurringType ||
        !["weekly", "monthly", "yearly"].includes(recurringType)
      ) {
        return res.status(400).json({
          message:
            "Valid recurring type is required for recurring expenses (weekly, monthly, yearly)",
        });
      }
      if (!recurringInterval || recurringInterval < 1) {
        return res.status(400).json({
          message: "Recurring interval must be at least 1",
        });
      }
      if (!nextDueDate) {
        return res.status(400).json({
          message: "Next due date is required for recurring expenses",
        });
      }
    }

    if (
      paymentMethod &&
      ![
        "cash",
        "credit_card",
        "debit_card",
        "digital_wallet",
        "bank_transfer",
      ].includes(paymentMethod)
    ) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    await client.query("BEGIN");

    const insertExpenseQuery = `
        INSERT INTO expenses (
        amount, 
        description, 
        category_id, 
        expense_date, 
        created_by, 
        paid_by, 
        expense_type, 
        receipt_url, 
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, amount, description, expense_date, created_at
    `;

    const expenseParameters = [
      parseFloat(amount),
      description.trim(),
      categoryId,
      parsedExpenseDate,
      userId,
      userId,
      "personal",
      receiptUrl || null,
      notes || null,
    ];
    const expenseResult = await client.query(
      insertExpenseQuery,
      expenseParameters
    );
    const newExpense = expenseResult.rows[0];
    const personalExpenseQuery = `
        INSERT INTO personal_expenses (expense_id,is_recurring,recurring_type,recurring_interval,recurring_end_date,next_due_date,payment_method,location,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id
    `;

    const personalExpenseParameters = [
      newExpense.id,
      isRecurring || false,
      isRecurring ? recurringType : null,
      isRecurring ? recurringInterval : null,
      isRecurring ? recurringEndDate || null : null,
      isRecurring ? nextDueDate : null,
      paymentMethod || null,
      location || null,
      tags || null,
    ];

    const personalExpenseResult = await client.query(
      personalExpenseQuery,
      personalExpenseParameters
    );

    const getCategoryDetail = `SELECT id,name,color FROM expense_categories WHERE id=$1`;

    const categoryDetailResult = await client.query(getCategoryDetail, [
      categoryId,
    ]);

    await client.query("COMMIT");

    try {
      await cacheService.invalidateUserExpenseCache(userId);
    } catch (cacheError) {
      console.log(
        `Cache invalidation failed for userId ${userId}:`,
        cacheError.message
      );
    }
    const newResponse = {
      id: newExpense.id,
      amount: parseFloat(newExpense.amount),
      description: description.trim(),
      category: {
        id: categoryId,
        name: categoryDetailResult.rows[0]?.name,
        color: categoryDetailResult.rows[0]?.color,
        icon: categoryDetailResult.rows[0]?.icon,
      },
      expenseDate: newExpense.expense_date,
      receiptUrl: receiptUrl || null,
      notes: notes || null,
      personalExpenseId: personalExpenseResult.rows[0].id,

      isRecurring: isRecurring || false,
      recurringType: isRecurring ? recurringType : null,
      recurringInterval: isRecurring ? recurringInterval || 1 : null,
      nextDueDate: isRecurring ? nextDueDate : null,
      recurringEndDate: isRecurring ? recurringEndDate || null : null,
      paymentMethod: paymentMethod || null,
      location: location || null,
      tags: tags || [],
      createdAt: newExpense.created_at,
    };

    res.status(201).json({
      success: true,
      message: "Personal expense created successfully",
      data: {
        expense: newResponse,
      },
      timestamp: new Date().toISOString(),
    });

    console.log(
      `Personal expense created: ${
        newExpense.id
      } by user ${userId} for $${amount} at ${new Date().toISOString()}`
    );
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Create personal expense error:", error);

    if (error.code === "23503") {
      // Foreign key constraint violation
      return res.status(400).json({
        success: false,
        message: "Invalid reference data provided",
        timestamp: new Date().toISOString(),
      });
    }

    if (error.code === "23514") {
      // Check constraint violation
      return res.status(400).json({
        success: false,
        message: "Data validation failed",
        timestamp: new Date().toISOString(),
      });
    }

    // Generic error response
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

export const getPersonalExpenses = async (req, res) => {
  let client;
  try {
    const userId = req.userId;

    const page = parseInt(req.query.page || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const {
      category,
      dateFrom,
      dateTo,
      paymentMethod,
      tags,
      recurring,
      minAmount,
      maxAmount,
      search,
    } = req.query;

    let whereConditions = ["e.created_by = $1 AND e.expense_type =$2"];
    let queryParams = [userId, "personal"];
    let paramIndex = 3;

    if (category) {
      whereConditions.push(`ec.name ILIKE ${paramIndex}`);
      queryParams.push(`%${category}`);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`e.expense_date >= ${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }
    if (dateTo) {
      whereConditions.push(`e.expense_date <= ${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }
    if (paymentMethod) {
      whereConditions.push(`pe.payment_method =${paramIndex}`);
      queryParams.push(paymentMethod);
      paramIndex++;
    }

    if (minAmount) {
      whereConditions.push(`e.amount >= ${paramIndex}`);
      queryParams.push(parseFloat(minAmount));
      paramIndex++;
    }

    if (maxAmount) {
      whereConditions.push(`e.amount <= ${paramIndex}`);
      queryParams.push(parseFloat(maxAmount));
      paramIndex++;
    }

    if (recurring !== undefined) {
      const isRecurring = recurring === "true";
      whereConditions.push(`pe.is_recurring =${paramIndex}`);
      queryParams.push(isRecurring);
      paramIndex++;
    }

    if (tags) {
      const tagsArray = tags.split(",").map((tag) => tag.trim());
      whereConditions.push(`pe.tag::text ILIKE ANY($${paramIndex})`);
      queryParams.push(tagsArray.map((tag) => `%"${tag}"%`));
    }

    if (search) {
      whereConditions.push(`(
        e.description ILIKE $${paramIndex} OR
        pe.location ILIKE $${paramIndex}
        )`);
      queryParams.push(`$${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    client = await pool.connect();

    const countQuery = `
      SELECT COUNT (*) AS total
      FROM expenses e
      LEFT JOIN personal_expenses pe ON e.id = pe.expense_id
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE ${whereClause}
    `;
    const countResult = await client.query(countQuery, queryParams);
    const totalExpenses = parseInt(countResult.rows[0]?.total);
    const totalPages = Math.ceil(totalExpenses / limit);

    const expenseQuery = `
      SELECT 
        e.id,
        e.amount,
        e.description,
        e.receipt_url,
        e.notes,
        e.created_at,
        ec.id as category_id,
        ec.name as category_name,
        ec.icon as category_icon,
        ec.color as category_color,
        pe.id as personal_expense_id,
        pe.is_recurring,
        pe.recurring_type,
        pe.recurring_interval,
        pe.next_due_date,
        pe.recurring_end_date,
        pe.payment_method,
        pe.location,
        pe.tags
      FROM expenses e
      LEFT JOIN personal_expenses pe ON e.id = pe.expense_id
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const expenseResult = await client.query(expenseQuery, queryParams);

    const expenses = expenseResult.rows.map((row) => ({
      id: row.id,
      amout: parseFloat(row.amount),
      description: row.description,
      category: {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      },
      expenseDate: row.expense_date,
      receiptUrl: row.receipt_url,
      notes: row.notes,
      personalExpenseId: row.personal_expense_id,
      isRecurring: row.is_recurring,
      recurringType: row.recurring_type,
      recurringInterval: row.recurring_interval,
      nextDueDate: row.next_due_date,
      recurringEndDate: row.recurring_end_date,
      paymentMethod: row.payment_method,
      location: row.location,
      tags: row.tags || [],
      createdAt: row.created_at,
    }));

    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amout,
      0
    );

    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      totalExpenses: totalExpenses,
      limit: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null,
    };

    res.status(200).json({
      success: true,
      data: {
        expenses,
        pagination,
        summary: {
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          count: expenses.length,
          avgAmount:
            expenses.length > 0
              ? parseFloat((totalAmount / expenses.length).toFixed(2))
              : 0,
        },
      },
      timestamp: new Date().toISOString(),
    });
    console.log(`Expense Retrieved for the userId:${userId}`);
  } catch (error) {
    console.error("Get personal expenses error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

export const getExpenseById = async (req, res) => {
  let client;
  try {
    const userId = req.userId;
    const { id } = req.params;

    client = await pool.connect();

    const expenseQuery = `
      SELECT 
      e.*,
      ec.name AS category_name,
      ec.icon AS category_icon,
      ec.color AS category_color,
      pe.*
    FROM expenses e
    LEFT JOIN personal_expenses pe ON e.id = pe.expense_id
    LEFT JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.id = $1 AND e.created_by = $2 AND e.expense_type = 'personal'
    `;
    const result = await client.query(expenseQuery, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
        timestamp: new Date().toISOString(),
      });
    }

    const row = result.rows[0];
    const expense = {
      id: row.id,
      amount: parseFloat(row.amount),
      description: row.description,
      category: {
        id: row.category_id,
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      },
      expenseDate: row.expense_date,
      receiptUrl: row.receipt_url,
      notes: row.notes,
      personalExpenseId: row.personal_expense_id,
      isRecurring: row.is_recurring,
      recurringType: row.recurring_type,
      recurringInterval: row.recurring_interval,
      nextDueDate: row.next_due_date,
      recurringEndDate: row.recurring_end_date,
      paymentMethod: row.payment_method,
      location: row.location,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.status(200).json({
      success: true,
      data: { expense },
      timestamp: new Date().toISOString(),
    });
    console.log(`Single expense by id retrieved by user:${userId}`);
  } catch (error) {
    console.error("Get expense by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

//---------------------------------------------------

export const getCategories = async (req, res) => {
  let client;
  try {
    const userId = req.userId;

    const cachekey = `categories:all`;
    const cachedCategories = await cacheService.client.get(cachekey);

    if (cachedCategories) {
      return res.status(200).json({
        success: true,
        data: {
          categories: JSON.parse(cachedCategories),
        },
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }
    client = await pool.connect();

    const categoriesQuery = `
      SELECT 
        ec.id,
        ec.name,
        ec.description,
        ec.icon,
        ec.color,
        ec.is_default,
        COUNT(e.id) AS usage_count
      FROM expense_categories ec
      LEFT JOIN expenses e ON ec.id = e.category_id AND e.created_by = $1
      GROUP BY ec.id,ec.name,ec.description,ec.icon,ec.color,ec.is_default
      ORDER BY ec.is_default DESC , usage_count DESC, ec.name ASC
    `;

    const result = await client.query(categoriesQuery, [userId]);
    const categories = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      isDefault: row.is_default,
      usageCount: parseInt(row.usage_count),
    }));

    await cacheService.client.setEx(
      cachekey,
      24 * 60 * 60,
      JSON.stringify(categories)
    );

    res.status(200).json({
      success: true,
      data: { categories },
      cached: false,
      timestamp: new Date().toISOString(),
    });
    console.log(`Categories retrieved by user:${userId} at ${new Date().toISOString()}`)
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (client) client.release();
  }
};

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
      return res.status(400).json({
        success: false,
        message: "Invalid reference data provided",
        timestamp: new Date().toISOString(),
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Data validation failed",
        timestamp: new Date().toISOString(),
      });
    }

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
      match = "any", 
    } = req.query;

    let whereConditions = ["e.created_by = $1 AND e.expense_type = $2"];
    let queryParams = [userId, "personal"];
    let paramIndex = 3;

    if (category) {
      whereConditions.push(`ec.name ILIKE $${paramIndex}`);
      queryParams.push(`%${category}%`);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`e.expense_date >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`e.expense_date <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    if (paymentMethod) {
      whereConditions.push(`pe.payment_method = $${paramIndex}`);
      queryParams.push(paymentMethod);
      paramIndex++;
    }

    if (minAmount) {
      whereConditions.push(`e.amount >= $${paramIndex}`);
      queryParams.push(parseFloat(minAmount));
      paramIndex++;
    }

    if (maxAmount) {
      whereConditions.push(`e.amount <= $${paramIndex}`);
      queryParams.push(parseFloat(maxAmount));
      paramIndex++;
    }

    if (recurring !== undefined) {
      const isRecurring = recurring === "true";
      whereConditions.push(`pe.is_recurring = $${paramIndex}`);
      queryParams.push(isRecurring);
      paramIndex++;
    }

    if (tags) {
      const tagsArray = tags.split(",").map((tag) => tag.trim());

      if (match === "all") {
        // AND: require all tags to be present
        whereConditions.push(`pe.tags @> $${paramIndex}::text[]`);
        queryParams.push(tagsArray);
      } else {
        // ANY (default): partial match with OR
        const likeTags = tagsArray.map((tag) => `%${tag}%`);
        whereConditions.push(`
          EXISTS (
            SELECT 1 FROM unnest(pe.tags) t
            WHERE t ILIKE ANY($${paramIndex})
          )
        `);
        queryParams.push(likeTags);
      }
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        e.description ILIKE $${paramIndex} OR
        pe.location ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    client = await pool.connect();

    const countQuery = `
      SELECT COUNT(*) AS total
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
        e.expense_date,
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
    }));

    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
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
    console.log(
      `Categories retrieved by user:${userId} at ${new Date().toISOString()}`
    );
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
export const getRecurringExpenses = async (req, res) => {
  let client;
  try {
    const userId = req.userId;

    client = await pool.connect();

    const recurringQuery = `
      SELECT
        e.id,
        e.amount,
        e.description,
        e.created_at,
        ec.name AS category_name,
        ec.icon AS category_icon,
        ec.color AS category_color,
        pe.recurring_type,
        pe.recurring_interval,
        pe.next_due_date,
        pe.recurring_end_date
      FROM expenses e
      JOIN personal_expenses pe ON e.id = pe.expense_id
      join expense_categories ec ON e.category_id = ec.id
      WHERE e.created_by = $1
        AND e.expense_type = 'personal'
        AND pe.is_recurring = true
        AND (pe.recurring_end_date IS NULL OR pe.recurring_end_date >= CURRENT_DATE )
      ORDER BY pe.next_due_date ASC
    `;

    const result = await client.query(recurringQuery, [userId]);

    const recurringExpenses = result.rows.map((row) => ({
      id: row.id,
      amount: parseFloat(row.amount),
      description: row.description,
      category: {
        name: row.category_name,
        icon: row.category_icon,
        color: row.category_color,
      },
      recurringType: row.recurring_type,
      recurringInterval: row.recurring_interval,
      nextDueDate: row.next_due_date,
      recurringEndDate: row.recurring_end_date,
      daysUntilDue: Math.ceil(
        (new Date(row.next_due_date) - new Date()) / (1000 * 60 * 60 * 24)
      ),
    }));

    const upcomingSoon = recurringExpenses.filter(
      (expense) => expense.daysUntilDue >= 0 && expense.daysUntilDue <= 7
    );
    res.status(200).json({
      success: true,
      data: {
        recurringExpenses,
        upcomingSoon,
        totalRecurring: recurringExpenses.length,
        upcomingCount: upcomingSoon.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get recurring expenses error:", error);
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

export const updateExpense = async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    const {
      amount,
      description,
      categoryName,
      notes,
      expenseDate,
      receiptUrl,
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

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Expense ID is required",
        timestamp: new Date().toISOString(),
      });
    }
    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount should be greater than 0",
        timestamp: new Date().toISOString(),
      });
    }

    if (description !== undefined && !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Description cannot be empty",
        timestamp: new Date().toISOString(),
      });
    }
    client = await pool.connect();

    const checkExpenseQuery = `
      SELECT e.*, pe.*
      FROM expenses e
      JOIN personal_expenses pe ON e.id = pe.expense_id
      WHERE e.id = $1 
        AND e.created_by = $2 
        AND e.expense_type = 'personal'
        AND e.deleted_at IS NULL
        AND pe.deleted_at IS NULL
    `;
    const existingExpenseResult = await client.query(checkExpenseQuery, [
      id,
      userId,
    ]);
    if (existingExpenseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found or access denied",
        timestamp: new Date().toISOString(),
      });
    }

    const existingExpense = existingExpenseResult.rows[0];

    if (isRecurring === true) {
      if (
        !recurringType ||
        ["weekly", "monthly", "yearly"].includes(recurringType)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid recurring type is required for recurring expenses (weekly, monthly, yearly)",
          timestamp: new Date().toISOString(),
        });
      }
      if (!recurringInterval || recurringInterval < 1) {
        return res.status(400).json({
          success: false,
          message: "Recurring interval must be at least 1",
          timestamp: new Date().toISOString(),
        });
      }
      if (!nextDueDate) {
        return res.status(400).json({
          success: false,
          message: "Next due date is required for recurring expenses",
          timestamp: new Date().toISOString(),
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
        success: false,
        message: "Invalid payment method",
        timestamp: new Date().toISOString(),
      });
    }
    let parsedExpenseDate;

    if (expenseDate) {
      parsedExpenseDate = new Date(expenseDate);
      if (isNaN(parsedExpenseDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid expense date",
          timestamp: new Date().toISOString(),
        });
      }
    }
    await client.query("BEGIN");

    let categoryId = existingExpense.category_id;

    if (categoryName && categoryName.trim()) {
      const findCategoryQuery = `SELECT id FROM expense_categories WHERE name = $1 AND deleted_at IS NULL`;
      const categoryResult = await client.query(findCategoryQuery, [
        categoryName.trim(),
      ]);

      if (categoryResult.rows.length === 0) {
        const color = getRandomHexColor();
        const addCategoryQuery = `
          INSERT INTO expense_categories(name,color,is_default,created_at) VALUES ($1,$2,false,CURRENT_TIMESTAMP)
          RETURNING id
        `;
        const addCategoryResult = await client.query(addCategoryQuery, [
          categoryName.trim(),
          color,
        ]);

        categoryId = addCategoryResult.rows[0].id;
      } else {
        categoryId = categoryResult.rows[0].id;
      }
    }

    const expenseUpdateFields = [];
    const expenseUpdateValues = [];

    let expenseParamIndex = 1;

    if (amount !== undefined) {
      expenseUpdateFields.push(`amount = $${expenseParamIndex}`);
      expenseUpdateValues.push(parseFloat(amount));
      expenseParamIndex++;
    }

    if (description !== undefined) {
      expenseUpdateFields.push(`description = $${expenseParamIndex}`);
      expenseUpdateValues.push(description.trim());
      expenseParamIndex++;
    }

    if (categoryName && categoryName.trim()) {
      expenseUpdateFields.push(`category_id = $${expenseParamIndex}`);
      expenseUpdateValues.push(categoryId);
      expenseParamIndex++;
    }

    if (expenseDate !== undefined) {
      expenseUpdateFields.push(`expense_date = $${expenseParamIndex}`);
      expenseUpdateValues.push(parsedExpenseDate);
      expenseParamIndex++;
    }
    if (receiptUrl !== undefined) {
      expenseUpdateFields.push(`receipt_url = $${expenseParamIndex}`);
      expenseUpdateValues.push(receiptUrl);
      expenseParamIndex++;
    }
    if (notes !== undefined) {
      expenseUpdateFields.push(`notes = $${expenseParamIndex}`);
      expenseUpdateValues.push(notes);
      expenseParamIndex++;
    }

    expenseUpdateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (expenseUpdateFields.length > 1) {
      expenseUpdateValues.push(id, userId);
      const updateExpenseQuery = `
        UPDATE expenses
        SET ${expenseUpdateFields.join(", ")}
        WHERE id = $${expenseParamIndex} AND created_by = $${
        expenseParamIndex + 1
      } RETURNING id ,amount , description,expense_date,updated_at
      `;

      await client.query(updateExpenseQuery, expenseUpdateValues);
    }
    const personalExpenseUpdateFields = [];
    const personalExpenseUpdateValues = [];
    let personalParamIndex = 1;

    if (isRecurring !== undefined) {
      personalExpenseUpdateFields.push(`is_recurring=$${personalParamIndex}`);
      personalExpenseUpdateValues.push(isRecurring);
      personalParamIndex++;

      if (isRecurring === false) {
        personalExpenseUpdateFields.push(`recurring_type = NULL`);
        personalExpenseUpdateFields.push(`recurring_interval = NULL`);
        personalExpenseUpdateFields.push(`recurring_end_date = NULL`);
        personalExpenseUpdateFields.push(`next_due_date = NULL`);
      } else {
        if (recurringType !== undefined) {
          personalExpenseUpdateFields.push(
            `recurring_type = $${personalParamIndex}`
          );
          personalExpenseUpdateValues.push(recurringType);
          personalParamIndex++;
        }
        if (recurringInterval !== undefined) {
          personalExpenseUpdateFields.push(
            `recurring_interval = $${personalParamIndex}`
          );
          personalExpenseUpdateValues.push(recurringInterval);
          personalParamIndex++;
        }
        if (recurringEndDate !== undefined) {
          personalExpenseUpdateFields.push(
            `recurring_end_date = $${personalParamIndex}`
          );
          personalExpenseUpdateValues.push(recurringEndDate);
          personalParamIndex++;
        }
        if (nextDueDate !== undefined) {
          personalExpenseUpdateFields.push(
            `next_due_date = $${personalParamIndex}`
          );
          personalExpenseUpdateValues.push(nextDueDate);
          personalParamIndex++;
        }
      }
    } else {
      if (recurringType !== undefined) {
        personalExpenseUpdateFields.push(
          `recurring_type = $${personalParamIndex}`
        );
        personalExpenseUpdateValues.push(recurringType);
        personalParamIndex++;
      }
      if (recurringInterval !== undefined) {
        personalExpenseUpdateFields.push(
          `recurring_interval = $${personalParamIndex}`
        );
        personalExpenseUpdateValues.push(recurringInterval);
        personalParamIndex++;
      }
      if (recurringEndDate !== undefined) {
        personalExpenseUpdateFields.push(
          `recurring_end_date = $${personalParamIndex}`
        );
        personalExpenseUpdateValues.push(recurringEndDate);
        personalParamIndex++;
      }
      if (nextDueDate !== undefined) {
        personalExpenseUpdateFields.push(
          `next_due_date = $${personalParamIndex}`
        );
        personalExpenseUpdateValues.push(nextDueDate);
        personalParamIndex++;
      }
    }
    if (paymentMethod !== undefined) {
      personalExpenseUpdateFields.push(
        `payment_method = $${personalParamIndex}`
      );
      personalExpenseUpdateValues.push(paymentMethod);
      personalParamIndex++;
    }

    if (location !== undefined) {
      personalExpenseUpdateFields.push(`location = $${personalParamIndex}`);
      personalExpenseUpdateValues.push(location);
      personalParamIndex++;
    }

    if (tags !== undefined) {
      personalExpenseUpdateFields.push(`tags = $${personalParamIndex}`);
      personalExpenseUpdateValues.push(tags);
      personalParamIndex++;
    }
    personalExpenseUpdateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (personalExpenseUpdateFields.length > 1) {
      personalExpenseUpdateValues.push(id);
      const updatedPersonalExpenseQuery = `
        UPDATE personal_expenses
        SET ${personalExpenseUpdateFields.join(", ")}
        WHERE expense_id = $${personalParamIndex}
      `;

      await client.query(
        updatedPersonalExpenseQuery,
        personalExpenseUpdateValues
      );
    }

    const getUpdatedExpenseQuery = `
      SELECT 
        e.id,
        e.amount,
        e.description,
        e.expense_date,
        e.receipt_url,
        e.notes,
        e.created_at,
        e.updated_at,
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
      JOIN personal_expenses pe ON e.id = pe.expense_id
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.id = $1 AND e.created_by = $2
    `;
    const updatedExpenseResult = await client.query(getUpdatedExpenseQuery, [
      id,
      userId,
    ]);
    const updatedExpense = updatedExpenseResult.rows[0];

    await client.query("COMMIT");

    try {
      await cacheService.invalidateUserExpenseCache(userId);
      await cacheService.client.del(`categories:all`);
    } catch (error) {
      console.log(
        `Cache invalidation failed for userId ${userId}:`,
        cacheError.message
      );
    }
    const responseExpense = {
      id: updatedExpense.id,
      amount: parseFloat(updatedExpense.amount),
      description: updatedExpense.description,
      category: {
        id: updatedExpense.category_id,
        name: updatedExpense.category_name,
        icon: updatedExpense.category_icon,
        color: updatedExpense.category_color,
      },
      expenseDate: updatedExpense.expense_date,
      receiptUrl: updatedExpense.receipt_url,
      notes: updatedExpense.notes,
      personalExpenseId: updatedExpense.personal_expense_id,
      isRecurring: updatedExpense.is_recurring,
      recurringType: updatedExpense.recurring_type,
      recurringInterval: updatedExpense.recurring_interval,
      nextDueDate: updatedExpense.next_due_date,
      recurringEndDate: updatedExpense.recurring_end_date,
      paymentMethod: updatedExpense.payment_method,
      location: updatedExpense.location,
      tags: updatedExpense.tags || [],
      createdAt: updatedExpense.created_at,
      updatedAt: updatedExpense.updated_at,
    };

    res.status(200).json({
      success: true,
      message: "Personal expense updated successfully",
      data: {
        expense: responseExpense,
      },
      timestamp: new Date().toISOString(),
    });
    console.log(
      `Personal expense updated: ${id} by user ${userId} at ${new Date().toISOString()}`
    );
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }
    console.error("Update personal expense error:", error);
    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid reference data provided",
        timestamp: new Date().toISOString(),
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Data validation failed",
        timestamp: new Date().toISOString(),
      });
    }

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

export const deleteExpense = async (req, res) => {
  let client;

  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Expense ID is required",
        timestamp: new Date().toISOString(),
      });
    }
    client = await pool.connect();
    const checkExpenseQuery = `
      SELECT e.id, e.description, e.amount, pe.id as personal_expense_id
      FROM expenses e
      JOIN personal_expenses pe ON e.id = pe.expense_id
      WHERE e.id = $1 
        AND e.created_by = $2 
        AND e.expense_type = 'personal'
        AND e.deleted_at IS NULL
        AND pe.deleted_at IS NULL
    `;
    const existingExpenseResult = await client.query(checkExpenseQuery, [
      id,
      userId,
    ]);
    if (existingExpenseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Expense not found or access denied",
        timestamp: new Date().toISOString(),
      });
    }
    const existingExpense = existingExpenseResult.rows[0];

    await client.query("BEGIN");

    const deleteExpenseQuery = `
      UPDATE expenses 
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND created_by = $2
    `;
    await client.query(deleteExpenseQuery, [id, userId]);

    const deletePersonalExpenseQuery = `
      UPDATE personal_expenses 
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE expense_id = $1
    `;
    await client.query(deletePersonalExpenseQuery, [id]);

    await client.query("COMMIT");

    try {
      await cacheService.invalidateUserExpenseCache(userId);
    } catch (cacheError) {
      console.log(
        `Cache invalidation failed for userId ${userId}:`,
        cacheError.message
      );
    }
    res.status(200).json({
      success: true,
      message: "Personal expense deleted successfully",
      data: {
        deletedExpenseId: id,
        deletedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
    console.log(
      `Personal expense deleted: ${id} (${existingExpense.description} - $${
        existingExpense.amount
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
    console.error("Delete personal expense error:", error);

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

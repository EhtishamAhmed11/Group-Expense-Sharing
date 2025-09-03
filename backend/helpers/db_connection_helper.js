import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

export const dbQuery = async (pool, query, params = []) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(query, params);
    return {
      success: true,
      data: result.rows,
      rowCount: result.rowCount,
      error: null,
    };
  } catch (error) {
    console.error("Database query error:", error.message);
    return {
      success: false,
      data: null,
      rowCount: 0,
      error: error.message,
    };
  } finally {
    if (client) client.release();
  }
};

export const dbTransaction = async (pool, callback) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const result = await callback(client)
    await client.query("COMMIT");
    return {
      success: true,
      data: result,
      error: null,
    };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Transaction error:', error);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }finally{
    if (client) client.release();
  }
};

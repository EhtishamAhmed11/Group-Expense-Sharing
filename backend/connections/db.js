import { Client, Pool } from "pg";

export const pool = new Pool({
  connectionString: "postgresql://postgres:0000@localhost:5432/expenseSharing",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "0000",
  database: "expenseSharing",
});

export const connectDB = async () => {
  try {
    await client.connect();
    console.log(`Connected to Database:${client.database}`);
  } catch (error) {
    console.log(`Error connecting Database:${error.message}`);
  }
};


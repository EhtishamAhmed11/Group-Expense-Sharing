import { Client, Pool } from "pg";

const connectionString = `postgresql://${process.env.DB_USER}:${String(
  process.env.DB_PASSWORD
)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

export const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
});

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: parseInt(process.env.DB_PORT),
  password: String(process.env.DB_PASSWORD), // Explicit string conversion
  database: process.env.DB_NAME,
});
console.log("=== Environment Variables Debug ===");
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_NAME:", process.env.DB_NAME);
console.log(
  "All env keys containing DB:",
  Object.keys(process.env).filter((key) => key.includes("DB"))
);
export const connectDB = async () => {
  try {
    await client.connect();
    console.log(`Connected to Database: ${client.database}`);
  } catch (error) {
    console.log(`Error connecting Database: ${error.message}`);
  }
};

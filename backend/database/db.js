import { Client } from "pg";

const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "0000",
  database: "expenseSharing",
});

const connectDB = async () => {
  try {
    await client.connect();
    console.log(`Connected to Database:${client.database}`);
  } catch (error) {
    console.log(`Error connecting Database:${error.message}`);
  }
};

export default connectDB;

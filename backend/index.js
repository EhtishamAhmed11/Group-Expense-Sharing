import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./connections/db.js";
import { connectRedis, testRedis } from "./connections/connection.redis.js";
import authRoutes from "./routes/authentication.routes.js";
import userRoutes from "./routes/user.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import groupRoutes from "./routes/groups.routes.js";
import groupExpenseRoutes from "./routes/groupExpense.routes.js";
import debtRoutes from "./routes/debt.routes.js";
import settlementRoutes from "./routes/settlements.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["POST", "GET", "PATCH", "PUT", "DELETE"],
    credentials: true,
  })
);
const PORT = process.env.PORT;

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/expense", expenseRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/group-expense", groupExpenseRoutes);
app.use("/api/debt", debtRoutes);
app.use("/api/settlements", settlementRoutes);
app.get("/helper", (_, res) => {
  try {
    res.status(200).json({ message: "API is working" });
  } catch (error) {
    console.log(`Error in Helper Route:${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  try {
    console.log(`Server is listening on PORT:${PORT}`);
    connectDB();
    connectRedis();
  } catch (error) {
    console.log(`Error Starting Server:${error.message}`);
  }
});

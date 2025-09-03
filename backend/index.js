import express from "express";
import dotenv from "dotenv";
import {connectDB} from "./connections/db.js";
import { connectRedis, testRedis } from "./connections/connection.redis.js";
import authRoutes from "./routes/authentication.routes.js";
import cookieParser from "cookie-parser";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT;

app.use("/api/auth", authRoutes);
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

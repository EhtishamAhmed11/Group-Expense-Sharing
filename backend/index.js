import express from "express";
import dotenv from "dotenv";
import connectDB from "./database/db.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT;
app.get("/helper", (req, res) => {
  try {
    res.status(200).json({ message: "API is working" });
  } catch (error) {
    console.log(`Error in Helper Route:${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.listen(PORT, () => {
  try {
    connectDB();
    console.log(`Server is listening on PORT:${PORT}`);
  } catch (error) {
    console.log(`Error Starting Server:${error.message}`);
  }
});

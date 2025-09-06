import express from "express";
import {
  createPersonalExpense,
  getCategories,
  getExpenseById,
  getPersonalExpenses,
} from "../controller/expense.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";

const router = express.Router();

router.route("/create").post(authenticate, createPersonalExpense);
router.route("/get-expenses").get(authenticate, getPersonalExpenses);
router.route("/get-categories").get(authenticate, getCategories);
router.route("/get-expense/:id").get(authenticate, getExpenseById);
export default router;

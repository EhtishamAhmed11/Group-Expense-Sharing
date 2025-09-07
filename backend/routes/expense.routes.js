import express from "express";
import {
  createPersonalExpense,
  deleteExpense,
  getCategories,
  getExpenseById,
  getPersonalExpenses,
  getRecurringExpenses,
  updateExpense,
} from "../controller/expense.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";

const router = express.Router();

router.route("/create").post(authenticate, createPersonalExpense);
router.route("/get-expenses").get(authenticate, getPersonalExpenses);
router.route("/get-categories").get(authenticate, getCategories);
router.route("/get-expense/:id").get(authenticate, getExpenseById);
router.route("/get-recurring-expenses").get(authenticate, getRecurringExpenses);
router.route("/update-expense/:id").patch(authenticate, updateExpense);
router.route("/delete-expense/:id").delete(authenticate, deleteExpense);

export default router;

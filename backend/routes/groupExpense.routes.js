import express from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { groupMemberAuth } from "../middlewares/memberValidation.middleware.js";
import {
  createGroupExpense,
  getGroupExpense,
} from "../controller/groupExpense.controller.js";

const router = express.Router();

router.route("/create").post(authenticate, groupMemberAuth, createGroupExpense);
router
  .route("/:groupId/expenses")
  .get(authenticate, groupMemberAuth, getGroupExpense);
export default router;

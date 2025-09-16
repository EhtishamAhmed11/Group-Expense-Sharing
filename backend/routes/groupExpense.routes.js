import express from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { groupMemberAuth } from "../middlewares/memberValidation.middleware.js";
import { createGroupExpense } from "../controller/groupExpense.controller.js";

const router = express.Router();

router.route("/create").post(authenticate, groupMemberAuth, createGroupExpense);
export default router;

import express from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import {
  getDetailedDebts,
  getUserDebts,
} from "../controller/debt.controller.js";
import { groupMemberAuth } from "../middlewares/memberValidation.middleware.js";

const router = express.Router();

router.route("/").get(authenticate, getUserDebts);
router
  .route("/:groupId/detailed")
  .get(authenticate, groupMemberAuth, getDetailedDebts);

export default router;

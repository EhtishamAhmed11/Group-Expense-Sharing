import express from "express";
import {
  confirmSettlement,
  getSettlementDetails,
  getSettlementHistory,
  settleDebt,
} from "../controller/settlement.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { groupMemberAuth } from "../middlewares/memberValidation.middleware.js";
const router = express.Router();

// =====================================================
// SETTLEMENT CREATION ROUTES
// =====================================================

// POST /api/debts/settle/:groupId/:toUserId - Create new settlement
router.post(
  "/settle/:groupId/:toUserId",
  authenticate,
  groupMemberAuth,
  settleDebt
);

// =====================================================
// SETTLEMENT CONFIRMATION ROUTES
// =====================================================

// PUT /api/settlements/:id/confirm - Confirm or dispute a settlement
router.put("/:id/confirm", authenticate, confirmSettlement);

// =====================================================
// SETTLEMENT HISTORY & DETAILS ROUTES
// =====================================================

// GET /api/settlements - Get settlement history with filtering & pagination
router.get("/settlements", authenticate, getSettlementHistory);

// GET /api/settlements/:id - Get specific settlement details
router.get("/settlements/:id", authenticate, getSettlementDetails);

export default router;

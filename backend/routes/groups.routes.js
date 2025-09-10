import express from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import {
  createGroup,
  getGroupDetail,
  getGroupMemberList,
  getMemberCount,
  getUserGroups,
  joinGroup,
  leaveGroup,
} from "../controller/group.controller.js";
import { groupMemberAuth } from "../middlewares/memberValidation.middleware.js";
const router = express.Router();

router.route("/create").post(authenticate, createGroup);
router.route("/join/:id").post(authenticate, joinGroup);
router.route("/get-user-groups").get(authenticate, getUserGroups);
router.route("/:id").get(authenticate, groupMemberAuth, getGroupDetail);
router
  .route("/members/:id")
  .get(authenticate, groupMemberAuth, getGroupMemberList);
router
  .route("/members-count/:id")
  .get(authenticate, groupMemberAuth, getMemberCount);
router.route("/leave/:id").post(authenticate, groupMemberAuth, leaveGroup);
export default router;

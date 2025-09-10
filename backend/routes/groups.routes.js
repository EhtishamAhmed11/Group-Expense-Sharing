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
  transferGroupOwnership,
  updateGroup,
} from "../controller/group.controller.js";
import {
  groupAdminAuth,
  groupMemberAuth,
} from "../middlewares/memberValidation.middleware.js";
const router = express.Router();

//create group
router.route("/create").post(authenticate, createGroup);

//join group
router.route("/join/:id").post(authenticate, joinGroup);

//get user groups (requires membership)
router
  .route("/get-user-groups")
  .get(authenticate, groupMemberAuth, getUserGroups);

//get group details
router.route("/:id").get(authenticate, groupMemberAuth, getGroupDetail);

//get group members
router
  .route("/members/:id")
  .get(authenticate, groupMemberAuth, getGroupMemberList);

//get member count
router
  .route("/members-count/:id")
  .get(authenticate, groupMemberAuth, getMemberCount);

//update group (admin only)
router.route("/:id").patch(authenticate, groupAdminAuth, updateGroup);

//leave group (member )
router.route("/:id/leave").delete(authenticate, groupMemberAuth, leaveGroup);

//transfer ownership (creator)
router
  .route("/:id/transfer-ownership")
  .post(authenticate, groupMemberAuth, transferGroupOwnership);
export default router;

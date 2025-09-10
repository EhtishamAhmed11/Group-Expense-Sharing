import express from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import {
  createGroup,
  getGroupDetail,
  getUserGroups,
  joinGroup,
} from "../controller/group.controller.js";
import { groupMemberAuth } from "../middlewares/memberValidation.middleware.js";
const router = express.Router();

router.route("/create").post(authenticate, createGroup);
router.route("/get-user-groups").get(authenticate, getUserGroups);
router.route("/:id").get(authenticate, groupMemberAuth, getGroupDetail);
router.route("/join/:id").post(authenticate, joinGroup);
export default router;

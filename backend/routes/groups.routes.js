import express from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import {
  createGroup,
  getGroupDetail,
  getUserGroups,
} from "../controller/group.controller.js";
const router = express.Router();

router.route("/create").post(authenticate, createGroup);
router.route("/get-user-groups").get(authenticate, getUserGroups);
router.route("/:id").get(authenticate, getGroupDetail);
export default router;

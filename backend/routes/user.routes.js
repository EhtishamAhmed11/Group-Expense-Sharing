import express from "express";
import { authenticate } from "../middlewares/authentication.middleware.js";
import { getUserProfile } from "../controller/user.controller.js";

const router = express.Router();

router.route("/profile").get(authenticate, getUserProfile);

export default router;

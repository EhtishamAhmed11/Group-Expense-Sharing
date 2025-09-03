import express from "express";
import {
  checkAuthController,
  login,
  register,
} from "../controller/authentication.controller.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/verify").get(checkAuthController);
export default router;

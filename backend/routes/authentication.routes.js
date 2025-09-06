import express from "express";
import {
  // changePassword,
  checkAuthController,
  login,
  register,
  updateProfile,
} from "../controller/authentication.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/verify").get(authenticate, checkAuthController);
router.route("/updateProfile").put(authenticate, updateProfile);
// router.route('/changePassword').post(authenticate, changePassword); to be implemented
export default router;

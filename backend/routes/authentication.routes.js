import express from "express";
import {
  // changePassword,
  checkAuthController,
  checkTokenStatus,
  login,
  logout,
  register,
  updateProfile,
} from "../controller/authentication.controller.js";
import { authenticate } from "../middlewares/authentication.middleware.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").post(logout);
router.route("/verify").get(authenticate, checkAuthController);
router.route("/updateProfile").put(authenticate, updateProfile);
router.route("/token-status").get(checkTokenStatus);

// router.route('/changePassword').post(authenticate, changePassword); to be implemented
export default router;

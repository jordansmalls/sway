import express from "express";
import {
    createUserAccount,
    createUsername,
    checkUsernameAvailability,
    checkEmailAvailability,
    loginUserAccount,
    logoutUserAccount,
} from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import { credentialIpLimiter, loginLimiter, signupLimiter } from "../middlewares/rate-limiters/auth.limiter";
import { djLimiter } from "../middlewares/rate-limiters/dj.limiter";
import { publicReadLimiter } from "../middlewares/rate-limiters/public-read.limiter";
import { forgotPassword, completePasswordReset } from "../controllers/password-reset.controller";
import { passwordResetAttemptLimiter, passwordResetIpLimiter, passwordResetRequestLimiter } from "../middlewares/rate-limiters/auth.limiter";

const router = express.Router();

router.post("/forgot-password", passwordResetIpLimiter, passwordResetRequestLimiter, forgotPassword);
router.post("/reset-password", passwordResetAttemptLimiter, completePasswordReset);

/**
 * @desc    Create user account
 * @route   POST /api/auth
 * @access  PUBLIC
 */
router.post("/", credentialIpLimiter, signupLimiter, createUserAccount);

/**
 * @desc    Create username
 * @route   POST /api/auth/username
 * @access  PRIVATE
 */
router.post("/username", protect, djLimiter, createUsername);

/**
 * @desc    Check username availability
 * @route   GET /api/auth/username/:username
 * @access  PUBLIC
 */
router.get("/username/:username", publicReadLimiter, checkUsernameAvailability);

/**
 * @desc    Check email availability
 * @route   GET /api/auth/email/:email
 * @access  PUBLIC
 */
router.get("/email/:email", publicReadLimiter, checkEmailAvailability);

/**
 * @desc    Log in user
 * @route   POST /api/auth/login
 * @access  PUBLIC
 */
router.post("/login", credentialIpLimiter, loginLimiter, loginUserAccount);

/**
 * @desc    Log out user
 * @route   POST /api/auth/logout
 * @access  PUBLIC
 */
router.post("/logout", logoutUserAccount);

export default router;

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
import { credentialIpLimiter, credentialLimiter } from "../middlewares/rate-limiters/auth.limiter";
import { djLimiter } from "../middlewares/rate-limiters/dj.limiter";
import { publicReadLimiter } from "../middlewares/rate-limiters/public-read.limiter";

const router = express.Router();

/**
 * @desc    Create user account
 * @route   POST /api/auth
 * @access  PUBLIC
 */
router.post("/", credentialIpLimiter, credentialLimiter, createUserAccount);

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
router.post("/login", credentialIpLimiter, credentialLimiter, loginUserAccount);

/**
 * @desc    Log out user
 * @route   POST /api/auth/logout
 * @access  PUBLIC
 */
router.post("/logout", logoutUserAccount);

export default router;

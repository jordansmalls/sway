import express from "express"
import {
    createUserAccount,
    createUsername,
    checkUsernameAvailability,
    checkEmailAvailability,
    loginUserAccount,
    logoutUserAccount
 } from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import generalLimiter from "../utils/general.rate.limiter";

 const router = express.Router();
 router.use(generalLimiter)


/**
 * @desc    Create user account
 * @route   POST /api/auth
 * @access  PUBLIC
 */
router.post("/", createUserAccount)



/**
 * @desc    Create username
 * @route   POST /api/auth/username
 * @access  PRIVATE
 */
router.post("/username", protect, createUsername)


/**
 * @desc    Check username availability
 * @route   GET /api/auth/username/:username
 * @access  PUBLIC
 */
router.get("/username/:username", checkUsernameAvailability)


/**
 * @desc    Check email availability
 * @route   GET /api/auth/email/:email
 * @access  PUBLIC
 */
router.get("/email/:email", checkEmailAvailability)


/**
 * @desc    Log in user
 * @route   POST /api/auth/login
 * @access  PUBLIC
 */
router.post("/login", loginUserAccount)


/**
 * @desc    Log out user
 * @route   POST /api/auth/logout
 * @access  PUBLIC
 */
router.post("/logout", logoutUserAccount)

export default router;
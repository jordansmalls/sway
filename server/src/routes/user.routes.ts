import express from "express";
import { protect } from "../middlewares/auth.middleware";
import {
    updateProfile,
    updatePassword,
    getUserProfile,
    deleteAccount,
    fetchUserActiveRoom,
    fetchUserHasActiveRoom,
    fetchUserInactiveRooms,
    fetchUserId,
} from "../controllers/user.controller";
import { djLimiter } from "../middlewares/rate-limiters/dj.limiter";
import { publicReadLimiter } from "../middlewares/rate-limiters/public-read.limiter";

const router = express.Router();

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  PRIVATE
 */

router.put("/profile", protect, djLimiter, updateProfile);

/**
 * @desc    Update user password
 * @route   POST /api/users/password
 * @access  PRIVATE
 */
router.post("/password", protect, djLimiter, updatePassword);

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  PRIVATE
 */
router.get("/me", protect, djLimiter, getUserProfile);

/**
 * @desc    Delete user account (toggle active prop)
 * @route   DELETE /api/users/profile
 * @access  PRIVATE
 */
router.delete("/profile", protect, djLimiter, deleteAccount);

/**
 * @desc    Fetch User's active room
 * @route   GET /api/users/:userId/rooms/active
 * @access  PUBLIC
 */
router.get("/:userId/rooms/active", publicReadLimiter, fetchUserActiveRoom);

/**
 * @desc    Fetch a User's hasActiveRoom value
 * @route   GET /api/users/:userId/has-active-room
 * @access  PRIVATE
 */
router.get("/:userId/has-active-room", protect, djLimiter, fetchUserHasActiveRoom);

/**
 * @desc    Fetch User Inactive Rooms
 * @route   GET /api/users/:userId/inactive
 * @access  PRIVATE
 */
router.get("/:userId/inactive", protect, djLimiter, fetchUserInactiveRooms);


/**
 * @desc    Fetch User ID
 * @route   GET /api/users/:username/id
 * @access  PUBLIC
 */
router.get("/:username/id", publicReadLimiter, fetchUserId);

export default router;

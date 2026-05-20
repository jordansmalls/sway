import express from "express"
import { protect } from "../middlewares/auth.middleware";
import {
    updateProfile,
    updatePassword,
    getUserProfile,
    deleteAccount,
    fetchUserActiveRoom,
    fetchUserHasActiveRoom,
    fetchUserInactiveRooms,

} from "../controllers/user.controller"
import generalLimiter from "../middlewares/rate-limiters/general.limiter";

const router = express.Router()
router.use(generalLimiter)

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  PRIVATE
 */

router.put("/profile", protect, updateProfile)

/**
 * @desc    Update user password
 * @route   POST /api/users/password
 * @access  PRIVATE
 */
router.post("/password", protect, updatePassword);


/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  PRIVATE
 */
router.get("/me", protect, getUserProfile);

/**
 * @desc    Delete user account (toggle active prop)
 * @route   DELETE /api/users/profile
 * @access  PRIVATE
 */
router.delete("/profile", protect, deleteAccount);


/**
 * @desc    Fetch User's active room
 * @route   GET /api/users/:userId/rooms/active
 * @access  PUBLIC
 */
router.get("/:userId/rooms/active", fetchUserActiveRoom)



/**
 * @desc    Fetch a User's hasActiveRoom value
 * @route   GET /api/users/:userId/has-active-room
 * @access  PRIVATE
 */
router.get("/:userId/has-active-room", protect, fetchUserHasActiveRoom)



/**
 * @desc    Fetch User Inactive Rooms
 * @route   GET /api/users/:userId/inactive
 * @access  PRIVATE
 */
router.get("/:userId/inactive", protect, fetchUserInactiveRooms)



export default router;
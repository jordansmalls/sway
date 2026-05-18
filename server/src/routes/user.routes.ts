import express from "express"
import { protect } from "../middlewares/auth.middleware";
import {
    updateProfile,
    updatePassword,
    getUserProfile,
    deleteAccount
} from "../controllers/user.controller"

const router = express.Router()


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



export default router;
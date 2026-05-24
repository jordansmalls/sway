import express from "express";
import { protect } from "../middlewares/auth.middleware";
import { fetchRootRoute, fetchServerHealth } from "../controllers/health.controller";

const router = express.Router();

/**
 * @desc    Fetch Root route
 * @route   GET /
 * @access  PUBLIC
 */

router.get("/", fetchRootRoute);

/**
 * @desc    Fetch server health
 * @route   GET /server/health/admin
 * @access  PRIVATE
 */

router.get("/server/health/admin", protect, fetchServerHealth);

export default router;

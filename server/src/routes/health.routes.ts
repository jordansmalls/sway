import express from "express";
import { protect } from "../middlewares/auth.middleware";
import { fetchReadiness, fetchRootRoute, fetchServerHealth } from "../controllers/health.controller";

const router = express.Router();

/**
 * @desc    Fetch Root route
 * @route   GET /
 * @access  PUBLIC
 */

router.get("/", fetchRootRoute);

/**
 * @desc    Readiness check (200 once MongoDB is connected, 503 otherwise or while shutting down)
 * @route   GET /health/ready
 * @access  PUBLIC
 */

router.get("/health/ready", fetchReadiness);

/**
 * @desc    Fetch server health
 * @route   GET /server/health/admin
 * @access  PRIVATE
 */

router.get("/server/health/admin", protect, fetchServerHealth);

export default router;

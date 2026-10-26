import express from "express";
import { protect } from "../middlewares/auth.middleware";
import { djLimiter } from "../middlewares/rate-limiters/dj.limiter";
import {
    exportTracklistJson,
    exportTracklistCsv,
    exportTracklistTxt,
    exportRoomRequestsJson,
    exportRoomRequestsCsv,
    exportRoomRequestsTxt,
} from "../controllers/export.controller";

const router = express.Router();


/**
 * @desc    Export Room Tracklist JSON (Played songs only)
 * @route   GET /api/exports/:roomId/tracklist/json
 * @access  PRIVATE
 */
router.get("/:roomId/tracklist/json", protect, djLimiter, exportTracklistJson);

/**
 * @desc    Export Room Tracklist CSV (Played songs only)
 * @route   GET /api/exports/:roomId/tracklist/csv
 * @access  PRIVATE
 */

router.get("/:roomId/tracklist/csv", protect, djLimiter, exportTracklistCsv);

/**
 * @desc    Export Room Tracklist Plain text (Played songs only)
 * @route   GET /api/exports/:roomId/tracklist/txt
 * @access  PRIVATE
 */

router.get("/:roomId/tracklist/txt", protect, djLimiter, exportTracklistTxt);

/**
 * @desc    Exporting a Room's Requests as JSON
 * @route   GET /api/exports/:roomCode/export/json
 * @access  PRIVATE
 */
router.get("/:roomCode/export/json", protect, djLimiter, exportRoomRequestsJson);

/**
 * @desc    Exporting a Room's Requests as CSV
 * @route   GET /api/exports/:roomCode/export/csv
 * @access  PRIVATE
 */
router.get("/:roomCode/export/csv", protect, djLimiter, exportRoomRequestsCsv);

/**
 * @desc    Exporting a Room's Requests as Plain text
 * @route   GET /api/exports/:roomCode/export/txt
 * @access  PRIVATE
 */
router.get("/:roomCode/export/txt", protect, djLimiter, exportRoomRequestsTxt);

export default router;

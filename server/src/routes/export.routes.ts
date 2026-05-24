import express from "express";
import { protect } from "../middlewares/auth.middleware";
import generalLimiter from "../middlewares/rate-limiters/general.limiter";
import {
    exportTracklistJson,
    exportTracklistCsv,
    exportTracklistTxt,
    exportRoomRequestsJson,
    exportRoomRequestsCsv,
    exportRoomRequestsTxt
 } from "../controllers/export.controller";

const router = express.Router();

router.use(generalLimiter)


/**
 * @desc    Export Room Tracklist JSON (Played songs only)
 * @route   GET /api/exports/:roomId/tracklist/json
 * @access  PRIVATE
 */
router.get("/:roomId/tracklist/json", protect, exportTracklistJson)


/**
 * @desc    Export Room Tracklist CSV (Played songs only)
 * @route   GET /api/exports/:roomId/tracklist/csv
 * @access  PRIVATE
 */

router.get("/:roomId/tracklist/csv", protect, exportTracklistCsv)


/**
 * @desc    Export Room Tracklist Plain text (Played songs only)
 * @route   GET /api/exports/:roomId/tracklist/txt
 * @access  PRIVATE
 */

router.get("/:roomId/tracklist/txt", protect, exportTracklistTxt)


/**
 * @desc    Exporting a Room's Requests as JSON
 * @route   GET /api/exports/:roomCode/export/json
 * @access  PUBLIC
 */
router.get("/:roomCode/export/json", exportRoomRequestsJson)



/**
 * @desc    Exporting a Room's Requests as CSV
 * @route   GET /api/exports/:roomCode/export/csv
 * @access  PUBLIC
 */
router.get("/:roomCode/export/json", exportRoomRequestsCsv);



/**
 * @desc    Exporting a Room's Requests as Plain text
 * @route   GET /api/exports/:roomCode/export/plaintext
 * @access  PUBLIC
 */
router.get("/:roomCode/export/txt", exportRoomRequestsTxt);



export default router;
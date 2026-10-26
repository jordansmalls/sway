import {
    createRequest,
    upvoteRequest,
    markRequestPlaying,
    markRequestPlayed,
    deleteRequest,
    fetchRequestDetails,
    fetchRoomRequests,
    filterRequests,
} from "../controllers/request.controller.js";
import express, { type RequestHandler } from "express";
import { identifyRoomOwner, protect } from "../middlewares/auth.middleware.js";
import { ensureGuestId } from "../middlewares/guest.middleware.js";
import { guestIpLimiter, voteLimiter } from "../middlewares/rate-limiters/vote.limiter.js";
import { djLimiter } from "../middlewares/rate-limiters/dj.limiter.js";
const router = express.Router();

// The room's DJ gets the DJ budget instead of the guest limits, which skip them.
const roomOwnerLimiter: RequestHandler = (req, res, next) => (res.locals.roomOwner ? djLimiter(req, res, next) : next());

// === Private Routes === //

/**
 * @desc    Mark Song Request as Playing
 * @route   PUT /api/requests/:requestId/mark-playing
 * @access  PRIVATE
 */
router.put("/:requestId/mark-playing", protect, markRequestPlaying);

/**
 * @desc    Mark Song Request as Played
 * @route   PUT /api/requests/:requestId/mark-played
 * @access  PRIVATE
 */
router.put("/:requestId/mark-played", protect, markRequestPlayed);

/**
 * @desc    Remove a Song Request
 * @route   DELETE /api/requests/:requestId/delete
 * @access  PRIVATE
 */
router.delete("/:requestId/delete", protect, deleteRequest);

// === Public Routes === //

/**
 * @desc    Create a Song Request
 * @route   POST /api/requests
 * @access  PUBLIC (the room's DJ skips guest limits and the per-guest pending cap)
 */
router.post("/", ensureGuestId, identifyRoomOwner, guestIpLimiter, voteLimiter, roomOwnerLimiter, createRequest);

/**
 * @desc    Upvote a song
 * @route   PUT /api/requests/vote
 * @access  PUBLIC
 */
router.put("/vote", ensureGuestId, guestIpLimiter, voteLimiter, upvoteRequest);

/**
 * @desc    Get Room Requests
 * @route   GET /api/requests/:roomId/requests
 * @access  PUBLIC
 */
router.get("/:roomId/requests", ensureGuestId, fetchRoomRequests);

/**
 * @desc    Get Request details
 * @route   GET /api/requests/:requestId
 * @access  PUBLIC
 */
router.get("/:requestId", fetchRequestDetails);

/**
 * @desc    Filter Requests
 * @route   GET /api/requests/:roomId/filter
 * @access  PUBLIC
 */
router.get("/:roomId/filter", ensureGuestId, filterRequests);

export default router;

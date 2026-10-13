import express from "express";
import generalLimiter from "../middlewares/rate-limiters/general.limiter";
import { protect } from "../middlewares/auth.middleware";
import {
    mostPlayedArtists,
    totalRequestsPlayed,
    totalRequestsReceived,
    totalRoomsHosted,
} from "../controllers/profile.controller";
import {
    mostPlayedSongs,
    mostRequestedSongs,
    mostUpvotedSongs,
    recommendedTracks,
    requestActivity,
} from "../controllers/analytics.controller";

const router = express.Router();

router.get("/:userId/request-activity", protect, requestActivity);

// TODO: add general rate limiter back in production env
// router.use(generalLimiter);

/**
 * @desc    Total Rooms/Events Hosted
 * @route   GET /api/analytics/:userId/total-rooms-hosted
 * @access  PUBLIC
 */
router.get("/:userId/total-rooms-hosted", totalRoomsHosted);

/**
 * @desc    Total Requests Received
 * @route   GET /api/analytics/:userId/total-requests-received
 * @access  PUBLIC
 */
router.get("/:userId/total-requests-received", totalRequestsReceived);

/**
 * @desc    Total Requests Played
 * @route   GET /api/analytics/:userId/total-requests-played
 * @access  PUBLIC
 */
router.get("/:userId/total-requests-played", totalRequestsPlayed);

/**
 * @desc    5 Most Played Artists
 * @route   GET /api/analytics/:userId/most-played-artists
 * @access  PUBLIC
 */
router.get("/:userId/most-played-artists", mostPlayedArtists);

/**
 * @desc    10 Most Requested Songs
 * @route   GET /api/analytics/:userId/most-requested-songs
 * @access  PUBLIC
 */
router.get("/:userId/most-requested-songs", mostRequestedSongs);

/**
 * @desc    10 Most Played Songs
 * @route   GET /api/analytics/:userId/most-played-songs
 * @access  PUBLIC
 */
router.get("/:userId/most-played-songs", mostPlayedSongs);

/**
 * @desc    10 Most Upvoted Songs
 * @route   GET /api/analytics/:userId/most-upvoted-songs
 * @access  PUBLIC
 */
router.get("/:userId/most-upvoted-songs", mostUpvotedSongs);

/**
 * @desc    20 Recommended Tracks (personal once a DJ has 20+ unique plays, global/pop otherwise)
 * @route   GET /api/analytics/:userId/recommended-tracks
 * @access  PUBLIC
 */
router.get("/:userId/recommended-tracks", recommendedTracks);

export default router;

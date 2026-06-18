import express from "express"
import generalLimiter from "../middlewares/rate-limiters/general.limiter";
import { mostRequestedTracks, mostRequestedArtists, totalSongsRequested, totalRoomsCreated } from "../controllers/global.controller";
const router = express.Router();


router.use(generalLimiter)


/**
 * @desc    Top 10 Requested Tracks on Sway
 * @route   GET /api/global/tracks
 * @access  PUBLIC
 */
router.get("/tracks", mostRequestedTracks)


/**
 * @desc    Top 10 Requested Artists on Sway
 * @route   GET /api/global/artists
 * @access  PUBLIC
 */
router.get("/artists", mostRequestedArtists)

/**
 * @desc    Total Number of Songs Requested on Sway
 * @route   GET /api/global/requests
 * @access  PUBLIC
 */
router.get("/requests", totalSongsRequested)

/**
 * @desc    Total Number of Rooms Created on Sway
 * @route   GET /api/global/rooms
 * @access  PUBLIC
 */
router.get("/rooms", totalRoomsCreated)



export default router;
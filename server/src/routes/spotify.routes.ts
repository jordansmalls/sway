import express from "express"
const router = express.Router();
import {
    searchTracks,
    fetchArtistTopTracks,
    fetchTrackDetails
} from "../controllers/spotify.controller"

/**
 * @desc    Search Spotify for Tracks
 * @route   GET /api/spotify/search
 * @access  PUBLIC
 */
router.get("/search", searchTracks)


/**
 * @desc    Fetch Track Details
 * @route   GET /api/spotify/tracks/:id
 * @access  PUBLIC
 */
router.get("/tracks/:id", fetchTrackDetails)


/**
 * @desc    Fetch Artist's Top Tracks
 * @route   GET /api/spotify/artists/:id/top-tracks
 * @access  PUBLIC
 */
router.get("/artists/:id/top-tracks", fetchArtistTopTracks)


export default router;
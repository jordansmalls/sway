import express from "express";
import { protect } from "../middlewares/auth.middleware";
import {
    createRoom,
    updateRoom,
    joinRoom,
    endRoom,
    deleteRoom,
    fetchRoomDetails,
    fetchRoomRequests,
    fetchRoomPlayedRequests,
    fetchUserLatestRooms,
    fetchActiveRoomSummary,
} from "../controllers/room.controller";
import generalLimiter from "../middlewares/rate-limiters/general.limiter";

const router = express.Router();

/**
 * @desc    Create a Room
 * @route   POST /api/rooms
 * @access  PRIVATE
 */
router.post("/", protect, generalLimiter, createRoom);

/**
 * @desc    Join a Room
 * @route   POST /api/rooms/join
 * @access  PUBLIC
 */
router.post("/join", joinRoom);

/**
 * @desc    End a Room/Make a Room Inactive
 * @route   PUT /api/rooms/end
 * @access  PRIVATE
 */
router.put("/end", protect, endRoom);

/**
 * @desc    Fetch authenticated user's five latest rooms
 * @route   GET /api/rooms/recent
 * @access  PRIVATE
 */
router.get("/recent", protect, fetchUserLatestRooms);

/**
 * @desc    Fetch authenticated user's active room summary
 * @route   GET /api/rooms/active/summary
 * @access  PRIVATE
 */
router.get("/active/summary", protect, fetchActiveRoomSummary);

/**
 * @desc    Update Room Details
 * @route   PUT /api/rooms/:roomId
 * @access  PRIVATE
 */
router.put("/:roomId", protect, updateRoom);

/**
 * @desc    Delete a room
 * @route   DELETE /api/rooms/:roomId
 * @access  PRIVATE
 */
router.delete("/:roomId", protect, deleteRoom);

/**
 * @desc    Fetch Room Details
 * @route   GET /api/rooms/:roomCode
 * @access  PUBLIC
 */
router.get("/:roomCode", fetchRoomDetails);

/**
 * @desc    Fetch Room's Requests (with spotify links + URIs)
 * @route   GET /api/rooms/:roomCode/fetch/requests
 * @access  PUBLIC
 */
router.get("/:roomCode/fetch/requests", fetchRoomRequests);

/**
 * @desc	Fetch a Room's Played Requests (with Spotify Links + URIs)
 * @route	GET /api/rooms/:roomCode/fetch/spotify/played
 * @access	PUBLIC
 */
router.get("/:roomCode/fetch/spotify/played", fetchRoomPlayedRequests);

export default router;

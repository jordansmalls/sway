import express from "express"
import { protect } from "../middlewares/auth.middleware";
import {
    createRoom,
    deleteRoom,
    fetchRoomDetails,
 } from "../controllers/room.controller";

const router = express.Router()

/**
 * @desc    Create a Room
 * @route   POST /api/rooms
 * @access  PRIVATE
 */
router.post("/", protect, createRoom)


/**
 * @desc    Delete a room
 * @route   DELETE /api/rooms/:roomId
 * @access  PRIVATE
 */
router.delete("/:roomId", protect, deleteRoom)


/**
 * @desc    Fetch Room Details
 * @route   GET /api/rooms/:roomCode
 * @access  PUBLIC
 */
router.get("/:roomCode", fetchRoomDetails)


export default router;
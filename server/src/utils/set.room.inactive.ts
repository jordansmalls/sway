import Room from "../models/room.model.js";
import { isObjectIdOrHexString, type Types } from "mongoose";

/**
 *
 * @param {string} roomId - ID of the room to set inactive
 * @param {string} userId - ID of the room creator (need to be auth'd)
 * @returns {Promise<Object>} - returns the updated room or throws an error
 */

export const setRoomInactive = async (roomId: string | Types.ObjectId, userId: string | Types.ObjectId) => {
    if (!isObjectIdOrHexString(roomId)) {
        throw Object.assign(new Error("Room ID is invalid."), { status: 400, expose: true });
    }

    const room = await Room.findById(roomId);

    if (!room) {
        throw Object.assign(new Error("Room not found."), { status: 404, expose: true });
    }

    if (room.roomCreator.toString() !== userId.toString()) {
        throw Object.assign(new Error("You are not authorized to end this room."), { status: 403, expose: true });
    }

    if (!room.active) {
        throw Object.assign(new Error("Room has already ended."), { status: 409, expose: true });
    }

    room.active = false;
    await room.save();
    return room;
};

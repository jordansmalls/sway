import Room from "../models/room.model.js";

/**
 *
 * @param {string} roomId - ID of the room to set inactive
 * @param {string} userId - ID of the room creator (need to be auth'd)
 * @returns {Promise<Object>} - returns the updated room or throws an error
 */

export const setRoomInactive = async (roomId, userId) => {
    const room = await Room.findById(roomId);

    if (!room) {
        throw new Error("Room not found!");
    }

    if (!room.active) {
        throw new Error("Room has already ended.");
    }

    if (room.roomCreator.toString() !== userId.toString()) {
        throw new Error("Not Permitted: User does not have the permission to end the room.");
    }

    room.active = false;
    await room.save();
    return room;
};

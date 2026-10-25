import Room from "../models/room.model";
import type { Types } from "mongoose";

/**
 * The rooms collection is the source of truth; the stored User.hasActiveRoom flag is no longer written.
 * @param {string} userId - ID of the room creator
 * @returns {Promise<boolean>} - whether the user has an active room
 */

export const userHasActiveRoom = async (userId: string | Types.ObjectId) =>
    Boolean(await Room.exists({ roomCreator: userId, active: true }));

import User from "../models/user.model";

/**
 *
 * @param {string} userId - ID of the user to update
 * @param {boolean} active - status to set (true/false)
 * @returns {Promise<Object>} - returns the updated user or throws an error
 */

export const setActiveRoomStatus = async function (userId, active) {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found!");
    }

    user.hasActiveRoom = active;
    return user.save();
};

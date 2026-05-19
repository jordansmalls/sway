import User from "../models/user.model";

/**
 *
 * @param {string} userId - ID of the user to update
 * @param {boolean} active - status to set (true/false)
 * @returns {Promise<Object>} - returns the updated user or throws an error
 */

export const setActiveRoomStatus = async function (userId, active) {
    console.log("🔧 setActiveRoomStatus called");
    console.log("User ID:", userId);
    console.log("Setting active to:", active);

    const user = await User.findById(userId);
    if (!user) {
        console.log("❌ User not found!");
        throw new Error("User not found!");
    }

    console.log("✅ User found:", user.username || user.email);
    console.log("Before update - hasActiveRoom:", user.hasActiveRoom);

    user.hasActiveRoom = active;
    console.log("After assignment - hasActiveRoom:", user.hasActiveRoom);

    const savedUser = await user.save();
    console.log("After save - hasActiveRoom:", savedUser.hasActiveRoom);

    // Double check by re-fetching
    const verifiedUser = await User.findById(userId);
    console.log("Verified from DB - hasActiveRoom:", verifiedUser.hasActiveRoom);

    return savedUser;
};
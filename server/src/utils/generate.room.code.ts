import Room from "../models/room.model";

/**
 * @desc    Generate Room Code
 * @returns {string} - Room Code (5 length string composed of randomized chars A-Z0-9)
 */

const generateRoomCode = () => {
    const chars = "ABCDEFGHJIKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 5; ++i) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * @desc    Check if Room Code is available for use
 * @returns {string} - Room code available for use
 */

export async function getUniqueRoomCode() {
    let code;
    let existingRoom;

    do {
        code = generateRoomCode();
        existingRoom = await Room.findOne({ roomCode: code });
    } while (existingRoom);
    return code;
}

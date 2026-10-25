import mongoose, { Schema } from "mongoose";
import { generateRoomQr } from "../utils/room.qr";

const roomSchema = new mongoose.Schema(
    {
        roomName: {
            type: String,
            required: [true, "A room name is required"],
            trim: true,
            maxLength: [100, "Room names cannot exceed 100 characters"],
        },
        roomDescription: {
            type: String,
            required: [true, "Room descriptions are required"],
            trim: true,
            maxLength: [450, "Room descriptions cannot exceed 450 characters"],
        },
        roomCode: {
            type: String,
            unique: true,
            required: [true, "A room code is required"],
            maxLength: 5,
            trim: true,
            index: 1,
        },
        roomQr: {
            type: String,
            required: false,
        },
        roomCreator: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
            index: 1,
        },
        active: {
            type: Boolean,
            default: true,
        },
        scheduledAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

// At most one active room per DJ, enforced by Mongo.
roomSchema.index({ roomCreator: 1, active: 1 }, {
    name: "one_active_room_per_creator",
    unique: true,
    partialFilterExpression: { active: true },
});

roomSchema.statics.generateRoomQr = async function (roomId) {
    const room = await this.findById(roomId);

    if (!room) throw new Error("Room not found");

    const qrDataUrl = await generateRoomQr(room.roomCode);

    // save the generated QR code to the model
    room.roomQr = qrDataUrl;
    await room.save();

    return room;
};

const Room = mongoose.model("Room", roomSchema);
export default Room;

import mongoose, { Schema } from "mongoose";
import QRCode from "qrcode"
import config from "../config/config";

const roomSchema = new mongoose.Schema({
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
}, {
    timestamps: true,
})



roomSchema.statics.generateRoomQr = async function(roomId) {
    const room = await this.findById(roomId)

    if(!room) throw new Error("Room not found");

    // === note: update FRONTEND_URL in .env when deploying prod ===

    const qrText = `${config.frontend_url}/room/${room.roomCode}`

    // generate QR code as SVG data url
    const qrDataUrl = await QRCode.toDataURL(qrText, {
        errorConnectionLevel: "H",
        type: "image/svg+xml",
        width: 300,
        margin: 2,
    })

    // save the generated QR code to the model
    room.roomQr = qrDataUrl;
    await room.save();

    return room;
}

const Room = mongoose.model("Room", roomSchema);
export default Room;
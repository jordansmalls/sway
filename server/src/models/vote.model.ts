import mongoose, { Schema } from "mongoose";

const voteSchema = new Schema({
    requestId: { type: Schema.Types.ObjectId, ref: "Request", required: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    guestId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
voteSchema.index({ requestId: 1, guestId: 1 }, { unique: true });
voteSchema.index({ roomId: 1 });

export default mongoose.model("Vote", voteSchema);

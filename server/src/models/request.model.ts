import mongoose, { Schema } from "mongoose";

const requestSchema = new Schema({
    roomId: {
        type: Schema.Types.ObjectId,
        ref: "Room",
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "playing", "played", "rejected"],
        default: "pending",
    },
    votes: {
        type: Number,
        default: 1,
        min: 1,
    },
    playedAt: {
        type: Date,
        default: null,
    },
    requestedBy: {
        type: String,
        required: false,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    track: {
        spotifyTrackId: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        artist: {
            type: String,
            required: true,
            trim: true,
        },
        albumArtUrl: {
            type: String,
            required: false,
        },
        spotifyLink: {
            type: String,
            required: true,
        },
        spotifyURI: {
            type: String,
            required: true,
        },
    },
}, {
    timestamps: true,
})


requestSchema.index({ "track.spotifyTrackId": 1 });
requestSchema.index({ roomId: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ roomId: 1, status: 1 });


// TODO: === TEST THIS === \\
// pre save hook
requestSchema.pre("save", function (next) {
    // if (this.status === "played" && !this.playedAt)
    if (this.status === "played" && this.playedAt === null) {
        this.playedAt = new Date();
    }
    // return;
    // next();
})

const Request = mongoose.model("Request", requestSchema);
export default Request;
import mongoose from "mongoose";
import config from "../src/config/config";

// Stop request writes before applying this migration. Dry-run is the default.
// Transactions require a replica set, including MongoDB Atlas deployments.
await mongoose.connect(config.mongo_uri, { autoIndex: false });
try {
    const requests = mongoose.connection.collection("requests");
    const groups = await requests.aggregate([
        { $match: { status: { $in: ["pending", "playing"] } } },
        { $group: { _id: { roomId: "$roomId", trackId: "$track.spotifyTrackId" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();
    console.log(`${groups.length} active duplicate groups found.`);
    if (process.argv.includes("--apply")) {
        for (const group of groups) {
            await mongoose.connection.transaction(async (session) => {
                const duplicates = await requests.find({
                    roomId: group._id.roomId,
                    "track.spotifyTrackId": group._id.trackId,
                    status: { $in: ["pending", "playing"] },
                }, { session }).sort({ createdAt: 1, _id: 1 }).toArray();
                if (duplicates.length < 2) return;
                const original = duplicates[0]!;
                const playing = duplicates.find((item) => item.status === "playing");
                // Keep the complete old records for recovery, outside queue/history queries.
                await mongoose.connection.collection("request_duplicate_archive").insertMany(duplicates, { session });
                await requests.updateOne({ _id: original._id }, { $set: {
                    votes: duplicates.reduce((sum, item) => sum + item.votes, 0),
                    ...(playing ? { status: "playing", playedAt: playing.playedAt, completedAt: null } : {}),
                } }, { session });
                await requests.deleteMany({ _id: { $in: duplicates.slice(1).map((item) => item._id) } }, { session });
            });
        }
        await requests.createIndex({ roomId: 1, "track.spotifyTrackId": 1 }, {
            name: "unique_active_track_per_room", unique: true,
            partialFilterExpression: { status: { $in: ["pending", "playing"] } },
        });
        console.log("Active duplicates merged and unique queue index created.");
    } else {
        console.log("Dry run. Use --apply with request writes stopped to merge duplicates and create the queue index.");
    }
} finally {
    await mongoose.disconnect();
}

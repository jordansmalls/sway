import mongoose from "mongoose";
import config from "../src/config/config";

// Stop request writes before --apply. Dry-run is the default.
if (!config.mongo_uri) throw new Error("MONGO_URI is required.");
await mongoose.connect(config.mongo_uri, { autoIndex: false });
try {
    const requests = mongoose.connection.collection("requests");
    const groups = await requests.aggregate([
        { $match: { status: "playing" } },
        { $group: { _id: "$roomId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();
    console.log(`${groups.length} rooms with duplicate playing requests.`);
    if (process.argv.includes("--apply")) {
        for (const group of groups) {
            const rows = await requests.find({ roomId: group._id, status: "playing" })
                .sort({ playedAt: -1, createdAt: -1, _id: -1 }).toArray();
            await requests.updateMany({ _id: { $in: rows.slice(1).map((row) => row._id) }, status: "playing" }, {
                $set: { status: "played", completedAt: new Date() },
            });
        }
        // The compound room/status index already covers ordinary room lookups.
        for (const index of await requests.indexes()) {
            if (Object.keys(index.key).length === 1 && index.key.roomId === 1 && !index.unique) await requests.dropIndex(index.name!);
        }
        await requests.createIndex({ roomId: 1 }, { name: "one_playing_per_room", unique: true, partialFilterExpression: { status: "playing" } });
        console.log("Playing requests repaired and one_playing_per_room index built.");
    } else {
        console.log("Dry run. Stop request writes and use --apply before deploying.");
    }
} finally {
    await mongoose.disconnect();
}

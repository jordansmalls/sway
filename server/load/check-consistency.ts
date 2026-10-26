import mongoose from "mongoose";
import config from "../src/config/config";

// Read-only consistency check for a room after a load test. Usage:
//   MONGO_URI=<staging uri> bun run load/check-consistency.ts <roomId>
const roomId = process.argv[2];
if (!roomId || !mongoose.isObjectIdOrHexString(roomId)) throw new Error("Pass the room ID as the first argument.");
if (!config.mongo_uri) throw new Error("MONGO_URI is required.");

await mongoose.connect(config.mongo_uri, { autoIndex: false });
// A valid ID from another database, or a deleted room, would otherwise pass with no requests.
if (!(await mongoose.connection.db!.collection("rooms").findOne({ _id: new mongoose.Types.ObjectId(roomId) }, { projection: { _id: 1 } }))) {
    console.error(`✗ Room ${roomId} does not exist in this database.`);
    await mongoose.disconnect();
    process.exit(1);
}
try {
    const db = mongoose.connection.db!;
    const room = new mongoose.Types.ObjectId(roomId);
    const requests = db.collection("requests");
    const problems: string[] = [];

    const byStatus = await requests.aggregate([{ $match: { roomId: room } }, { $group: { _id: "$status", count: { $sum: 1 } } }]).toArray();
    console.log("Requests by status:", Object.fromEntries(byStatus.map((group) => [group._id, group.count])));

    const playing = byStatus.find((group) => group._id === "playing")?.count ?? 0;
    if (playing > 1) problems.push(`${playing} requests are playing at once.`);

    const duplicates = await requests.aggregate([
        { $match: { roomId: room, status: { $in: ["pending", "playing"] } } },
        { $group: { _id: "$track.spotifyTrackId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();
    if (duplicates.length) problems.push(`${duplicates.length} tracks are queued more than once.`);

    const negative = await requests.countDocuments({ roomId: room, votes: { $lt: 0 } });
    if (negative) problems.push(`${negative} requests have negative votes.`);

    // Once one-vote-per-guest (Phase 1.3) ships, every counted vote has a Vote document.
    if ((await db.listCollections({ name: "votes" }).toArray()).length) {
        const mismatched = await requests.aggregate([
            { $match: { roomId: room } },
            { $lookup: { from: "votes", localField: "_id", foreignField: "requestId", as: "cast" } },
            { $match: { $expr: { $ne: ["$votes", { $size: "$cast" }] } } },
            { $count: "count" },
        ]).toArray();
        if (mismatched[0]?.count) problems.push(`${mismatched[0].count} requests' vote counts differ from their Vote documents (run scripts/recount-votes.ts).`);
    }

    const activeRooms = await db.collection("rooms").aggregate([
        { $match: { active: true } },
        { $group: { _id: "$roomCreator", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
    ]).toArray();
    if (activeRooms.length) problems.push(`${activeRooms.length} DJs have more than one active room.`);

    if (problems.length) {
        for (const problem of problems) console.error(`✗ ${problem}`);
        process.exitCode = 1;
    } else {
        console.log("✓ Room state is consistent.");
    }
} finally {
    await mongoose.disconnect();
}

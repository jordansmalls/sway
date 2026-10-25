import mongoose from "mongoose";
import config from "../src/config/config";

// Ends all but the newest active room for each DJ, so one_active_room_per_creator can build.
// Run before deploying the index; the server will not start while duplicates exist. Dry-run is the default.
export const repairActiveRooms = async ({ apply }: { apply: boolean }) => {
    const rooms = mongoose.connection.collection("rooms");
    const groups = await rooms.aggregate<{ _id: mongoose.Types.ObjectId; ids: mongoose.Types.ObjectId[] }>([
        { $match: { active: true } },
        { $sort: { createdAt: -1, _id: -1 } },
        { $group: { _id: "$roomCreator", ids: { $push: "$_id" } } },
        { $match: { "ids.1": { $exists: true } } },
    ]).toArray();
    const older = groups.flatMap((group) => group.ids.slice(1));

    if (apply) {
        if (older.length) await rooms.updateMany({ _id: { $in: older }, active: true }, { $set: { active: false, updatedAt: new Date() } });
        await rooms.createIndex({ roomCreator: 1, active: 1 }, {
            name: "one_active_room_per_creator", unique: true,
            partialFilterExpression: { active: true },
        });
    }
    return { creators: groups.length, ended: older.map(String) };
};

if (import.meta.main) {
    const apply = process.argv.includes("--apply");
    if (!config.mongo_uri) throw new Error("MONGO_URI is required.");
    await mongoose.connect(config.mongo_uri, { autoIndex: false });
    try {
        const { creators, ended } = await repairActiveRooms({ apply });
        console.log(`${creators} DJs with more than one active room; ${ended.length} older rooms to end.`);
        console.log(apply
            ? "Older rooms ended and one_active_room_per_creator index created."
            : "Dry run. Use --apply to end the older rooms and create the index.");
    } finally {
        await mongoose.disconnect();
    }
}

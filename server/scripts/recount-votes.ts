import mongoose from "mongoose";
import config from "../src/config/config";

// Stop guest writes before --apply so inserts cannot race the recount.
if (!config.mongo_uri) throw new Error("MONGO_URI is required.");
await mongoose.connect(config.mongo_uri, { autoIndex: false });
try {
    const requests = mongoose.connection.collection("requests");
    const votes = mongoose.connection.collection("votes");
    let changed = 0;
    for await (const request of requests.find({})) {
        const count = await votes.countDocuments({ requestId: request._id });
        if (request.votes === count) continue;
        changed++;
        if (process.argv.includes("--apply")) await requests.updateOne({ _id: request._id }, { $set: { votes: count } });
    }
    console.log(`${changed} vote counts ${process.argv.includes("--apply") ? "recounted" : "need repair. Dry run; stop guest writes and use --apply"}.`);
} finally {
    await mongoose.disconnect();
}

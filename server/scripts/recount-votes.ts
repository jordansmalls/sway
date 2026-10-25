import mongoose from "mongoose";
import config from "../src/config/config";

// Stop guest writes before --apply so inserts cannot race the recount.
// Requests created before Vote rows existed keep their legacy totals, so --since
// must be the guest-vote rollout time. Older requests are never touched.
if (!config.mongo_uri) throw new Error("MONGO_URI is required.");
const sinceIndex = process.argv.indexOf("--since");
const sinceArg = sinceIndex === -1 ? undefined : process.argv[sinceIndex + 1];
const since = sinceArg ? new Date(sinceArg) : null;
if (!since || Number.isNaN(since.getTime())) throw new Error("--since <ISO date of the guest-vote rollout> is required.");
const apply = process.argv.includes("--apply");
await mongoose.connect(config.mongo_uri, { autoIndex: false });
try {
    const requests = mongoose.connection.collection("requests");
    const votes = mongoose.connection.collection("votes");
    let changed = 0;
    for await (const request of requests.find({ createdAt: { $gte: since } })) {
        const count = await votes.countDocuments({ requestId: request._id });
        if (request.votes === count) continue;
        changed++;
        if (apply) await requests.updateOne({ _id: request._id }, { $set: { votes: count } });
    }
    console.log(`${changed} vote counts since ${since.toISOString()} ${apply ? "recounted" : "need repair. Dry run; stop guest writes and use --apply"}.`);
} finally {
    await mongoose.disconnect();
}

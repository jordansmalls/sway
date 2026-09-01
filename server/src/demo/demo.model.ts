import mongoose from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { seedDemo } from "./demo.seed";

type DemoState = ReturnType<typeof seedDemo> & {
    djTokenHash: string;
    guestTokenHash: string;
    expiresAt: Date;
};
export type DemoDocument = HydratedDocument<DemoState>;

// All disposable data lives in one document, never in production collections.
const demoSessionSchema = new mongoose.Schema<DemoState>({
    djTokenHash: { type: String, required: true, unique: true },
    guestTokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    user: { type: mongoose.Schema.Types.Mixed, required: true },
    room: { type: mongoose.Schema.Types.Mixed, required: true },
    requests: { type: mongoose.Schema.Types.Mixed, default: [] },
    votedIds: { type: [String], default: [] },
}, { timestamps: true, optimisticConcurrency: true });

// TTL is a cleanup backstop; API access checks expiry independently.
demoSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const DemoSession = mongoose.model<DemoState>("DemoSession", demoSessionSchema);

export async function cleanupExpiredDemos() {
    return DemoSession.deleteMany({ expiresAt: { $lte: new Date() } });
}

export function startDemoCleanup() {
    const clean = () => cleanupExpiredDemos().catch((error) => console.error("Demo cleanup failed", error));
    void clean();
    const timer = setInterval(clean, 60_000);
    timer.unref();
    return () => clearInterval(timer);
}

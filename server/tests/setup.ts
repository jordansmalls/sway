import { beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Mock rate limiters to prevent IP blocking/throttling during test execution
const pass = vi.hoisted(() => (req: any, res: any, next: any) => next());

vi.mock("../src/middlewares/rate-limiters/auth.limiter.ts", () => ({
    CREDENTIAL_LIMIT: 10,
    CREDENTIAL_IP_LIMIT: 50,
    signupLimiter: pass,
    loginLimiter: pass,
    credentialIpLimiter: pass,
}));

vi.mock("../src/middlewares/rate-limiters/dj.limiter.ts", () => ({
    DJ_LIMIT: 600,
    djLimiter: pass,
}));

vi.mock("../src/middlewares/rate-limiters/vote.limiter.ts", () => ({
    voteLimiter: pass,
    guestIpLimiter: pass,
}));

vi.mock("../src/middlewares/rate-limiters/public-read.limiter.ts", () => ({
    PUBLIC_READ_LIMIT: 300,
    publicReadLimiter: pass,
}));

vi.mock("../src/services/spotify-client.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../src/services/spotify-client")>();
    return { ...actual, getSpotifyTrack: vi.fn().mockRejectedValue(new actual.SpotifyError(503, "Spotify is temporarily unavailable.")) };
});

let mongod: MongoMemoryServer;

beforeAll(async () => {
    // Spin up in-memory mongodb
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Set environment variables
    process.env.MONGO_URI = uri;
    process.env.JWT_SECRET = "testsecretjwt_supersecure_32bytes_1234567";
    process.env.NODE_ENV = "test";

    // Import config and update properties to be safe
    const config = (await import("../src/config/config.js")).default;
    config.mongo_uri = uri;
    config.jwt_secret = "testsecretjwt_supersecure_32bytes_1234567";
    config.node_env = "test";

    // Connect to the in-memory database
    await mongoose.connect(uri);
    await (await import("../src/models/vote.model")).default.init();
});

afterAll(async () => {
    // Disconnect Mongoose and stop in-memory mongodb
    await mongoose.disconnect();
    if (mongod) {
        await mongod.stop();
    }
});

beforeEach(async () => {
    // Clear all database collections before each test run to ensure isolation
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        if (collection) {
            await collection.deleteMany({});
        }
    }
});

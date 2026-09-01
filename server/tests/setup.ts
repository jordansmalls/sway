import { beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Mock rate limiters to prevent IP blocking/throttling during test execution
vi.mock("../src/middlewares/rate-limiters/general.limiter.ts", () => ({
    default: (req: any, res: any, next: any) => next(),
}));

vi.mock("../src/middlewares/rate-limiters/vote.limiter.ts", () => ({
    voteLimiter: (req: any, res: any, next: any) => next(),
}));

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

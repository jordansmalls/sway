import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { ipKeyGenerator } from "express-rate-limit";
import { app } from "../src/app";
import User from "../src/models/user.model";
import { PUBLIC_READ_LIMIT, publicReadLimiter } from "../src/middlewares/rate-limiters/public-read.limiter";

// This suite uses the production public-read limiter; setup.ts mocks it everywhere else.
vi.unmock("../src/middlewares/rate-limiters/public-read.limiter.ts");

const loopbackKey = ipKeyGenerator("127.0.0.1");

const register = async (email = "owner@example.com") => {
    const response = await request(app).post("/api/auth").send({ email, password: "password123" });
    expect(response.status).toBe(201);
    const cookies = response.headers["set-cookie"];
    const cookie = (Array.isArray(cookies) ? cookies[0] : cookies)?.split(";")[0];
    if (!cookie) throw new Error("Registration did not set an auth cookie.");
    return { id: String(response.body.user._id), cookie };
};
const updateProfile = (cookie: string, body: Record<string, unknown>) =>
    request(app).put("/api/users/profile").set("Cookie", cookie).send(body);

beforeEach(async () => {
    await publicReadLimiter.resetKey(loopbackKey);
});

describe("Changing the account email requires the current password", () => {
    it.each([
        { name: "missing", body: {}, message: "Enter your current password to change your email." },
        { name: "empty", body: { currentPassword: "" }, message: "Enter your current password to change your email." },
        { name: "not a string", body: { currentPassword: ["password123"] }, message: "Enter your current password to change your email." },
        { name: "wrong", body: { currentPassword: "wrong-password" }, message: "Current password is incorrect." },
    ])("rejects a $name current password with 400 and leaves the account unchanged", async ({ body, message }) => {
        const owner = await register();
        const before = await User.findById(owner.id).lean();

        const response = await updateProfile(owner.cookie, { email: "taken-over@example.com", username: "hijacked", ...body });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({ success: false, error: expect.any(String), message });
        expect(await User.findById(owner.id).lean()).toEqual(before);
    });

    it("changes the email with the correct password and keeps the session valid", async () => {
        const owner = await register();

        const response = await updateProfile(owner.cookie, { email: "New@Example.com", currentPassword: "password123" }).expect(200);

        expect(response.body.user).toMatchObject({ email: "new@example.com", hasActiveRoom: false });
        expect(response.body.user.password).toBeUndefined();
        await request(app).get("/api/users/me").set("Cookie", owner.cookie).expect(200);
        await request(app).post("/api/auth/login").send({ identifier: "new@example.com", password: "password123" }).expect(200);
    });

    it("does not require the password for username-only changes or an unchanged email", async () => {
        const owner = await register();

        await updateProfile(owner.cookie, { username: "dj_one" }).expect(200);
        const response = await updateProfile(owner.cookie, { username: "dj_two", email: "OWNER@example.com" }).expect(200);

        expect(response.body.user).toMatchObject({ username: "dj_two", email: "owner@example.com" });
    });
});

describe("Public analytics rate limit", () => {
    it(`allows ${PUBLIC_READ_LIMIT} overlapping reads per IP, then returns a JSON 429`, async () => {
        const owner = await register();
        const read = (path: string) => request(app).get(`/api/analytics/${owner.id}/${path}`);
        const paths = ["total-rooms-hosted", "total-requests-received", "most-played-artists", "most-upvoted-songs"];

        const responses = await Promise.all(Array.from({ length: PUBLIC_READ_LIMIT + 10 }, (_, index) => read(paths[index % paths.length]!)));

        const statuses = responses.map((response) => response.status);
        expect(statuses.filter((status) => status === 200)).toHaveLength(PUBLIC_READ_LIMIT);
        expect(statuses.filter((status) => status === 429)).toHaveLength(10);
        const limited = responses.find((response) => response.status === 429)!;
        expect(limited.body).toMatchObject({ success: false, error: "Too Many Requests", message: expect.any(String) });
        expect(limited.headers["ratelimit-limit"] ?? limited.headers["ratelimit"]).toBeDefined();

        // The private request-activity route sits before the limiter and still answers with auth errors.
        await request(app).get(`/api/analytics/${owner.id}/request-activity`).expect(401);
        await publicReadLimiter.resetKey(loopbackKey);
        await read("total-rooms-hosted").expect(200);
    });
});

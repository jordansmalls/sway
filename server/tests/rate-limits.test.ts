import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { ipKeyGenerator } from "express-rate-limit";
import { app } from "../src/app";
import { CREDENTIAL_IP_LIMIT, CREDENTIAL_LIMIT, credentialIpLimiter } from "../src/middlewares/rate-limiters/auth.limiter";
import { DJ_LIMIT } from "../src/middlewares/rate-limiters/dj.limiter";
import { PUBLIC_READ_LIMIT, publicReadLimiter } from "../src/middlewares/rate-limiters/public-read.limiter";

// This suite uses the production audience limiters; setup.ts mocks them everywhere else.
vi.unmock("../src/middlewares/rate-limiters/auth.limiter.ts");
vi.unmock("../src/middlewares/rate-limiters/dj.limiter.ts");
vi.unmock("../src/middlewares/rate-limiters/public-read.limiter.ts");

const loopbackKey = ipKeyGenerator("127.0.0.1");
// Credential keys include the email, so each test uses fresh addresses instead of resetting them.
let prefix = 0;
const email = (name: string) => `${name}-${prefix}@example.com`;

const register = async (address: string) => {
    const response = await request(app).post("/api/auth").send({ email: address, password: "password123" });
    expect(response.status).toBe(201);
    const cookies = response.headers["set-cookie"];
    const cookie = (Array.isArray(cookies) ? cookies[0] : cookies)?.split(";")[0];
    if (!cookie) throw new Error("Registration did not set an auth cookie.");
    return cookie;
};
const login = (identifier: string, password = "wrong-password") =>
    request(app).post("/api/auth/login").send({ identifier, password });
const expectLimited = (response: request.Response) => {
    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({ success: false, error: "Too Many Requests", message: expect.any(String) });
};
// Overlapping requests in batches, so hundreds of calls don't exhaust local sockets.
const burst = async (count: number, send: (index: number) => request.Test) => {
    const responses: request.Response[] = [];
    for (let start = 0; start < count; start += 100) {
        responses.push(...await Promise.all(Array.from({ length: Math.min(100, count - start) }, (_, offset) => send(start + offset))));
    }
    return responses;
};

beforeEach(async () => {
    prefix += 1;
    await credentialIpLimiter.resetKey(loopbackKey);
    await publicReadLimiter.resetKey(loopbackKey);
});

describe("Login and signup limits", () => {
    it(`allows ${CREDENTIAL_LIMIT} overlapping attempts per IP and account, without blocking other accounts`, async () => {
        const target = email("target");
        const other = email("other");
        await register(target);
        await register(other);

        // Case and surrounding spaces count against the same account.
        const attempts = await Promise.all(Array.from({ length: CREDENTIAL_LIMIT + 3 }, (_, index) =>
            login(index % 2 ? ` ${target.toUpperCase()} ` : target)));

        // Registration used one of the target's attempts.
        const statuses = attempts.map((response) => response.status);
        expect(statuses.filter((status) => status === 401)).toHaveLength(CREDENTIAL_LIMIT - 1);
        expect(statuses.filter((status) => status === 429)).toHaveLength(4);
        expectLimited(attempts.find((response) => response.status === 429)!);
        // Even the right password is refused until the window resets.
        expectLimited(await login(target, "password123"));

        await login(other, "password123").expect(200);
    });

    it("limits repeated signups for the same email", async () => {
        const address = email("signup");
        const responses = await Promise.all(Array.from({ length: CREDENTIAL_LIMIT + 2 }, () =>
            request(app).post("/api/auth").send({ email: address, password: "password123" })));

        const statuses = responses.map((response) => response.status);
        expect(statuses.filter((status) => status === 429)).toHaveLength(2);
        expect(statuses.filter((status) => status !== 429)).toHaveLength(CREDENTIAL_LIMIT);
    });

    it(`caps an IP at ${CREDENTIAL_IP_LIMIT} attempts across accounts`, async () => {
        const responses = await Promise.all(Array.from({ length: CREDENTIAL_IP_LIMIT }, (_, index) => login(email(`rotating-${index}`))));
        expect(responses.every((response) => response.status === 401)).toBe(true);

        const limited = await login(email("fresh"));
        expectLimited(limited);
        expect(limited.body.message).toContain("network");
    });
});

describe("Authenticated DJ limits", () => {
    it(`keys on the user, so one DJ using ${DJ_LIMIT} requests does not block another DJ on the same IP`, async () => {
        const first = await register(email("first"));
        const second = await register(email("second"));

        const responses = await burst(DJ_LIMIT, () => request(app).get("/api/users/me").set("Cookie", first));

        expect(responses.every((response) => response.status === 200)).toBe(true);
        expect(responses[0]!.headers["ratelimit-limit"]).toBe(String(DJ_LIMIT));
        expectLimited(await request(app).get("/api/rooms/recent").set("Cookie", first));
        await request(app).get("/api/users/me").set("Cookie", second).expect(200);
        // Public reads have their own per-IP budget.
        await request(app).get("/api/global/rooms").expect(200);
    });
});

describe("Guest read limits", () => {
    it(`shares a ${PUBLIC_READ_LIMIT}-request per-IP budget across public reads`, async () => {
        const reads = ["/api/global/rooms", "/api/global/requests", `/api/auth/username/dj${prefix}`, `/api/auth/email/${email("free")}`];

        const responses = await burst(PUBLIC_READ_LIMIT, (index) => request(app).get(reads[index % reads.length]!));

        expect(responses.every((response) => response.status === 200)).toBe(true);
        expect(responses[0]!.headers["ratelimit-limit"]).toBe(String(PUBLIC_READ_LIMIT));
        expectLimited(await request(app).get("/api/users/someone/id"));
        // Guest room reads and joins are not behind this limiter: a venue can put every guest behind one IP.
        await request(app).post("/api/rooms/join").send({ roomCode: "NONE1" }).expect(404);
    });
});

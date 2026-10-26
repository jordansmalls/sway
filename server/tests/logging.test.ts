import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { app } from "../src/app";
import { httpLogger, logger } from "../src/config/logger";
import { errorHandler } from "../src/middlewares/error.middleware";

type Line = Record<string, any>;
let lines: Line[];

// Logs are silent in tests by default; capture them as parsed JSON for this suite.
beforeEach(() => {
    lines = [];
    logger.level = "info";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: any) => {
        for (const text of String(chunk).split("\n").filter(Boolean)) {
            try { lines.push(JSON.parse(text)); } catch { /* not a log line */ }
        }
        return true;
    });
});

afterEach(() => {
    logger.level = "silent";
    vi.restoreAllMocks();
});

const completed = (method: string, url: string) => {
    const found = lines.filter((line) => line.req?.method === method && line.req?.url === url && line.res);
    expect(found).toHaveLength(1);
    return found[0]!;
};
const register = async (email = "dj@example.com") => {
    const response = await request(app).post("/api/auth").send({ email, password: "password123" }).expect(201);
    return { id: String(response.body.user._id), cookie: String(response.headers["set-cookie"]![0]).split(";")[0]! };
};

describe("Request logging", () => {
    it("logs one JSON line per request with a request ID that is returned to the client", async () => {
        const response = await request(app).get("/health/ready").expect(200);

        const id = response.headers["x-request-id"];
        expect(id).toMatch(/^[0-9a-f-]{36}$/);
        const line = completed("GET", "/health/ready");
        expect(line).toMatchObject({ level: 30, service: "sway-api", req: { id }, res: { statusCode: 200 } });
        expect(line.responseTime).toEqual(expect.any(Number));
    });

    it("reuses a well-formed upstream request ID and replaces a malformed one", async () => {
        const reused = await request(app).get("/").set("X-Request-Id", "railway-abc.123").expect(200);
        expect(reused.headers["x-request-id"]).toBe("railway-abc.123");

        const replaced = await request(app).get("/").set("X-Request-Id", "bad id\" injected").expect(200);
        expect(replaced.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
        expect(lines.map((line) => line.req?.id)).toEqual(expect.arrayContaining(["railway-abc.123", replaced.headers["x-request-id"]]));
    });

    it("redacts cookies, authorization headers and Set-Cookie", async () => {
        const dj = await register();
        const token = dj.cookie.slice("jwt=".length);

        await request(app).get("/api/users/me").set("Cookie", dj.cookie).set("Authorization", `Bearer ${token}`).expect(200);
        await request(app).post("/api/auth/login").send({ identifier: "dj@example.com", password: "password123" }).expect(200);

        const me = completed("GET", "/api/users/me");
        expect(me.req.headers).toMatchObject({ cookie: "[Redacted]", authorization: "[Redacted]" });
        expect(completed("POST", "/api/auth/login").res.headers["set-cookie"]).toBe("[Redacted]");
        const output = JSON.stringify(lines);
        expect(output).not.toContain(token);
        expect(output).not.toContain("password123");
    });

    it("logs malformed and oversized JSON bodies with a request ID", async () => {
        const malformed = await request(app).post("/api/auth/login")
            .set("Content-Type", "application/json").send('{"identifier": "dj@example.com",').expect(400);
        const oversized = await request(app).post("/api/auth/login")
            .set("Content-Type", "application/json").send(JSON.stringify({ identifier: "x".repeat(200_000) })).expect(413);

        for (const response of [malformed, oversized]) {
            const id = response.headers["x-request-id"];
            expect(id).toMatch(/^[0-9a-f-]{36}$/);
            const found = lines.filter((line) => line.req?.id === id && line.res);
            expect(found).toHaveLength(1);
            expect(found[0]).toMatchObject({ level: 40, res: { statusCode: response.status } });
        }
    });

    it("redacts demo session tokens", async () => {
        const token = "demo-session-token-should-not-be-logged";
        await request(app).get("/api/users/me").set("X-Demo-Token", token).expect(403);

        expect(completed("GET", "/api/users/me").req.headers["x-demo-token"]).toBe("[Redacted]");
        expect(JSON.stringify(lines)).not.toContain(token);
    });

    it("redacts demo tokens in logged header objects", () => {
        const token = "demo-header-token-should-not-be-logged";
        logger.info({ headers: { "x-demo-token": token } }, "headers");

        expect(lines.at(-1)!.headers["x-demo-token"]).toBe("[Redacted]");
        expect(JSON.stringify(lines)).not.toContain(token);
    });

    it("adds userId and roomId on mutation paths only", async () => {
        const dj = await register();
        const created = await request(app).post("/api/rooms").set("Cookie", dj.cookie)
            .send({ roomName: "Live", roomDescription: "Logged" }).expect(201);
        const roomId = String(created.body.newRoom._id);
        await request(app).put(`/api/rooms/${roomId}`).set("Cookie", dj.cookie).send({ roomName: "Renamed" }).expect(200);
        await request(app).put("/api/rooms/end").set("Cookie", dj.cookie).send({ roomId }).expect(200);
        await request(app).put("/api/rooms/end").set("Cookie", dj.cookie).send({ roomId }).expect(409);
        await request(app).get("/api/rooms/recent").set("Cookie", dj.cookie).expect(200);

        expect(completed("POST", "/api/rooms")).toMatchObject({ userId: dj.id, roomId });
        expect(completed("PUT", `/api/rooms/${roomId}`)).toMatchObject({ userId: dj.id, roomId });
        const ends = lines.filter((line) => line.req?.url === "/api/rooms/end" && line.res);
        expect(ends.map((line) => [line.res.statusCode, line.level, line.userId, line.roomId]))
            .toEqual([[200, 30, dj.id, roomId], [409, 40, dj.id, roomId]]);
        const read = completed("GET", "/api/rooms/recent");
        expect(read.userId).toBeUndefined();
        expect(read.roomId).toBeUndefined();
        // Guest writes carry the room from the body without a user.
        await request(app).post("/api/requests").send({ roomId, track: { id: "t", name: "Song", artist: "Artist" } });
        expect(completed("POST", "/api/requests")).toMatchObject({ roomId });
    });

    it("adds roomId to request mutations whose URL and body carry only a request ID", async () => {
        const dj = await register();
        const created = await request(app).post("/api/rooms").set("Cookie", dj.cookie)
            .send({ roomName: "Live", roomDescription: "Logged" }).expect(201);
        const roomId = String(created.body.newRoom._id);
        const submitted = await request(app).post("/api/requests").send({ roomId, track: { id: "t", name: "Song", artist: "Artist" } }).expect(201);
        const requestId = String(submitted.body.request._id);

        await request(app).put("/api/requests/vote").send({ requestId }).expect(200);
        await request(app).put(`/api/requests/${requestId}/mark-playing`).set("Cookie", dj.cookie).expect(200);
        await request(app).put(`/api/requests/${requestId}/mark-played`).set("Cookie", dj.cookie).expect(200);
        await request(app).delete(`/api/requests/${requestId}/delete`).set("Cookie", dj.cookie).expect(200);

        expect(completed("PUT", "/api/requests/vote")).toMatchObject({ roomId });
        for (const [method, url] of [["PUT", `/api/requests/${requestId}/mark-playing`], ["PUT", `/api/requests/${requestId}/mark-played`], ["DELETE", `/api/requests/${requestId}/delete`]]) {
            expect(completed(method!, url!)).toMatchObject({ userId: dj.id, roomId });
        }
    });

    it("logs Spotify failures through the request logger, so they share the request ID", async () => {
        // The shared test setup fails every track lookup with a 503.
        const response = await request(app).get("/api/spotify/tracks/4uLU6hMCjMI75M1A2tKUQC");

        const failure = lines.find((line) => line.msg === "Spotify request failed");
        expect(failure).toMatchObject({ level: 50, endpoint: "/v1/tracks/:id" });
        expect(failure!.req.id).toBe(response.headers["x-request-id"]);
    });

    it("logs unexpected errors once at error level with the stack, while the response stays generic", async () => {
        const boom = express();
        boom.use(httpLogger);
        boom.get("/boom", () => { throw new Error("database exploded"); });
        boom.use(errorHandler);

        const response = await request(boom).get("/boom").expect(500);

        expect(response.body.message).not.toContain("exploded");
        const errors = lines.filter((line) => line.level === 50);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatchObject({ req: { url: "/boom" }, res: { statusCode: 500 }, err: { message: "database exploded" } });
        expect(errors[0]!.err.stack).toContain("database exploded");
    });
});

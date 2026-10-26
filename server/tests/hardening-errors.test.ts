import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { app } from "../src/app";
import { errorHandler } from "../src/middlewares/error.middleware";

// Mounts a route that throws the given error so the handler can be tested in isolation.
const throwing = (error: unknown) => {
    const test = express();
    test.get("/boom", () => { throw error; });
    test.use(errorHandler);
    return request(test).get("/boom");
};

afterEach(() => vi.restoreAllMocks());

describe("Error middleware", () => {
    it("returns 400 with the standard shape for malformed JSON on a real route", async () => {
        const response = await request(app)
            .post("/api/requests")
            .set("Content-Type", "application/json")
            .send('{"roomId": "abc", "track": ');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            success: false,
            error: expect.any(String),
            message: expect.any(String),
        });
        expect(JSON.stringify(response.body)).not.toMatch(/Unexpected|position|at .*\.js/);
    });

    it("keeps valid 4xx statuses from err.status or err.statusCode", async () => {
        const fromStatus = await throwing(Object.assign(new Error("Payload too large"), { status: 413, expose: true }));
        expect(fromStatus.status).toBe(413);
        expect(fromStatus.body).toEqual({ success: false, error: "Payload Too Large", message: "Payload too large" });

        const fromStatusCode = await throwing(Object.assign(new Error("secret internals"), { statusCode: 422 }));
        expect(fromStatusCode.status).toBe(422);
        expect(fromStatusCode.body.success).toBe(false);
        expect(fromStatusCode.body.message).not.toContain("secret");
    });

    it("hides unexpected errors and invalid statuses behind a generic 500", async () => {
        for (const error of [
            new Error("connection string mongodb://user:pass@host"),
            Object.assign(new Error("upstream secret"), { status: 502, expose: false }),
            Object.assign(new Error("weird secret"), { status: "400" }),
        ]) {
            const response = await throwing(error);
            expect(response.status).toBe(500);
            expect(response.body).toEqual({ success: false, error: "Internal Server Error", message: expect.any(String) });
            expect(JSON.stringify(response.body)).not.toMatch(/secret|mongodb|stack/);
        }
    });

    it("maps invalid ObjectIds to 404", async () => {
        const response = await request(app)
            .post("/api/requests")
            .send({ roomId: "not-an-id", track: { id: "t", name: "Song", artist: "Artist" } });
        expect(response.status).toBe(404);
        expect(response.body).toEqual({ success: false, error: "Resource not found", message: expect.any(String) });
    });
});

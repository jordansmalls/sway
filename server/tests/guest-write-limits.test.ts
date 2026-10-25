import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { ipKeyGenerator } from "express-rate-limit";
import { app } from "../src/app";
import { initSocketIO } from "../src/controllers/request.controller";
import { voteLimiter } from "../src/middlewares/rate-limiters/vote.limiter";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";

// Hoisted before app/router imports. Vitest's file isolation keeps setup.ts's
// bypass in other suites, while this suite uses the production limiter/store.
vi.unmock("../src/middlewares/rate-limiters/vote.limiter.ts");

// Supertest connects over IPv4 loopback, including when Node reports a mapped
// IPv6 address. Use the limiter's public store API to isolate each test.
const loopbackKey = ipKeyGenerator("127.0.0.1");
const currentIpLimit = 5;
const initialVotes = 1;
const emit = vi.fn<(event: string, payload: unknown) => void>();
const to = vi.fn<(room: string) => { emit: typeof emit }>(() => ({ emit }));
let roomId: string;
let requestId: string;

const vote = () => request(app).put("/api/requests/vote").send({ requestId });
const snapshot = async () => {
    const [rooms, requests] = await Promise.all([
        Room.find().sort({ _id: 1 }).lean(),
        SongRequest.find().sort({ _id: 1 }).lean(),
    ]);
    return { rooms, requests };
};

beforeEach(async () => {
    await voteLimiter.resetKey(loopbackKey);
    await SongRequest.init();
    emit.mockClear();
    to.mockClear();
    initSocketIO({ to });

    const room = await Room.create({
        roomName: "Guest vote limits",
        roomDescription: "Real production limiter tests",
        roomCode: "LIMIT",
        roomCreator: new mongoose.Types.ObjectId(),
        active: true,
    });
    const song = await SongRequest.create({
        roomId: room._id,
        status: "pending",
        votes: initialVotes,
        requestedBy: "Guest",
        track: {
            spotifyTrackId: "limited-track",
            title: "Limited track",
            artist: "Artist",
            spotifyLink: "https://open.spotify.com/track/limited-track",
            spotifyURI: "spotify:track:limited-track",
        },
    });
    roomId = room._id.toString();
    requestId = song._id.toString();
});

afterEach(async () => {
    vi.restoreAllMocks();
    await voteLimiter.resetKey(loopbackKey);
    initSocketIO(undefined);
});

// Phase 1.3's guest IDs, per-track vote deduplication, guest/IP write quotas and
// POST limiter are not implemented. These tests cover only today's PUT policy.
describe("Guest votes with the current production IP limiter", () => {
    it("persists five accepted votes, then returns 429 before database access or socket events", async () => {
        for (let accepted = 1; accepted <= currentIpLimit; accepted++) {
            const response = await vote().expect(200);
            expect(response.body).toMatchObject({
                success: true,
                request: { _id: requestId, votes: initialVotes + accepted },
            });
            expect(response.headers["ratelimit-limit"]).toBe(String(currentIpLimit));
            expect(response.headers["ratelimit-remaining"]).toBe(String(currentIpLimit - accepted));
            expect((await SongRequest.findById(requestId).lean())?.votes).toBe(initialVotes + accepted);
            expect(emit).toHaveBeenNthCalledWith(accepted, "request:updated", expect.objectContaining({
                votes: initialVotes + accepted,
            }));
        }
        expect(emit).toHaveBeenCalledTimes(currentIpLimit);
        expect(to).toHaveBeenCalledTimes(currentIpLimit);
        expect(to).toHaveBeenCalledWith(`room-${roomId}`);
        expect(await voteLimiter.getKey(loopbackKey)).toMatchObject({ totalHits: currentIpLimit });

        const before = await snapshot();
        const requestRead = vi.spyOn(SongRequest, "findById");
        const roomRead = vi.spyOn(Room, "findById");
        const write = vi.spyOn(SongRequest, "findByIdAndUpdate");
        emit.mockClear();
        to.mockClear();

        for (let blocked = 0; blocked < 3; blocked++) {
            const response = await vote().expect(429);
            expect(response.text).toBe("Too many votes from this user, please try again soon.");
            expect(response.headers["ratelimit-limit"]).toBe(String(currentIpLimit));
            expect(response.headers["ratelimit-remaining"]).toBe("0");
            expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
            expect(Number(response.headers["retry-after"])).toBeLessThanOrEqual(30);
        }

        expect(requestRead).not.toHaveBeenCalled();
        expect(roomRead).not.toHaveBeenCalled();
        expect(write).not.toHaveBeenCalled();
        expect(await snapshot()).toEqual(before);
        expect(to).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalled();
    });

    it("accepts exactly five of ten overlapping votes without extra increments or events", async () => {
        const responses = await Promise.all(Array.from({ length: 10 }, () => vote()));
        expect(responses.map(({ status }) => status).sort()).toEqual([
            ...Array<number>(currentIpLimit).fill(200),
            ...Array<number>(10 - currentIpLimit).fill(429),
        ]);
        const accepted = responses.filter(({ status }) => status === 200);
        expect(accepted.map(({ body }) => body.request.votes).sort()).toEqual([2, 3, 4, 5, 6]);
        for (const response of responses.filter(({ status }) => status === 429)) {
            expect(response.text).toBe("Too many votes from this user, please try again soon.");
            expect(response.headers["ratelimit-remaining"]).toBe("0");
        }
        expect((await SongRequest.findById(requestId).lean())?.votes).toBe(initialVotes + currentIpLimit);
        expect(await SongRequest.countDocuments()).toBe(1);
        expect(emit).toHaveBeenCalledTimes(currentIpLimit);
        expect(emit.mock.calls.map(([event]) => event)).toEqual(Array<string>(currentIpLimit).fill("request:updated"));
        expect(to).toHaveBeenCalledTimes(currentIpLimit);
        expect(to).toHaveBeenCalledWith(`room-${roomId}`);
        expect(await voteLimiter.getKey(loopbackKey)).toMatchObject({ totalHits: 10 });
    });
});

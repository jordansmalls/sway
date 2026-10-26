import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { ipKeyGenerator } from "express-rate-limit";
import { app } from "../src/app";
import { initSocketIO } from "../src/controllers/request.controller";
import { guestIpLimiter, voteLimiter } from "../src/middlewares/rate-limiters/vote.limiter";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import Vote from "../src/models/vote.model";

vi.unmock("../src/middlewares/rate-limiters/vote.limiter.ts");
const loopbackKey = ipKeyGenerator("127.0.0.1");
const guests = new Set<string>();
const guest = () => { const id = randomUUID(); guests.add(id); return id; };
const emit = vi.fn();
let roomId: string;
let requestId: string;
const vote = (id: string) => request(app).put("/api/requests/vote").set("Cookie", `sway_guest=${id}`).send({ requestId });
const submit = (id: string) => request(app).post("/api/requests").set("Cookie", `sway_guest=${id}`).send({ roomId, track: { id: "limited-track", name: "Limited track", artist: "Artist" } });

beforeEach(async () => {
    await guestIpLimiter.resetKey(loopbackKey);
    await SongRequest.init();
    emit.mockClear();
    initSocketIO({ to: () => ({ emit }) });
    const room = await Room.create({ roomName: "Limits", roomDescription: "Limits tests", roomCode: "LIMIT", roomCreator: new mongoose.Types.ObjectId() });
    roomId = String(room._id);
    const song = await SongRequest.create({ roomId, votes: 0, track: { spotifyTrackId: "limited-track", title: "Limited track", artist: "Artist", spotifyLink: "link", spotifyURI: "uri" } });
    requestId = String(song._id);
});

afterEach(async () => {
    vi.restoreAllMocks();
    await guestIpLimiter.resetKey(loopbackKey);
    for (const id of guests) await voteLimiter.resetKey(id);
    guests.clear();
    initSocketIO(undefined);
});

describe("Guest write backstops", () => {
    it("shares 30 writes per minute across votes and submissions, and blocks before database access", async () => {
        const id = guest();
        const responses = await Promise.all(Array.from({ length: 30 }, (_, index) => index % 2 ? vote(id) : submit(id)));
        expect(responses.every(({ status }) => status === 200)).toBe(true);
        expect((await SongRequest.findById(requestId))?.votes).toBe(1);
        expect(await Vote.countDocuments()).toBe(1);
        expect(emit).toHaveBeenCalledTimes(1);
        const read = vi.spyOn(SongRequest, "findById");
        const queued = vi.spyOn(SongRequest, "findOne");
        const roomRead = vi.spyOn(Room, "findById");
        const insert = vi.spyOn(Vote, "create");
        emit.mockClear();
        for (const call of [vote, submit]) {
            const blocked = await call(id).expect(429);
            expect(blocked.headers["ratelimit-limit"]).toBe("30");
            expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
        }
        expect(read).not.toHaveBeenCalled();
        expect(queued).not.toHaveBeenCalled();
        expect(roomRead).not.toHaveBeenCalled();
        expect(insert).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalled();
    });

    it("gives the room's DJ the DJ budget instead of the guest limits", async () => {
        const signup = async (email: string) => {
            const response = await request(app).post("/api/auth").send({ email, password: "password123" }).expect(201);
            return { id: String(response.body.user._id), cookie: String(response.headers["set-cookie"]![0]).split(";")[0]! };
        };
        const dj = await signup("limits-dj@example.com");
        const other = await signup("limits-other@example.com");
        const djRoom = await Room.create({ roomName: "DJ", roomDescription: "Owner limits", roomCode: "DJLIM", roomCreator: dj.id });
        const id = guest();
        await Promise.all(Array.from({ length: 30 }, () => vote(id)));
        const add = (cookie: string, trackId: string) => request(app).post("/api/requests")
            .set("Cookie", `${cookie}; sway_guest=${id}`).send({ roomId: String(djRoom._id), track: { id: trackId, name: "Pick", artist: "Artist" } });

        // The guest cookie is spent, but the DJ is adding to their own room.
        const added = await add(dj.cookie, "dj-pick").expect(201);
        expect(added.headers["ratelimit-limit"]).toBeUndefined();
        await add(other.cookie, "other-pick").expect(429);
        await vote(id).expect(429);
    });

    it("accepts ten guests on one IP while counting each guest only once", async () => {
        const responses = await Promise.all(Array.from({ length: 10 }, () => vote(guest())));
        expect(responses.every(({ status }) => status === 200)).toBe(true);
        expect((await SongRequest.findById(requestId))?.votes).toBe(10);
        expect(emit).toHaveBeenCalledTimes(10);
    });

    it("keeps a 300-write network ceiling across both routes even as cookies change", async () => {
        // Ten guests may each make thirty writes on venue Wi-Fi.
        for (let i = 0; i < 10; i++) {
            const id = guest();
            const responses = await Promise.all(Array.from({ length: 30 }, (_, j) => j % 2 ? vote(id) : submit(id)));
            expect(responses.every(({ status }) => status === 200)).toBe(true);
        }
        const read = vi.spyOn(SongRequest, "findById");
        const queued = vi.spyOn(SongRequest, "findOne");
        emit.mockClear();
        for (const call of [vote, submit]) {
            const blocked = await call(guest()).expect(429);
            expect(blocked.headers["ratelimit-limit"]).toBe("300");
        }
        expect(read).not.toHaveBeenCalled();
        expect(queued).not.toHaveBeenCalled();
        expect(emit).not.toHaveBeenCalled();
    });
});

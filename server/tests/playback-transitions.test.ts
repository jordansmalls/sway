import { beforeEach, describe, expect, it, vi } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import { initSocketIO } from "../src/controllers/request.controller";
import { transitionRequestStatus } from "../src/services/request-transitions";

const exec = promisify(execFile);
const emit = vi.fn();
let roomId: string;
let ownerId: string;
let cookie: string;
const add = async (id: string, status: "pending" | "playing" | "played" | "rejected" = "pending") => SongRequest.create({
    roomId, status, track: { spotifyTrackId: id, title: id, artist: "Artist", spotifyLink: `https://open.spotify.com/track/${id}`, spotifyURI: `spotify:track:${id}` },
});
const mark = (id: unknown, to = "playing") => request(app).put(`/api/requests/${id}/mark-${to}`).set("Cookie", cookie);

beforeEach(async () => {
    await SongRequest.init();
    const auth = await request(app).post("/api/auth").send({ email: "playback@example.com", password: "password123" });
    ownerId = auth.body.user._id;
    const cookies = auth.headers["set-cookie"];
    cookie = String(Array.isArray(cookies) ? cookies[0] : cookies).split(";")[0]!;
    const room = await Room.create({ roomName: "Playback", roomDescription: "Playback tests", roomCode: "PLAY", roomCreator: ownerId });
    roomId = String(room._id);
    initSocketIO({ to: () => ({ emit }) });
    emit.mockClear();
});

describe("Playback transitions", () => {
    it("leaves exactly one playing row after 20 overlapping API calls", async () => {
        const rows = await Promise.all(Array.from({ length: 20 }, (_, i) => add(`track-${i}`)));
        const responses = await Promise.all(rows.map((row) => mark(row._id)));
        expect(responses.every(({ status }) => status === 200 || status === 409)).toBe(true);
        expect(responses.some(({ status }) => status === 200)).toBe(true);
        expect(await SongRequest.countDocuments({ roomId, status: "playing" })).toBe(1);
        expect(await SongRequest.countDocuments({ roomId })).toBe(20);
    });

    it("creates a replay row while preserving the original play history", async () => {
        const original = await add("replay");
        await mark(original._id).expect(200);
        await mark(original._id, "played").expect(200);
        const before = await SongRequest.findById(original._id).lean();
        const replay = await mark(original._id).expect(200);
        expect(replay.body.request).toMatchObject({ status: "playing", replayOf: String(original._id), votes: 0, requestedBy: null });
        expect(replay.body.request._id).not.toBe(String(original._id));
        expect(await SongRequest.findById(original._id).lean()).toEqual(before);
        expect(await SongRequest.countDocuments({ roomId })).toBe(2);
    });

    it("promotes the guest's pending re-request and keeps its votes", async () => {
        const original = await add("re-request", "played");
        const pending = await add("re-request");
        await SongRequest.updateOne({ _id: pending._id }, { votes: 7 });
        const before = await SongRequest.findById(original._id).lean();
        const replay = await mark(original._id).expect(200);
        expect(replay.body.request).toMatchObject({ _id: String(pending._id), votes: 7, status: "playing" });
        expect(await SongRequest.findById(original._id).lean()).toEqual(before);
        expect(await SongRequest.countDocuments({ roomId })).toBe(2);
    });

    it("handles a guest submission racing the replay insert", async () => {
        const original = await add("racing", "played");
        const responses = await Promise.all([
            mark(original._id),
            request(app).post("/api/requests").send({ roomId, track: { id: "racing", name: "racing", artist: "Artist" } }),
        ]);
        expect(responses.every(({ status }) => [200, 201].includes(status))).toBe(true);
        expect(await SongRequest.countDocuments({ roomId, status: "playing" })).toBe(1);
        expect(await SongRequest.countDocuments({ roomId })).toBe(2);
    });

    it("returns 200 on simultaneous same-state clicks without timestamps or duplicate events", async () => {
        const row = await add("double");
        await Promise.all([mark(row._id), mark(row._id)]).then((responses) => responses.forEach(({ status }) => expect(status).toBe(200)));
        expect(emit.mock.calls.filter(([event]) => event === "request:playing")).toHaveLength(1);
        const before = await SongRequest.findById(row._id).lean();
        emit.mockClear();
        await mark(row._id).expect(200);
        expect(await SongRequest.findById(row._id).lean()).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
        await mark(row._id, "played").expect(200);
        const completed = await SongRequest.findById(row._id).lean();
        emit.mockClear();
        await mark(row._id, "played").expect(200);
        expect(await SongRequest.findById(row._id).lean()).toEqual(completed);
        expect(emit).not.toHaveBeenCalled();
    });

    it.each([ ["pending", "played"], ["played", "rejected"], ["playing", "rejected"], ["rejected", "playing"] ] as const)("rejects %s to %s with 409 and no changes", async (from, to) => {
        const row = await add(`${from}-${to}`, from);
        const before = await SongRequest.findById(row._id).lean();
        await expect(transitionRequestStatus(String(row._id), ownerId, to)).rejects.toMatchObject({ status: 409 });
        expect(await SongRequest.findById(row._id).lean()).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
    });

    it("supports pending to rejected and releases the active-track slot", async () => {
        const row = await add("reject");
        const result = await transitionRequestStatus(String(row._id), ownerId, "rejected");
        expect(result.request.status).toBe("rejected");
        await expect(add("reject")).resolves.toBeDefined();
    });

    it("uses the route ID and returns 404 for a missing room", async () => {
        const first = await add("route");
        const second = await add("body");
        const response = await mark(first._id).send({ requestId: String(second._id) }).expect(200);
        expect(response.body.request._id).toBe(String(first._id));
        await Room.deleteOne({ _id: roomId });
        await mark(first._id, "played").expect(404);
        await request(app).delete(`/api/requests/${first._id}/delete`).set("Cookie", cookie).expect(404);
    });

    it("repairs a legacy duplicate-playing database and replaces its plain index", async () => {
        await SongRequest.collection.dropIndex("one_playing_per_room");
        try {
            await SongRequest.collection.createIndex({ roomId: 1 });
            const rows = await Promise.all([add("old", "playing"), add("new", "playing")]);
            await SongRequest.updateOne({ _id: rows[0]!._id }, { playedAt: new Date("2026-01-01") });
            await SongRequest.updateOne({ _id: rows[1]!._id }, { playedAt: new Date("2026-01-02") });
            const options = { env: { ...process.env, MONGO_URI: process.env.MONGO_URI! }, cwd: process.cwd() };
            const dryRun = await exec("bun", ["run", "scripts/repair-playing.ts"], options);
            expect(dryRun.stdout).toContain("Dry run");
            expect(await SongRequest.countDocuments({ status: "playing" })).toBe(2);
            await exec("bun", ["run", "scripts/repair-playing.ts", "--apply"], options);
            expect((await SongRequest.findOne({ status: "playing" }))?._id).toEqual(rows[1]!._id);
            expect(await SongRequest.findById(rows[0]!._id)).toMatchObject({ status: "played", completedAt: expect.any(Date) });
            const indexes = await SongRequest.collection.indexes();
            expect(indexes.find((index) => index.name === "one_playing_per_room")).toMatchObject({ unique: true });
            expect(indexes.some((index) => index.name === "roomId_1")).toBe(false);
            await expect(add("third", "playing")).rejects.toMatchObject({ code: 11000 });
        } finally {
            await SongRequest.deleteMany({});
            await SongRequest.syncIndexes();
        }
    });
});

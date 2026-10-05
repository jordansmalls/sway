import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import { initSocketIO } from "../src/controllers/request.controller";

const emit = vi.fn();
let roomId: string;
const track = { id: "track-one", name: "First song", artist: "Artist" };
const add = (song = track) => request(app).post("/api/requests").send({ roomId, requestedBy: "First guest", track: song });

beforeEach(async () => {
    await SongRequest.init();
    emit.mockClear();
    initSocketIO({ to: () => ({ emit }) });
    const room = await Room.create({ roomName: "Queue", roomDescription: "Queue tests", roomCode: "QUEUE", roomCreator: new mongoose.Types.ObjectId() });
    roomId = String(room._id);
});

describe("Request queue", () => {
    it("turns duplicate submissions into votes on the original request", async () => {
        const first = await add();
        const second = await request(app).post("/api/requests").send({ roomId, requestedBy: "Another guest", track });
        expect(first.status).toBe(201);
        expect(second.status).toBe(200);
        expect(second.body.alreadyQueued).toBe(true);
        expect(second.body.request._id).toBe(first.body.request._id);
        expect(second.body.request.requestedBy).toBe("First guest");
        expect(second.body.request.createdAt).toBe(first.body.request.createdAt);
        expect(second.body.request.votes).toBe(2);
        expect(await SongRequest.countDocuments({ roomId })).toBe(1);
        expect(emit.mock.calls.map(([event]) => event)).toEqual(["request:created", "request:updated"]);
    });

    it("keeps one request and every vote when guests submit simultaneously", async () => {
        const responses = await Promise.all(Array.from({ length: 8 }, () => add()));
        expect(responses.every((response) => [200, 201].includes(response.status))).toBe(true);
        expect(await SongRequest.countDocuments({ roomId })).toBe(1);
        expect((await SongRequest.findOne({ roomId }))?.votes).toBe(8);
    });

    it("uses oldest-first order for ties and moves a song up when voted for", async () => {
        const first = await add();
        const second = await add({ ...track, id: "track-two", name: "Second song" });
        const ids = [first.body.request._id, second.body.request._id];
        for (const path of ["requests", "filter?status=pending"]) {
            const response = await request(app).get(`/api/requests/${roomId}/${path}`);
            expect(response.body.requests.map((item) => item._id)).toEqual(ids);
        }
        await request(app).put("/api/requests/vote").send({ requestId: ids[1] });
        const voted = await request(app).get(`/api/requests/${roomId}/requests`);
        expect(voted.body.requests.map((item) => item._id)).toEqual([...ids].reverse());
    });

    it("votes on playing songs but allows a new request after a song has been played", async () => {
        const first = await add();
        const id = first.body.request._id;
        await SongRequest.findByIdAndUpdate(id, { status: "playing" });
        const playing = await add();
        expect(playing.body.request._id).toBe(id);
        expect(playing.body.request.status).toBe("playing");
        await SongRequest.findByIdAndUpdate(id, { status: "played" });
        const again = await add();
        expect(again.status).toBe(201);
        expect(again.body.request._id).not.toBe(id);
        expect(again.body.request.votes).toBe(1);
    });

    it("keeps requests in different rooms separate", async () => {
        const first = await add();
        const other = await Room.create({ roomName: "Other", roomDescription: "Other room", roomCode: "OTHER", roomCreator: new mongoose.Types.ObjectId() });
        const second = await request(app).post("/api/requests").send({ roomId: String(other._id), track });
        expect(second.status).toBe(201);
        expect(second.body.request._id).not.toBe(first.body.request._id);
    });
});

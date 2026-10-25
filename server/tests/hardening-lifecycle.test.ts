import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import User from "../src/models/user.model";
import { initSocketIO } from "../src/controllers/request.controller";

const emit = vi.fn();
const track = { id: "track-one", name: "First song", artist: "Artist" };

const register = async (email: string) => {
    const response = await request(app).post("/api/auth").send({ email, password: "password123" });
    expect(response.status).toBe(201);
    const cookies = response.headers["set-cookie"];
    const cookie = (Array.isArray(cookies) ? cookies[0] : cookies)?.split(";")[0];
    if (!cookie) throw new Error("Registration did not set an auth cookie.");
    return { id: response.body.user._id as string, cookie };
};
const createRoom = (roomCreator: string | mongoose.Types.ObjectId, overrides: { active?: boolean; roomCode?: string } = {}) =>
    Room.create({ roomName: "Lifecycle", roomDescription: "Lifecycle tests", roomCode: "LIFEC", roomCreator, ...overrides });
const snapshot = async (roomId: string | mongoose.Types.ObjectId) =>
    (await SongRequest.find({ roomId }).sort({ _id: 1 }).lean()).map(({ _id, votes, status, updatedAt }) => ({
        _id: String(_id), votes, status, updatedAt: updatedAt?.toISOString(),
    }));

beforeEach(async () => {
    await SongRequest.init();
    emit.mockClear();
    initSocketIO({ to: () => ({ emit }) });
});

describe("Ended rooms are read-only", () => {
    it("rejects new requests, duplicate submissions and votes with 409 without changing history", async () => {
        const room = await createRoom(new mongoose.Types.ObjectId());
        const roomId = String(room._id);
        const created = await request(app).post("/api/requests").send({ roomId, track }).expect(201);
        await Room.findByIdAndUpdate(roomId, { active: false });
        const before = await snapshot(roomId);
        emit.mockClear();

        const fresh = await request(app).post("/api/requests").send({ roomId, track: { ...track, id: "track-two" } });
        const duplicate = await request(app).post("/api/requests").send({ roomId, track });
        const vote = await request(app).put("/api/requests/vote").send({ requestId: created.body.request._id });

        for (const response of [fresh, duplicate, vote]) {
            expect(response.status).toBe(409);
            expect(response.body).toMatchObject({ success: false, error: expect.any(String), message: expect.any(String) });
        }
        expect(await snapshot(roomId)).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
    });

    it("ends through PUT /api/rooms/end, then rejects concurrent requests and votes without changing exports", async () => {
        const owner = await register("owner@example.com");
        const opened = await request(app).post("/api/rooms").set("Cookie", owner.cookie)
            .send({ roomName: "Live set", roomDescription: "Ends mid-test" }).expect(201);
        const roomId = String(opened.body.newRoom._id);
        const roomCode = String(opened.body.newRoom.roomCode);
        const requestIds: string[] = [];
        for (const id of ["track-one", "track-two", "track-three"]) {
            const created = await request(app).post("/api/requests").send({ roomId, requestedBy: "Guest", track: { ...track, id } }).expect(201);
            requestIds.push(String(created.body.request._id));
        }
        const [played, queued] = requestIds as [string, string, string];
        await request(app).put("/api/requests/vote").send({ requestId: queued }).expect(200);
        // Route and body carry the same ID until Phase 1 reconciles them.
        await request(app).put(`/api/requests/${played}/mark-playing`).set("Cookie", owner.cookie).send({ requestId: played }).expect(200);
        await request(app).put(`/api/requests/${played}/mark-played`).set("Cookie", owner.cookie).send({ requestId: played }).expect(200);
        emit.mockClear();

        const ended = await request(app).put("/api/rooms/end").set("Cookie", owner.cookie).send({ roomId });
        expect(ended.status).toBe(200);
        expect(await Room.findById(roomId).lean()).toMatchObject({ active: false });
        expect(await User.findById(owner.id).lean()).toMatchObject({ hasActiveRoom: false });
        expect(emit).toHaveBeenCalledExactlyOnceWith("room:ended", { roomId });

        const exportHistory = async () => {
            const requests = await request(app).get(`/api/exports/${roomCode}/export/json`).set("Cookie", owner.cookie).expect(200);
            const tracklist = await request(app).get(`/api/exports/${roomId}/tracklist/json`).set("Cookie", owner.cookie).expect(200);
            return { requests: requests.body.data, tracklist: tracklist.body };
        };
        const before = { rows: await snapshot(roomId), exported: await exportHistory() };
        expect(before.exported.requests).toHaveLength(3);
        emit.mockClear();

        const responses = await Promise.all([
            ...Array.from({ length: 5 }, (_, index) =>
                request(app).post("/api/requests").send({ roomId, requestedBy: "Late guest", track: { ...track, id: `late-${index}` } })),
            // Resubmitting queued and played tracks would otherwise upvote or re-queue them.
            ...["track-one", "track-two", "track-three"].map((id) => request(app).post("/api/requests").send({ roomId, track: { ...track, id } })),
            ...Array.from({ length: 10 }, (_, index) => request(app).put("/api/requests/vote").send({ requestId: requestIds[index % requestIds.length] })),
        ]);

        expect(responses).toHaveLength(18);
        for (const response of responses) {
            expect(response.status).toBe(409);
            expect(response.body).toMatchObject({ success: false, error: expect.any(String), message: expect.any(String) });
        }
        expect(await snapshot(roomId)).toEqual(before.rows);
        expect(await exportHistory()).toEqual(before.exported);
        expect(emit).not.toHaveBeenCalled();
    });

    it("still accepts votes while the room is active", async () => {
        const room = await createRoom(new mongoose.Types.ObjectId());
        const created = await request(app).post("/api/requests").send({ roomId: room.id, track }).expect(201);
        const vote = await request(app).put("/api/requests/vote").send({ requestId: created.body.request._id }).expect(200);
        expect(vote.body.request.votes).toBe(2);
    });
});

describe("Requests whose room is gone", () => {
    it("returns 404 instead of crashing for mark-played, delete and vote", async () => {
        const owner = await register("owner@example.com");
        const room = await createRoom(owner.id);
        const created = await request(app).post("/api/requests").send({ roomId: room.id, track }).expect(201);
        const requestId = created.body.request._id;
        await Room.findByIdAndDelete(room.id);

        const played = await request(app).put(`/api/requests/${requestId}/mark-played`).set("Cookie", owner.cookie).send({ requestId });
        const deleted = await request(app).delete(`/api/requests/${requestId}/delete`).set("Cookie", owner.cookie).send({ requestId });
        const vote = await request(app).put("/api/requests/vote").send({ requestId });

        for (const response of [played, deleted, vote]) {
            expect(response.status).toBe(404);
            expect(response.body).toMatchObject({ success: false, message: expect.any(String) });
        }
        const stored = await SongRequest.findById(requestId).lean();
        expect(stored).toMatchObject({ status: "pending", votes: 1, completedAt: null });
    });
});

describe("Room history authorization", () => {
    it("returns only the caller's own ended rooms and rejects another user's ID with 403", async () => {
        const owner = await register("owner@example.com");
        const attacker = await register("attacker@example.com");
        const ended = await createRoom(owner.id, { active: false });
        await request(app).post("/api/requests").send({ roomId: ended.id, track }).expect(409);
        await SongRequest.create({
            roomId: ended._id, status: "played",
            track: { spotifyTrackId: "x", title: "Old song", artist: "Artist", spotifyLink: "l", spotifyURI: "u" },
        });
        await createRoom(attacker.id, { active: false, roomCode: "ATTCK" });

        const forbidden = await request(app).get(`/api/users/${owner.id}/inactive`).set("Cookie", attacker.cookie);
        expect(forbidden.status).toBe(403);
        expect(forbidden.body).toMatchObject({ success: false, error: expect.any(String), message: expect.any(String) });
        expect(forbidden.body.inactiveRooms).toBeUndefined();

        const malformed = await request(app).get("/api/users/not-an-id/inactive").set("Cookie", attacker.cookie);
        expect(malformed.status).toBe(403);

        const own = await request(app).get(`/api/users/${owner.id}/inactive`).set("Cookie", owner.cookie).expect(200);
        expect(own.body.inactiveRooms).toHaveLength(1);
        expect(own.body.inactiveRooms[0]).toMatchObject({ _id: ended.id, requestsTotal: 1, requestsPlayed: 1 });

        await request(app).get(`/api/users/${owner.id}/inactive`).expect(401);
    });
});

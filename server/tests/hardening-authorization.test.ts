import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { Types } from "mongoose";
import { app } from "../src/app";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import User from "../src/models/user.model";
import { initSocketIO } from "../src/controllers/request.controller";

type Dj = { id: string; cookie: string };
type Fixture = { owner: Dj; other: Dj; roomId: string; requestIds: [string, string] };

// Records the socket room alongside each event so rejected calls can prove they broadcast nothing.
const emit = vi.fn();
const track = (id: string) => ({ id, name: `Song ${id}`, artist: "Artist" });

const register = async (email: string): Promise<Dj> => {
    const response = await request(app).post("/api/auth").send({ email, password: "password123" });
    expect(response.status).toBe(201);
    const cookies = response.headers["set-cookie"];
    const cookie = (Array.isArray(cookies) ? cookies[0] : cookies)?.split(";")[0];
    if (!cookie?.startsWith("jwt=")) throw new Error("Registration did not set an auth cookie.");
    return { id: String(response.body.user._id), cookie };
};

const openRoom = async (dj: Dj, roomName: string): Promise<string> => {
    const response = await request(app).post("/api/rooms").set("Cookie", dj.cookie)
        .send({ roomName, roomDescription: `${roomName} description` });
    expect(response.status).toBe(201);
    return String(response.body.newRoom._id);
};

const addRequest = async (roomId: string, id: string): Promise<string> => {
    const response = await request(app).post("/api/requests").send({ roomId, requestedBy: "Guest", track: track(id) });
    expect(response.status).toBe(201);
    return String(response.body.request._id);
};

const setup = async (): Promise<Fixture> => {
    const owner = await register("owner@example.com");
    const other = await register("other@example.com");
    const roomId = await openRoom(owner, "Owner room");
    const requestIds: [string, string] = [await addRequest(roomId, "one"), await addRequest(roomId, "two")];
    emit.mockClear();
    return { owner, other, roomId, requestIds };
};

const snapshot = async () => ({
    rooms: (await Room.find().sort({ _id: 1 }).lean()).map(({ _id, roomName, roomDescription, roomCreator, active, updatedAt }) => ({
        _id: String(_id), roomName, roomDescription, roomCreator: String(roomCreator), active, updatedAt: updatedAt?.toISOString(),
    })),
    requests: (await SongRequest.find().sort({ _id: 1 }).lean()).map(({ _id, status, votes, playedAt, completedAt, updatedAt }) => ({
        _id: String(_id), status, votes, playedAt, completedAt, updatedAt: updatedAt?.toISOString(),
    })),
    users: (await User.find().sort({ _id: 1 }).lean()).map(({ _id, hasActiveRoom }) => ({ _id: String(_id), hasActiveRoom })),
});

// Body IDs must never override the route target.
const markPlaying = (requestId: string, bodyId = requestId) =>
    request(app).put(`/api/requests/${requestId}/mark-playing`).send({ requestId: bodyId });
const markPlayed = (requestId: string, bodyId = requestId) =>
    request(app).put(`/api/requests/${requestId}/mark-played`).send({ requestId: bodyId });
const deleteRequest = (requestId: string, bodyId = requestId) =>
    request(app).delete(`/api/requests/${requestId}/delete`).send({ requestId: bodyId });

const expectRejected = (response: request.Response, status: number) => {
    expect(response.status).toBe(status);
    if (status !== 401) expect(response.body).toMatchObject({ success: false, error: expect.any(String), message: expect.any(String) });
};

beforeEach(async () => {
    await SongRequest.init();
    emit.mockClear();
    initSocketIO({ to: (room: string) => ({ emit: (event: string, data: unknown) => emit(room, event, data) }) });
});

describe("Request mutations are owner-only", () => {
    it("rejects another DJ marking playing, marking played or deleting, with no state change or socket event", async () => {
        const { owner, other, requestIds: [requestId] } = await setup();
        const before = await snapshot();

        // A forged body user ID must not stand in for the authenticated session.
        const forged = { userId: owner.id, roomCreator: owner.id };
        const responses = await Promise.all([
            markPlaying(requestId).set("Cookie", other.cookie).send(forged),
            markPlayed(requestId).set("Cookie", other.cookie).send(forged),
            deleteRequest(requestId).set("Cookie", other.cookie).send(forged),
        ]);

        for (const response of responses) expectRejected(response, 403);
        expect(await snapshot()).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated and forged-token callers with 401", async () => {
        const { requestIds: [requestId] } = await setup();
        const before = await snapshot();
        const forgedToken = "jwt=eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAifQ.invalid";

        for (const call of [markPlaying, markPlayed, deleteRequest]) {
            expectRejected(await call(requestId), 401);
            expectRejected(await call(requestId).set("Cookie", forgedToken), 401);
        }
        expect(await snapshot()).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
    });

    it("authorizes the route target even when the body names another request", async () => {
        const { other, requestIds: [ownerRequestId] } = await setup();
        const otherRoomId = await openRoom(other, "Other room");
        const otherRequestId = await addRequest(otherRoomId, "three");
        emit.mockClear();
        const before = await snapshot();

        // Point the route at A's request and forge B's own request in the body.
        for (const call of [markPlaying, markPlayed, deleteRequest]) {
            expectRejected(await call(ownerRequestId, otherRequestId).set("Cookie", other.cookie), 403);
        }
        expect(await snapshot()).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
    });

    it("lets the owner mark playing, mark played and delete their own requests", async () => {
        const { owner, roomId, requestIds: [first, second] } = await setup();

        const playing = await markPlaying(first).set("Cookie", owner.cookie).expect(200);
        expect(playing.body.request).toMatchObject({ _id: first, status: "playing", completedAt: null });
        const played = await markPlayed(first).set("Cookie", owner.cookie).expect(200);
        expect(played.body.request).toMatchObject({ _id: first, status: "played", completedAt: expect.any(String) });
        await deleteRequest(second).set("Cookie", owner.cookie).expect(200);

        expect(await SongRequest.findById(first).lean()).toMatchObject({ status: "played", playedAt: expect.any(Date) });
        expect(await SongRequest.findById(second).lean()).toBeNull();
        expect(emit.mock.calls.map(([room, event]) => [room, event])).toEqual([
            [`room-${roomId}`, "request:playing"],
            [`room-${roomId}`, "request:played"],
            [`room-${roomId}`, "request:deleted"],
        ]);
    });
});

describe("Room mutations are owner-only", () => {
    it("rejects another DJ editing or deleting the room, even with forged owner IDs in the body", async () => {
        const { owner, other, roomId } = await setup();
        await openRoom(other, "Other room");
        emit.mockClear();
        const before = await snapshot();
        const forged = { userId: owner.id, roomCreator: other.id };

        const edit = await request(app).put(`/api/rooms/${roomId}`).set("Cookie", other.cookie)
            .send({ roomName: "Hijacked", roomDescription: "Hijacked", ...forged });
        const remove = await request(app).delete(`/api/rooms/${roomId}`).set("Cookie", other.cookie).send(forged);

        expectRejected(edit, 403);
        expectRejected(remove, 403);
        expect(await snapshot()).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
    });

    it("does not let another DJ end the room or change either DJ's active-room flag", async () => {
        const { owner, other, roomId } = await setup();
        await openRoom(other, "Other room");
        emit.mockClear();
        const before = await snapshot();

        const end = await request(app).put("/api/rooms/end").set("Cookie", other.cookie).send({ roomId, userId: owner.id });

        expectRejected(end, 403);
        expect(await snapshot()).toEqual(before);
        expect(await Room.findById(roomId).lean()).toMatchObject({ active: true });
        expect(await User.findById(owner.id).lean()).toMatchObject({ hasActiveRoom: true });
        expect(await User.findById(other.id).lean()).toMatchObject({ hasActiveRoom: true });
        expect(emit).not.toHaveBeenCalled();
    });

    it("returns 403 when another DJ tries to end an active or ended room", async () => {
        const { other, roomId } = await setup();
        for (const active of [true, false]) {
            await Room.updateOne({ _id: roomId }, { active });
            const before = await snapshot();
            const end = await request(app).put("/api/rooms/end").set("Cookie", other.cookie).send({ roomId });
            expectRejected(end, 403);
            expect(await snapshot()).toEqual(before);
            expect(emit).not.toHaveBeenCalled();
        }
    });

    it.each([
        { roomId: undefined, status: 400 },
        { roomId: "not-an-id", status: 400 },
        { roomId: new Types.ObjectId().toString(), status: 404 },
    ])("returns $status for an invalid or missing end-room target", async ({ roomId, status }) => {
        const { owner } = await setup();
        const before = await snapshot();
        const end = await request(app).put("/api/rooms/end").set("Cookie", owner.cookie).send({ roomId });
        expectRejected(end, status);
        expect(await snapshot()).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
    });

    it("returns 409 when the owner ends the same room again without repeating side effects", async () => {
        const { owner, roomId } = await setup();
        await request(app).put("/api/rooms/end").set("Cookie", owner.cookie).send({ roomId }).expect(200);
        emit.mockClear();
        const before = await snapshot();
        const repeat = await request(app).put("/api/rooms/end").set("Cookie", owner.cookie).send({ roomId });
        expectRejected(repeat, 409);
        expect(await snapshot()).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
    });

    it("rejects unauthenticated room edits, deletes and ends with 401", async () => {
        const { roomId } = await setup();
        const before = await snapshot();

        expectRejected(await request(app).put(`/api/rooms/${roomId}`).send({ roomName: "Anon", roomDescription: "Anon" }), 401);
        expectRejected(await request(app).delete(`/api/rooms/${roomId}`), 401);
        expectRejected(await request(app).put("/api/rooms/end").send({ roomId }), 401);

        expect(await snapshot()).toEqual(before);
        expect(emit).not.toHaveBeenCalled();
    });

    it("lets the owner edit the room without reassigning ownership or status through the body", async () => {
        const { owner, other, roomId } = await setup();

        const edit = await request(app).put(`/api/rooms/${roomId}`).set("Cookie", owner.cookie)
            .send({ roomName: "Renamed", roomDescription: "New description", roomCreator: other.id, active: false });

        expect(edit.status).toBe(200);
        expect(await Room.findById(roomId).lean()).toMatchObject({
            roomName: "Renamed", roomDescription: "New description", active: true,
        });
        expect(String((await Room.findById(roomId).lean())?.roomCreator)).toBe(owner.id);
        expect(emit).toHaveBeenCalledExactlyOnceWith(`room-${roomId}`, "room:updated",
            { roomId, roomName: "Renamed", roomDescription: "New description" });
    });
});

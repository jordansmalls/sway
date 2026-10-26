import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app";
import Room from "../src/models/room.model";
import { initSocketIO } from "../src/controllers/request.controller";
import { repairActiveRooms } from "../scripts/repair-active-rooms";

const emit = vi.fn();

const register = async (email: string) => {
    const response = await request(app).post("/api/auth").send({ email, password: "password123" });
    expect(response.status).toBe(201);
    expect(response.body.user.hasActiveRoom).toBe(false);
    const cookies = response.headers["set-cookie"];
    const cookie = (Array.isArray(cookies) ? cookies[0] : cookies)?.split(";")[0];
    if (!cookie) throw new Error("Registration did not set an auth cookie.");
    return { id: response.body.user._id as string, cookie };
};
const create = (cookie: string, roomName = "Live set") =>
    request(app).post("/api/rooms").set("Cookie", cookie).send({ roomName, roomDescription: "Tonight" });
const hasActiveRoom = async (cookie: string) =>
    (await request(app).get("/api/users/me").set("Cookie", cookie).expect(200)).body.user.hasActiveRoom;

beforeEach(async () => {
    await Room.init();
    emit.mockClear();
    initSocketIO({ to: () => ({ emit }) });
});

describe("One active room per DJ", () => {
    it("lets exactly one of five concurrent creates through and rejects the rest with 409", async () => {
        const dj = await register("dj@example.com");

        const responses = await Promise.all(Array.from({ length: 5 }, (_, index) => create(dj.cookie, `Set ${index}`)));

        const statuses = responses.map((response) => response.status).sort();
        expect(statuses).toEqual([201, 409, 409, 409, 409]);
        for (const response of responses.filter((response) => response.status === 409)) {
            expect(response.body).toMatchObject({ success: false, error: expect.any(String), message: "You already have an active room." });
        }
        expect(await Room.countDocuments({ roomCreator: dj.id, active: true })).toBe(1);
        expect(await Room.countDocuments({ roomCreator: dj.id })).toBe(1);
        expect(await hasActiveRoom(dj.cookie)).toBe(true);
    });

    it("does not allow a second active room after deleting an old room while one is live", async () => {
        const dj = await register("dj@example.com");
        const old = await create(dj.cookie, "Old set").expect(201);
        await request(app).put("/api/rooms/end").set("Cookie", dj.cookie).send({ roomId: old.body.newRoom._id }).expect(200);
        const live = await create(dj.cookie, "Live set").expect(201);

        await request(app).delete(`/api/rooms/${old.body.newRoom._id}`).set("Cookie", dj.cookie).expect(200);
        expect(await hasActiveRoom(dj.cookie)).toBe(true);

        const second = await create(dj.cookie, "Second set");
        expect(second.status).toBe(409);
        expect(await Room.find({ roomCreator: dj.id, active: true }).distinct("_id")).toEqual([new mongoose.Types.ObjectId(String(live.body.newRoom._id))]);
    });

    it("keeps DJs independent and allows a new room once the live one ends", async () => {
        const first = await register("first@example.com");
        const second = await register("second@example.com");
        const [a, b] = await Promise.all([create(first.cookie), create(second.cookie)]);
        expect([a.status, b.status]).toEqual([201, 201]);

        await request(app).put("/api/rooms/end").set("Cookie", first.cookie).send({ roomId: a.body.newRoom._id }).expect(200);
        expect(await hasActiveRoom(first.cookie)).toBe(false);
        expect(await hasActiveRoom(second.cookie)).toBe(true);
        await create(first.cookie, "Encore").expect(201);
        expect(await hasActiveRoom(first.cookie)).toBe(true);
    });

    it("ends a room exactly once under concurrent end calls", async () => {
        const dj = await register("dj@example.com");
        const roomId = (await create(dj.cookie).expect(201)).body.newRoom._id;
        emit.mockClear();

        const responses = await Promise.all(Array.from({ length: 5 }, () =>
            request(app).put("/api/rooms/end").set("Cookie", dj.cookie).send({ roomId })));

        expect(responses.map((response) => response.status).sort()).toEqual([200, 409, 409, 409, 409]);
        expect(emit).toHaveBeenCalledExactlyOnceWith("room:ended", { roomId });
        expect(await Room.findById(roomId).lean()).toMatchObject({ active: false });
    });
});

describe("repair-active-rooms script", () => {
    it("ends older duplicate active rooms so the index can build", async () => {
        await Room.collection.dropIndex("one_active_room_per_creator");
        const dj = new mongoose.Types.ObjectId();
        const other = new mongoose.Types.ObjectId();
        const at = (minutes: number) => new Date(Date.UTC(2026, 9, 25, 20, minutes));
        const room = (roomCode: string, roomCreator: mongoose.Types.ObjectId, active: boolean, createdAt: Date) =>
            ({ roomName: roomCode, roomDescription: "Seeded", roomCode, roomCreator, active, createdAt, updatedAt: createdAt });
        const { insertedIds } = await Room.collection.insertMany([
            room("OLDER", dj, true, at(0)),
            room("NEWER", dj, true, at(30)),
            room("MIDDL", dj, true, at(10)),
            room("ENDED", dj, false, at(5)),
            room("OTHER", other, true, at(1)),
        ]);
        const createIndex = () => Room.collection.createIndex({ roomCreator: 1, active: 1 }, {
            name: "one_active_room_per_creator", unique: true, partialFilterExpression: { active: true },
        });
        await expect(createIndex()).rejects.toMatchObject({ code: 11000 });

        const dryRun = await repairActiveRooms({ apply: false });
        expect(dryRun).toEqual({ creators: 1, ended: [String(insertedIds[2]), String(insertedIds[0])] });
        expect(await Room.countDocuments({ active: true })).toBe(4);

        const applied = await repairActiveRooms({ apply: true });
        expect(applied.ended).toHaveLength(2);
        const active = await Room.find({ active: true }).sort({ roomCode: 1 }).lean();
        expect(active.map((doc) => doc.roomCode)).toEqual(["NEWER", "OTHER"]);
        expect((await Room.collection.indexes()).map((index) => index.name)).toContain("one_active_room_per_creator");
        await expect(Room.collection.insertOne(room("AGAIN", dj, true, at(40)))).rejects.toMatchObject({ code: 11000 });

        // A second run is a no-op.
        expect(await repairActiveRooms({ apply: true })).toEqual({ creators: 0, ended: [] });
    });
});

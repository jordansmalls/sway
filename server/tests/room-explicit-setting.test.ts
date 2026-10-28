import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import Room from "../src/models/room.model";
import { initSocketIO } from "../src/controllers/request.controller";
import { authCookie } from "./cookies";

const emit = vi.fn();

const register = async (email: string) => {
    const response = await request(app).post("/api/auth").send({ email, password: "password123" }).expect(201);
    return authCookie(response);
};
const create = (cookie: string, body: Record<string, unknown> = {}) =>
    request(app).post("/api/rooms").set("Cookie", cookie).send({ roomName: "Live set", roomDescription: "Tonight", ...body });

beforeEach(async () => {
    await Room.init();
    emit.mockClear();
    initSocketIO({ to: () => ({ emit }) });
});

describe("Room allowExplicit setting", () => {
    it("defaults to true", async () => {
        const dj = await register("dj@example.com");
        const created = await create(dj).expect(201);

        expect(created.body.newRoom.allowExplicit).toBe(true);
        expect(await Room.findById(created.body.newRoom._id).lean()).toMatchObject({ allowExplicit: true });
    });

    it("persists false when the room is created with it", async () => {
        const dj = await register("dj@example.com");
        const created = await create(dj, { allowExplicit: false }).expect(201);

        expect(created.body.newRoom.allowExplicit).toBe(false);
        expect(await Room.findById(created.body.newRoom._id).lean()).toMatchObject({ allowExplicit: false });
    });

    it("rejects a non-boolean allowExplicit on create", async () => {
        const dj = await register("dj@example.com");
        const response = await create(dj, { allowExplicit: "false" }).expect(400);

        expect(response.body).toMatchObject({
            success: false,
            error: "Invalid Credentials: allowExplicit must be a boolean",
            message: expect.any(String),
        });
        expect(await Room.countDocuments()).toBe(0);
    });

    it("updates only allowExplicit, leaves name and description alone, and emits room:updated", async () => {
        const dj = await register("dj@example.com");
        const roomId = (await create(dj).expect(201)).body.newRoom._id;

        const response = await request(app).put(`/api/rooms/${roomId}`).set("Cookie", dj).send({ allowExplicit: false }).expect(200);

        expect(response.body.updatedRoom).toMatchObject({ roomName: "Live set", roomDescription: "Tonight", allowExplicit: false });
        expect(await Room.findById(roomId).lean()).toMatchObject({ roomName: "Live set", roomDescription: "Tonight", allowExplicit: false });
        expect(emit).toHaveBeenCalledExactlyOnceWith("room:updated", {
            roomId,
            roomName: "Live set",
            roomDescription: "Tonight",
            allowExplicit: false,
        });
    });

    it("rejects a non-boolean allowExplicit on update", async () => {
        const dj = await register("dj@example.com");
        const roomId = (await create(dj).expect(201)).body.newRoom._id;

        const response = await request(app).put(`/api/rooms/${roomId}`).set("Cookie", dj).send({ allowExplicit: "false" }).expect(400);

        expect(response.body).toMatchObject({ success: false, error: "Invalid Credentials: allowExplicit must be a boolean" });
        expect(await Room.findById(roomId).lean()).toMatchObject({ allowExplicit: true });
        expect(emit).not.toHaveBeenCalled();
    });

    it("forbids a non-owner from changing the setting", async () => {
        const dj = await register("dj@example.com");
        const other = await register("other@example.com");
        const roomId = (await create(dj).expect(201)).body.newRoom._id;

        await request(app).put(`/api/rooms/${roomId}`).set("Cookie", other).send({ allowExplicit: false }).expect(403);

        expect(await Room.findById(roomId).lean()).toMatchObject({ allowExplicit: true });
        expect(emit).not.toHaveBeenCalled();
    });

    it("exposes allowExplicit on room details, join, and the active summary", async () => {
        const dj = await register("dj@example.com");
        const { roomCode } = (await create(dj, { allowExplicit: false }).expect(201)).body.newRoom;

        const details = await request(app).get(`/api/rooms/${roomCode}`).expect(200);
        expect(details.body.roomDetails.allowExplicit).toBe(false);

        const joined = await request(app).post("/api/rooms/join").send({ roomCode }).expect(200);
        expect(joined.body.roomDetails.allowExplicit).toBe(false);

        const summary = await request(app).get("/api/rooms/active/summary").set("Cookie", dj).expect(200);
        expect(summary.body.activeRoom.allowExplicit).toBe(false);
    });
});

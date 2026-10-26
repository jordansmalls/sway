import { describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import config from "../src/config/config";
import User from "../src/models/user.model";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";

const register = async (email = "owner@example.com") => {
    const response = await request(app).post("/api/auth").send({ email, password: "password123" });
    expect(response.status).toBe(201);
    return { id: response.body.user._id, cookie: response.headers["set-cookie"][0].split(";")[0] };
};
const profile = (cookie: string, currentPassword = "password123") =>
    request(app)
        .put("/api/users/profile")
        .set("Cookie", cookie)
        .send({ email: "changed@example.com", currentPassword });

describe("Room deletion authorization", () => {
    it("rejects a forged owner ID without deleting the room or requests, and allows the owner without a body", async () => {
        const owner = await register();
        const attacker = await register("attacker@example.com");
        const room = await Room.create({
            roomName: "Private",
            roomDescription: "Test",
            roomCode: "PRIVT",
            roomCreator: owner.id,
        });
        await request(app)
            .post("/api/requests")
            .send({ roomId: room.id, track: { id: "song", name: "Song", artist: "Artist" } })
            .expect(201);
        await request(app)
            .delete(`/api/rooms/${room.id}`)
            .set("Cookie", attacker.cookie)
            .send({ userId: owner.id })
            .expect(403);
        expect(await Room.exists({ _id: room.id })).toBeTruthy();
        expect(await SongRequest.countDocuments({ roomId: room.id })).toBe(1);
        await request(app).delete(`/api/rooms/${room.id}`).expect(401);
        await request(app).delete(`/api/rooms/${room.id}`).set("Cookie", owner.cookie).expect(200);
        expect(await Room.exists({ _id: room.id })).toBeNull();
        expect(await SongRequest.countDocuments({ roomId: room.id })).toBe(0);
    });
});

describe("Session revocation", () => {
    it("revokes every old cookie after password changes and accepts a fresh login", async () => {
        const owner = await register();
        const login = await request(app)
            .post("/api/auth/login")
            .send({ identifier: "owner@example.com", password: "password123" })
            .expect(200);
        const secondCookie = login.headers["set-cookie"][0].split(";")[0];
        const legacyCookie = `jwt=${jwt.sign({ userId: owner.id }, config.jwt_secret)}`;
        await request(app).get("/api/users/me").set("Cookie", legacyCookie).expect(200);
        const changed = await request(app)
            .post("/api/users/password")
            .set("Cookie", owner.cookie)
            .send({ currentPassword: "password123", newPassword: "newpassword456" })
            .expect(200);
        expect(changed.headers["set-cookie"][0]).toContain("Expires=Thu, 01 Jan 1970");
        for (const cookie of [owner.cookie, secondCookie, legacyCookie])
            await profile(cookie).expect(401);
        await request(app)
            .post("/api/auth/login")
            .send({ identifier: "owner@example.com", password: "password123" })
            .expect(401);
        const fresh = await request(app)
            .post("/api/auth/login")
            .send({ identifier: "owner@example.com", password: "newpassword456" })
            .expect(200);
        await profile(fresh.headers["set-cookie"][0].split(";")[0], "newpassword456").expect(200);
    });

    it("revokes legacy sessions for users stored before session versions existed", async () => {
        const owner = await register();
        await User.collection.updateOne(
            { _id: (await User.findById(owner.id))!._id },
            { $unset: { sessionVersion: "" } },
        );
        const cookie = `jwt=${jwt.sign({ userId: owner.id }, config.jwt_secret)}`;
        await request(app)
            .post("/api/users/password")
            .set("Cookie", cookie)
            .send({ currentPassword: "password123", newPassword: "newpassword456" })
            .expect(200);
        await profile(cookie).expect(401);
        expect((await User.findById(owner.id))?.sessionVersion).toBe(1);
    });

    it("rejects deactivated users and keeps old sessions revoked after reactivation", async () => {
        const owner = await register();
        await request(app).delete("/api/users/profile").set("Cookie", owner.cookie).expect(200);
        await profile(owner.cookie).expect(401);
        await request(app)
            .post("/api/auth/login")
            .send({ identifier: "owner@example.com", password: "password123" })
            .expect(401);
        await User.updateOne({ _id: owner.id }, { active: true });
        await profile(owner.cookie).expect(401);
    });

    it("rejects cookies for deleted users", async () => {
        const owner = await register();
        await User.deleteOne({ _id: owner.id });
        await profile(owner.cookie).expect(401);
    });

    it("does not revoke sessions when a password change fails validation", async () => {
        const owner = await register();
        for (const values of [
            { currentPassword: "wrong", newPassword: "newpassword456" },
            { currentPassword: "password123", newPassword: "1234567" },
        ])
            await request(app)
                .post("/api/users/password")
                .set("Cookie", owner.cookie)
                .send(values)
                .expect(400);
        await profile(owner.cookie).expect(200);
        expect((await User.findById(owner.id))?.sessionVersion).toBe(0);
    });
});

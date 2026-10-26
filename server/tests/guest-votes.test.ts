import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { initSocketIO } from "../src/controllers/request.controller";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import Vote from "../src/models/vote.model";
import config from "../src/config/config";

const exec = promisify(execFile);
const emit = vi.fn();
let roomId: string;
let ownerId: string;
let ownerCookie: string;
const track = { id: "one", name: "One", artist: "Artist" };
const guestCookie = () => `sway_guest=${randomUUID()}`;
const submit = (cookie: string, id = track.id) => request(app).post("/api/requests").set("Cookie", cookie).send({ roomId, track: { ...track, id } });
const vote = (cookie: string, requestId: string) => request(app).put("/api/requests/vote").set("Cookie", cookie).send({ requestId });
const seed = (id: string, guestId?: string) => ({ roomId, guestId, votes: 0, status: "pending" as const, track: { spotifyTrackId: id, title: id, artist: "Artist", spotifyLink: "link", spotifyURI: "uri" } });

beforeEach(async () => {
    await SongRequest.init();
    const auth = await request(app).post("/api/auth").send({ email: "votes@example.com", password: "password123" });
    ownerId = auth.body.user._id;
    const cookies = auth.headers["set-cookie"];
    ownerCookie = String(Array.isArray(cookies) ? cookies[0] : cookies).split(";")[0]!;
    const room = await Room.create({ roomName: "Votes", roomDescription: "Vote tests", roomCode: "VOTES", roomCreator: ownerId });
    roomId = String(room._id);
    initSocketIO({ to: () => ({ emit }) });
    emit.mockClear();
});

describe("Guest vote semantics", () => {
    it("counts ten overlapping votes and resubmissions from one guest exactly once", async () => {
        const row = await SongRequest.create(seed("one"));
        const cookie = guestCookie();
        const responses = await Promise.all(Array.from({ length: 10 }, (_, i) => i % 2 ? vote(cookie, String(row._id)) : submit(cookie)));
        expect(responses.every(({ status }) => status === 200)).toBe(true);
        expect(responses.filter(({ body }) => body.alreadyVoted)).toHaveLength(9);
        expect((await SongRequest.findById(row._id))?.votes).toBe(1);
        expect(await Vote.countDocuments()).toBe(1);
        expect(emit).toHaveBeenCalledTimes(1);
    });

    it("deduplicates overlapping first submissions, preserving one submitter vote", async () => {
        const cookie = guestCookie();
        const responses = await Promise.all(Array.from({ length: 10 }, () => submit(cookie)));
        expect(responses.filter(({ status }) => status === 201)).toHaveLength(1);
        expect(responses.filter(({ body }) => body.alreadyVoted)).toHaveLength(9);
        expect((await SongRequest.findOne({ roomId }))?.votes).toBe(1);
        expect(await Vote.countDocuments()).toBe(1);
        expect(emit.mock.calls.map(([event]) => event)).toEqual(["request:created"]);
    });

    it("counts ten different guests as ten votes", async () => {
        const row = await SongRequest.create(seed("one"));
        await Promise.all(Array.from({ length: 10 }, () => vote(guestCookie(), String(row._id)))).then((responses) => responses.forEach(({ status }) => expect(status).toBe(200)));
        expect((await SongRequest.findById(row._id))?.votes).toBe(10);
        expect(await Vote.countDocuments()).toBe(10);
    });

    it.each(["replay", "re-request"])("allows the same guest to vote again after a %s", async (action) => {
        const cookie = guestCookie();
        const first = await submit(cookie).expect(201);
        const originalId = first.body.request._id;
        await request(app).put(`/api/requests/${originalId}/mark-playing`).set("Cookie", ownerCookie).expect(200);
        await request(app).put(`/api/requests/${originalId}/mark-played`).set("Cookie", ownerCookie).expect(200);
        const next = action === "replay"
            ? await request(app).put(`/api/requests/${originalId}/mark-playing`).set("Cookie", ownerCookie).expect(200)
            : await submit(cookie).expect(201);
        const nextId = next.body.request._id;
        expect(nextId).not.toBe(originalId);
        await vote(cookie, nextId).expect(200);
        expect((await SongRequest.findById(nextId))?.votes).toBe(1);
        expect(await Vote.countDocuments({ guestId: cookie.split("=")[1] })).toBe(2);
    });

    it("reports personal hasVoted on both list routes without leaking it in broadcasts", async () => {
        const cookie = guestCookie();
        const created = await submit(cookie).expect(201);
        expect(created.body.request.hasVoted).toBe(true);
        expect(created.body.request.guestId).toBeUndefined();
        for (const path of ["requests", "filter?status=pending"]) {
            const own = await request(app).get(`/api/requests/${roomId}/${path}`).set("Cookie", cookie).expect(200);
            const other = await request(app).get(`/api/requests/${roomId}/${path}`).set("Cookie", guestCookie()).expect(200);
            expect(own.body.requests[0].hasVoted).toBe(true);
            expect(other.body.requests[0].hasVoted).toBe(false);
        }
        const flat = await request(app).get("/api/rooms/VOTES/fetch/requests").set("Cookie", cookie).expect(200);
        expect(flat.body.data[0].hasVoted).toBe(true);
        expect(emit.mock.calls[0]?.[1].hasVoted).toBeUndefined();
    });

    it("sets a persistent httpOnly guest cookie with the auth domain policy and reuses it", async () => {
        const nodeEnv = config.node_env;
        const domain = config.cookie_domain;
        try {
            config.node_env = "production";
            config.cookie_domain = ".sway.onl";
            const response = await request(app).get(`/api/requests/${roomId}/requests`).set("Cookie", "sway_guest=forged").expect(200);
            const cookies = response.headers["set-cookie"];
            const cookie = String(Array.isArray(cookies) ? cookies[0] : cookies);
            expect(cookie).toMatch(/sway_guest=[\da-f-]{36};/);
            expect(cookie).toContain("HttpOnly");
            expect(cookie).toContain("Secure");
            expect(cookie).toContain("SameSite=Lax");
            expect(cookie).toContain("Domain=.sway.onl");
            const reused = await request(app).get(`/api/requests/${roomId}/requests`).set("Cookie", cookie.split(";")[0]!).expect(200);
            expect(reused.headers["set-cookie"]).toBeUndefined();
        } finally { config.node_env = nodeEnv; config.cookie_domain = domain; }
    });

    it("caps a guest at five pending submissions even when the last slot is contested", async () => {
        const cookie = guestCookie();
        const guestId = cookie.split("=")[1]!;
        await SongRequest.insertMany(Array.from({ length: 4 }, (_, i) => seed(`existing-${i}`, guestId)));
        const responses = await Promise.all(Array.from({ length: 10 }, (_, i) => submit(cookie, `contested-${i}`)));
        expect(responses.filter(({ status }) => status === 201)).toHaveLength(1);
        expect(responses.filter(({ status }) => status === 409)).toHaveLength(9);
        expect(await SongRequest.countDocuments({ roomId, guestId, status: "pending" })).toBe(5);
        await submit(cookie, "existing-0").expect(200);
    });

    it("lets the room's DJ queue past the per-guest cap, but not the room cap or into another DJ's room", async () => {
        const cookie = guestCookie();
        const guestId = cookie.split("=")[1]!;
        await SongRequest.insertMany(Array.from({ length: 5 }, (_, i) => seed(`existing-${i}`, guestId)));
        const asDj = (cookies: string, id: string) => request(app).post("/api/requests").set("Cookie", `${cookies}; ${cookie}`).send({ roomId, track: { ...track, id } });

        await asDj(ownerCookie, "dj-pick").expect(201);
        expect(await SongRequest.countDocuments({ roomId, guestId, status: "pending" })).toBe(6);

        // A signed-in DJ who doesn't own this room is a guest here.
        const other = await request(app).post("/api/auth").send({ email: "other-dj@example.com", password: "password123" });
        const otherCookie = String(other.headers["set-cookie"]![0]).split(";")[0]!;
        await asDj(otherCookie, "other-pick").expect(409);

        await SongRequest.insertMany(Array.from({ length: 194 }, (_, i) => seed(`filler-${i}`)));
        expect(await SongRequest.countDocuments({ roomId, status: "pending" })).toBe(200);
        const full = await asDj(ownerCookie, "over-cap").expect(409);
        expect(full.body.message).toContain("queue is full");
    });

    it("caps a room at 200 pending rows while permitting votes on existing tracks", async () => {
        await SongRequest.insertMany(Array.from({ length: 199 }, (_, i) => seed(`existing-${i}`)));
        const responses = await Promise.all(Array.from({ length: 10 }, (_, i) => submit(guestCookie(), `contested-${i}`)));
        expect(responses.filter(({ status }) => status === 201)).toHaveLength(1);
        expect(responses.filter(({ status }) => status === 409)).toHaveLength(9);
        expect(await SongRequest.countDocuments({ roomId, status: "pending" })).toBe(200);
        await submit(guestCookie(), "existing-0").expect(200);
    });

    it.each(["request", "room", "account"])("cleans votes on %s deletion", async (target) => {
        const created = await submit(guestCookie()).expect(201);
        const path = target === "request" ? `/api/requests/${created.body.request._id}/delete` : target === "room" ? `/api/rooms/${roomId}` : "/api/users/profile";
        await request(app).delete(path).set("Cookie", ownerCookie).expect(200);
        expect(await Vote.countDocuments()).toBe(0);
    });

    it("recounts materialized votes from Vote rows, including zero-vote requests", async () => {
        const legacy = await SongRequest.create(seed("legacy"));
        await SongRequest.collection.updateOne({ _id: legacy._id }, { $set: { createdAt: new Date("2020-01-01") } });
        const since = new Date(Date.now() - 60_000).toISOString();
        const first = await submit(guestCookie()).expect(201);
        const zero = await SongRequest.create(seed("zero"));
        await SongRequest.updateMany({}, { votes: 99 });
        const options = { env: { ...process.env, MONGO_URI: process.env.MONGO_URI! }, cwd: process.cwd() };
        await expect(exec("bun", ["run", "scripts/recount-votes.ts", "--apply"], options)).rejects.toThrow();
        await exec("bun", ["run", "scripts/recount-votes.ts", "--since", since], options);
        expect((await SongRequest.findById(zero._id))?.votes).toBe(99);
        await exec("bun", ["run", "scripts/recount-votes.ts", "--since", since, "--apply"], options);
        expect((await SongRequest.findById(first.body.request._id))?.votes).toBe(1);
        expect((await SongRequest.findById(zero._id))?.votes).toBe(0);
        // Requests from before the rollout have no Vote rows and keep their totals.
        expect((await SongRequest.findById(legacy._id))?.votes).toBe(99);
    });
});

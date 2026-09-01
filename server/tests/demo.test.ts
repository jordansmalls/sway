import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import { DemoSession, cleanupExpiredDemos } from "../src/demo/demo.model";
import { demoCreationLimiter, demoSpotifyIpLimiter, hashDemoToken } from "../src/demo/demo.routes";
import { type demoRequest, type seedDemo } from "../src/demo/demo.seed";
import { demoSeedTracks as demoCatalog } from "../src/demo/demo.tracks";
import { getDemoSpotifyTrack, searchDemoSpotify, DemoSpotifyError } from "../src/demo/demo.spotify";
import User from "../src/models/user.model";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";

vi.mock("../src/demo/demo.spotify", async (importOriginal) => ({
    ...await importOriginal<typeof import("../src/demo/demo.spotify")>(),
    searchDemoSpotify: vi.fn(),
    getDemoSpotifyTrack: vi.fn(),
}));

type DemoStart = ReturnType<typeof seedDemo> & { djToken: string; guestToken: string; expiresAt: string };
type DemoRequest = ReturnType<typeof demoRequest>;
const defaultQueueTitles = ["DtMF", "The Color Violet", "Free Your Mind", "Free Mind", "Dancing Queen"];

async function start(): Promise<DemoStart> {
    const response = await request(app).post("/api/demo/session");
    expect(response.status).toBe(201);
    return response.body;
}
const api = (path: string) => `/api/demo/api${path}`;
const readQueue = (demo: DemoStart, token = demo.guestToken) => request(app)
    .get(api(`/requests/${demo.room._id}/requests`)).set("X-Demo-Token", token);

beforeEach(() => {
    demoCreationLimiter.resetKey("127.0.0.1");
    demoSpotifyIpLimiter.resetKey("127.0.0.1");
    vi.mocked(searchDemoSpotify).mockReset().mockImplementation(async (query) => demoCatalog.filter((t) => `${t.name} ${t.artist}`.toLowerCase().includes(query.toLowerCase())));
    vi.mocked(getDemoSpotifyTrack).mockReset().mockImplementation(async (id) => {
        const track = demoCatalog.find((t) => t.id === id);
        if (!track) throw new DemoSpotifyError(404, "Track not found.");
        return track;
    });
});

describe("Isolated room demos", () => {
    it("creates a seeded, expiring sandbox without users, real rooms, credentials, or cookies", async () => {
        const response = await request(app).post("/api/demo/session");
        expect(response.status).toBe(201);
        expect(response.headers["set-cookie"]).toBeUndefined();
        const demo = response.body;
        expect(demo.djToken).toHaveLength(64);
        expect(demo.guestToken).not.toBe(demo.djToken);
        expect(Date.parse(demo.expiresAt) - Date.now()).toBeGreaterThan(29 * 60_000);
        const stored = await DemoSession.findOne();
        expect(stored?.djTokenHash).toBe(hashDemoToken(demo.djToken));
        expect(JSON.stringify(stored)).not.toContain(demo.djToken);
        expect(await User.countDocuments()).toBe(0);
        expect(await Room.countDocuments()).toBe(0);
        expect(await SongRequest.countDocuments()).toBe(0);
        const queue = await readQueue(demo);
        expect(queue.body.requests).toHaveLength(8);
        expect(queue.body.requests.every((r: DemoRequest) => /^[A-Za-z0-9]{22}$/.test(r.track.spotifyTrackId) && r.track.albumArtUrl?.startsWith("https://i.scdn.co/") && r.track.spotifyLink.startsWith("https://open.spotify.com/track/"))).toBe(true);
        expect(queue.body.requests.filter((r: DemoRequest) => r.status === "playing")).toHaveLength(1);
        expect(queue.body.requests.find((r: DemoRequest) => r.status === "playing").track.title).toBe("DtMF");
        expect(queue.body.requests.filter((r: DemoRequest) => r.status !== "played").map((r: DemoRequest) => r.track.title)).toEqual(defaultQueueTitles);
        expect(queue.body.requests.filter((r: DemoRequest) => r.status === "pending")).toHaveLength(4);
        expect(queue.body.requests.filter((r: DemoRequest) => r.status === "played")).toHaveLength(3);
        const analytics = await request(app).get(api(`/analytics/${demo.user._id}/most-played-songs`)).set("X-Demo-Token", demo.djToken);
        expect(analytics.body.songs).toHaveLength(10);
    });

    it("provides distinct recommendation rows with varied simulated play counts", async () => {
        const demo = await start();
        const personal = await request(app).get(api(`/analytics/${demo.user._id}/most-played-songs`)).set("X-Demo-Token", demo.djToken);
        const global = await request(app).get(api("/global/tracks/played")).set("X-Demo-Token", demo.djToken);
        const tracks = [...personal.body.songs, ...global.body.data];
        expect(personal.body.songs).toHaveLength(10);
        expect(global.body.data).toHaveLength(9);
        expect(new Set(tracks.map((track) => track.spotifyTrackId)).size).toBe(19);
        expect(tracks.map((track) => track.playCount)).toEqual(expect.arrayContaining([203, 331, 98, 121]));
        expect(tracks.map((track) => `${track.title} - ${track.artist}`)).toEqual(expect.arrayContaining([
            "DtMF - Bad Bunny", "Everybody Wants To Rule The World - Tears For Fears",
            "Tití Me Preguntó - Bad Bunny", "As It Was - Harry Styles", "Espresso - Sabrina Carpenter",
            "BIRDS OF A FEATHER - Billie Eilish", "One Time - Justin Bieber", "Even Flow - Pearl Jam",
            "Billie Jean - Michael Jackson",
            "SICKO MODE - Travis Scott", "FE!N (feat. Playboi Carti) - Travis Scott, Playboi Carti",
            "Blank Space - Taylor Swift", "thank u, next - Ariana Grande",
            "Hours In Silence - Drake, 21 Savage", "YUKON - Justin Bieber", "oh yeah? - Steve Lacy",
        ]));
        expect(tracks.filter((track) => track.artist.includes("Dua Lipa")).map((track) => track.title)).toEqual(["Levitating"]);
        expect(tracks.filter((track) => track.artist.includes("Daft Punk")).map((track) => track.title)).toEqual(["One More Time"]);
        expect(tracks.every((track) => track.playCount > 1 && track.spotifyLink.endsWith(track.spotifyTrackId))).toBe(true);
        expect(await SongRequest.countDocuments()).toBe(0);
    });

    it("serves the associated display room and QR only inside its unexpired session", async () => {
        const demo = await start();
        const path = api(`/rooms/${demo.room.roomCode}`);
        const display = await request(app).get(path).set("X-Demo-Token", demo.guestToken);
        expect(display.status).toBe(200);
        expect(display.body.roomDetails._id).toBe(demo.room._id);
        expect(display.body.roomDetails.roomQr).toMatch(/^data:image\/png;base64,/);
        expect((await request(app).get(path)).status).toBe(401);
        const other = await start();
        expect((await request(app).get(path).set("X-Demo-Token", other.guestToken)).status).toBe(404);
        await DemoSession.updateOne({ djTokenHash: hashDemoToken(demo.djToken) }, { expiresAt: new Date(Date.now() - 1) });
        expect((await request(app).get(path).set("X-Demo-Token", demo.guestToken)).status).toBe(410);
    });

    it("isolates sessions and rejects forged room and request identifiers", async () => {
        const first = await start(); const second = await start();
        const queue = await readQueue(second);
        expect((await request(app).get(api(`/rooms/${second.room.roomCode}`)).set("X-Demo-Token", first.djToken)).status).toBe(404);
        expect((await readQueue(second, first.guestToken)).status).toBe(404);
        expect((await request(app).put(api("/requests/vote")).set("X-Demo-Token", first.djToken).send({ requestId: queue.body.requests[1]._id })).status).toBe(404);
        expect((await request(app).post(api("/requests")).set("X-Demo-Token", first.guestToken).send({ roomId: second.room._id, track: { spotifyTrackId: demoCatalog[9]!.id } })).status).toBe(404);
        expect((await readQueue(second)).body.requests).toEqual(queue.body.requests);
    });

    it("supports guest requests and votes, but forbids guest administration", async () => {
        const demo = await start();
        const add = await request(app).post(api("/requests")).set("X-Demo-Token", demo.guestToken)
            .send({ roomId: demo.room._id, requestedBy: "Visitor", track: { spotifyTrackId: demoCatalog[9]!.id, title: "Forged metadata" } });
        expect(add.status).toBe(201);
        expect(add.body.request.track.title).toBe(demoCatalog[9]!.name);
        expect(add.body.request.track.spotifyLink).toBe(`https://open.spotify.com/track/${demoCatalog[9]!.id}`);
        const id = add.body.request._id;
        const vote = () => request(app).put(api("/requests/vote")).set("X-Demo-Token", demo.guestToken).send({ requestId: id });
        expect((await vote()).body.request.votes).toBe(2);
        expect((await vote()).status).toBe(409);
        expect((await request(app).put(api(`/requests/${id}/mark-playing`)).set("X-Demo-Token", demo.guestToken)).status).toBe(403);
        expect((await request(app).delete(api(`/requests/${id}/delete`)).set("X-Demo-Token", demo.guestToken)).status).toBe(403);
        expect((await request(app).put(api("/rooms/end")).set("X-Demo-Token", demo.guestToken).send({ roomId: demo.room._id })).status).toBe(403);
    });

    it("lets the DJ edit, play, complete, delete, end and reset the room", async () => {
        const demo = await start();
        const queue = await readQueue(demo);
        const id = queue.body.requests.find((r: DemoRequest) => r.status === "pending")._id;
        expect((await request(app).put(api(`/rooms/${demo.room._id}`)).set("X-Demo-Token", demo.djToken)
            .send({ roomName: "My demo", roomDescription: "Testing edits", roomCreator: "forged" })).status).toBe(200);
        expect((await request(app).put(api(`/requests/${id}/mark-playing`)).set("X-Demo-Token", demo.djToken)).status).toBe(200);
        expect((await readQueue(demo)).body.requests.filter((r: DemoRequest) => r.status === "playing").map((r: DemoRequest) => r._id)).toEqual([id]);
        expect((await request(app).put(api(`/requests/${id}/mark-played`)).set("X-Demo-Token", demo.djToken)).body.request.status).toBe("played");
        expect((await request(app).delete(api(`/requests/${id}/delete`)).set("X-Demo-Token", demo.djToken)).status).toBe(200);
        expect((await request(app).put(api("/rooms/end")).set("X-Demo-Token", demo.djToken).send({ roomId: demo.room._id })).status).toBe(200);
        expect((await request(app).post(api("/requests")).set("X-Demo-Token", demo.guestToken).send({ roomId: demo.room._id })).status).toBe(409);
        expect((await request(app).post("/api/demo/reset").set("X-Demo-Token", demo.guestToken)).status).toBe(200);
        const reset = await request(app).get("/api/demo/session").set("X-Demo-Token", demo.djToken);
        expect(reset.body.room.active).toBe(true);
        expect(reset.body.room.roomName).toBe("The Sway Demo");
        expect(reset.body.room._id).toBe(demo.room._id);
        expect(reset.body.expiresAt).toBe(demo.expiresAt);
        const resetQueue = (await readQueue(demo)).body.requests;
        expect(resetQueue).toHaveLength(8);
        expect(resetQueue.filter((r: DemoRequest) => r.status !== "played").map((r: DemoRequest) => r.track.title)).toEqual(defaultQueueTitles);
    });

    it("rejects unauthenticated and expired access before cleanup runs", async () => {
        const demo = await start();
        expect((await request(app).get(api(`/rooms/${demo.room.roomCode}`))).status).toBe(401);
        expect((await request(app).get("/api/demo/session").set("X-Demo-Token", "a".repeat(64))).status).toBe(410);
        await DemoSession.updateOne({ djTokenHash: hashDemoToken(demo.djToken) }, { expiresAt: new Date(Date.now() - 1) });
        expect((await readQueue(demo)).status).toBe(410);
        expect((await request(app).post("/api/demo/reset").set("X-Demo-Token", demo.djToken)).status).toBe(410);
    });

    it("cleans only expired demo data and preserves active demos and real accounts", async () => {
        const expired = await start(); const active = await start();
        const user = await User.create({ email: "real@example.com", password: "password123" });
        await DemoSession.updateOne({ djTokenHash: hashDemoToken(expired.djToken) }, { expiresAt: new Date(Date.now() - 1) });
        await cleanupExpiredDemos(); await cleanupExpiredDemos();
        expect(await DemoSession.countDocuments()).toBe(1);
        expect((await readQueue(active)).status).toBe(200);
        expect(await User.findById(user._id)).not.toBeNull();
    });

    it("blocks credentials, external integrations and production writes even with a real login cookie", async () => {
        const demo = await start();
        const user = await User.create({ email: "real@example.com", password: "password123" });
        const cookie = `jwt=${jwt.sign({ userId: user._id }, "testsecretjwt_supersecure_32bytes_1234567")}`;
        for (const path of ["/users/password", "/auth", "/spotify/connect", "/rooms"]) {
            expect((await request(app).post(api(path)).set("X-Demo-Token", demo.djToken).send({ password: "changed" })).status).toBe(403);
        }
        expect((await request(app).post("/api/rooms").set("Cookie", cookie).set("X-Demo-Token", demo.djToken)
            .send({ roomName: "Escape", roomDescription: "Escape" })).status).toBe(403);
        const me = await request(app).get("/api/users/me").set("Cookie", cookie);
        expect(me.body.user._id).toBe(String(user._id));
        expect(await Room.countDocuments()).toBe(0);
    });

    it("uses Spotify search and limits session creation", async () => {
        const demo = await start();
        const search = await request(app).get(api("/spotify/search?q=dua")).set("X-Demo-Token", demo.guestToken);
        expect(search.status).toBe(200);
        expect(searchDemoSpotify).toHaveBeenCalledWith("dua");
        expect(search.body.tracks.length).toBeGreaterThan(0);
        for (let i = 0; i < 9; i++) await start();
        expect((await request(app).post("/api/demo/session")).status).toBe(429);
    });

    it("prevents simultaneous playback changes from creating two now-playing tracks", async () => {
        const demo = await start();
        const queue = await readQueue(demo);
        const pending: DemoRequest[] = queue.body.requests.filter((r: DemoRequest) => r.status === "pending");
        const changes = await Promise.all(pending.slice(0, 2).map((r) => request(app)
            .put(api(`/requests/${r._id}/mark-playing`)).set("X-Demo-Token", demo.djToken)));
        expect(changes.every((r) => [200, 409].includes(r.status))).toBe(true);
        expect(changes.some((r) => r.status === 200)).toBe(true);
        expect((await readQueue(demo)).body.requests.filter((r: DemoRequest) => r.status === "playing")).toHaveLength(1);
    });

    it("enforces per-session write limits without preventing reads", async () => {
        const demo = await start();
        // Denied mutations still count, preventing cheap abuse of expensive validation.
        for (let i = 0; i < 40; i++) {
            const result = await request(app).post(api("/users/password")).set("X-Demo-Token", demo.djToken);
            expect(result.status).toBe(403);
        }
        expect((await request(app).post("/api/demo/reset").set("X-Demo-Token", demo.djToken)).status).toBe(429);
        expect((await readQueue(demo)).status).toBe(200);
    });

    it("accepts any real Spotify result, not only seeded tracks, and ignores forged metadata", async () => {
        const demo = await start();
        const found = { ...demoCatalog[9]!, id: "0123456789abcdefghijkl", name: "A searched Spotify song", uri: "spotify:track:0123456789abcdefghijkl" };
        vi.mocked(searchDemoSpotify).mockResolvedValueOnce([found]);
        vi.mocked(getDemoSpotifyTrack).mockResolvedValueOnce(found);
        const search = await request(app).get(api("/spotify/search?q=new%20song")).set("X-Demo-Token", demo.guestToken);
        expect(search.body.tracks[0].id).toBe(found.id);
        const added = await request(app).post(api("/requests")).set("X-Demo-Token", demo.guestToken)
            .send({ roomId: demo.room._id, track: { spotifyTrackId: found.id, title: "Forged", albumArtUrl: "https://attacker.invalid/image" } });
        expect(added.status).toBe(201);
        expect(getDemoSpotifyTrack).toHaveBeenCalledWith(found.id);
        expect(added.body.request.track.title).toBe(found.name);
        expect(added.body.request.track.albumArtUrl).toBe(found.albumImage);
    });

    it("validates Spotify inputs and rejects expired tokens before calling Spotify", async () => {
        const demo = await start();
        for (const query of ["", "a", "a".repeat(101), "q[]=test"]) {
            const url = query.startsWith("q[]") ? `/spotify/search?${query}` : `/spotify/search?q=${query}`;
            expect((await request(app).get(api(url)).set("X-Demo-Token", demo.guestToken)).status).toBe(400);
        }
        expect(searchDemoSpotify).not.toHaveBeenCalled();
        expect((await request(app).post(api("/requests")).set("X-Demo-Token", demo.guestToken)
            .send({ roomId: demo.room._id, track: { spotifyTrackId: "demo-track-1" } })).status).toBe(400);
        expect(getDemoSpotifyTrack).not.toHaveBeenCalled();
        await DemoSession.updateOne({ djTokenHash: hashDemoToken(demo.djToken) }, { expiresAt: new Date(Date.now() - 1) });
        expect((await request(app).get(api("/spotify/search?q=test")).set("X-Demo-Token", demo.guestToken)).status).toBe(410);
        expect(searchDemoSpotify).not.toHaveBeenCalled();
    });

    it("enforces the shared DJ/guest Spotify limit including direct track submissions", async () => {
        const demo = await start();
        for (let i = 0; i < 20; i++) {
            expect((await request(app).get(api("/spotify/search?q=dua")).set("X-Demo-Token", i % 2 ? demo.djToken : demo.guestToken)).status).toBe(200);
        }
        const limit = await request(app).get(api("/spotify/search?q=daft")).set("X-Demo-Token", demo.guestToken);
        expect(limit.status).toBe(429);
        expect(limit.headers["retry-after"]).toBeDefined();
        expect((await request(app).get(api(`/spotify/tracks/${demoCatalog[0]!.id}`)).set("X-Demo-Token", demo.djToken)).status).toBe(429);
        expect((await request(app).post(api("/requests")).set("X-Demo-Token", demo.guestToken).send({ roomId: demo.room._id, track: { spotifyTrackId: demoCatalog[9]!.id } })).status).toBe(429);
        expect(searchDemoSpotify).toHaveBeenCalledTimes(20);
        expect(getDemoSpotifyTrack).not.toHaveBeenCalled();
        expect((await readQueue(demo)).status).toBe(200);
    });

    it("preserves provider rate-limit errors and Retry-After", async () => {
        const demo = await start();
        vi.mocked(searchDemoSpotify).mockRejectedValueOnce(new DemoSpotifyError(429, "Spotify is busy.", 42));
        const response = await request(app).get(api("/spotify/search?q=daft")).set("X-Demo-Token", demo.guestToken);
        expect(response.status).toBe(429);
        expect(response.headers["retry-after"]).toBe("42");
        expect(response.body.message).toBe("Spotify is busy.");
    });
});

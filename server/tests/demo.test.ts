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
        const analytics = await request(app).get(api(`/analytics/${demo.user._id}/recommended-tracks`)).set("X-Demo-Token", demo.djToken);
        expect(analytics.body.tracks).toHaveLength(19);
    });

    it("provides distinct recommendation rows with varied simulated play counts", async () => {
        const demo = await start();
        const recommended = await request(app).get(api(`/analytics/${demo.user._id}/recommended-tracks`)).set("X-Demo-Token", demo.djToken);
        const tracks: any[] = recommended.body.tracks;
        expect(recommended.body.source).toBe("personal");
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

    it("converts an already queued demo request into a vote", async () => {
        const demo = await start();
        const before = (await readQueue(demo)).body.requests;
        const original = before.find((item: DemoRequest) => item.status === "pending");
        const response = await request(app).post(api("/requests")).set("X-Demo-Token", demo.guestToken)
            .send({ roomId: demo.room._id, track: { spotifyTrackId: original.track.spotifyTrackId } });
        expect(response.status).toBe(200);
        expect(response.body.alreadyQueued).toBe(true);
        expect(response.body.request._id).toBe(original._id);
        expect(response.body.request.votes).toBe(original.votes + 1);
        expect((await readQueue(demo)).body.requests).toHaveLength(before.length);
        expect(getDemoSpotifyTrack).not.toHaveBeenCalled();
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

describe("Demo explicit filter", () => {
    const explicitTrack = { ...demoCatalog[9]!, id: "Explicit0123456789abcd", name: "Explicit song", explicit: true };
    const cleanTrack = { ...demoCatalog[10]!, id: "Clean01234567890123abc", name: "Clean song", explicit: false };
    const catalog = [explicitTrack, cleanTrack];
    const blocked = { success: false, error: "Unprocessable Entity: explicit track", message: "This room isn't accepting explicit songs." };
    const editRoom = (demo: DemoStart, body: object, token = demo.djToken) => request(app).put(api(`/rooms/${demo.room._id}`))
        .set("X-Demo-Token", token).send({ roomName: "Demo", roomDescription: "d", ...body });
    const requestTrack = (demo: DemoStart, spotifyTrackId: string) => request(app).post(api("/requests"))
        .set("X-Demo-Token", demo.guestToken).send({ roomId: demo.room._id, track: { spotifyTrackId } });
    const fetchQueue = (demo: DemoStart) => request(app).get(api(`/rooms/${demo.room.roomCode}/fetch/requests`)).set("X-Demo-Token", demo.guestToken);

    beforeEach(() => {
        vi.mocked(getDemoSpotifyTrack).mockImplementation(async (id) => {
            const track = [...catalog, ...demoCatalog].find((t) => t.id === id);
            if (!track) throw new DemoSpotifyError(404, "Track not found.");
            return track;
        });
    });

    it("allows explicit songs by default and returns the setting with the room", async () => {
        const demo = await start();
        expect(demo.room.allowExplicit).toBe(true);
        const details = await request(app).get(api(`/rooms/${demo.room.roomCode}`)).set("X-Demo-Token", demo.guestToken);
        expect(details.body.roomDetails.allowExplicit).toBe(true);
        const added = await requestTrack(demo, explicitTrack.id);
        expect(added.status).toBe(201);
        expect(added.body.request.track.explicit).toBe(true);
    });

    it("toggles and persists the setting, rejecting non-boolean values", async () => {
        const demo = await start();
        const off = await editRoom(demo, { allowExplicit: false });
        expect(off.status).toBe(200);
        expect(off.body.updatedRoom.allowExplicit).toBe(false);
        expect((await request(app).get("/api/demo/session").set("X-Demo-Token", demo.guestToken)).body.room.allowExplicit).toBe(false);
        expect((await request(app).get(api(`/rooms/${demo.room._id}`)).set("X-Demo-Token", demo.guestToken)).body.roomDetails.allowExplicit).toBe(false);
        // Omitting the field leaves it unchanged.
        expect((await editRoom(demo, {})).body.updatedRoom.allowExplicit).toBe(false);
        for (const allowExplicit of ["false", 0, null]) {
            const invalid = await editRoom(demo, { allowExplicit });
            expect(invalid.status).toBe(400);
            expect(invalid.body).toEqual({ success: false, error: "Invalid Credentials: allowExplicit must be a boolean", message: "The explicit songs setting must be on or off." });
        }
        expect((await editRoom(demo, { allowExplicit: true }, demo.guestToken)).status).toBe(403);
        expect((await request(app).get("/api/demo/session").set("X-Demo-Token", demo.djToken)).body.room.allowExplicit).toBe(false);
        expect((await editRoom(demo, { allowExplicit: true })).body.updatedRoom.allowExplicit).toBe(true);
    });

    it("blocks explicit tracks when the room is clean and lets them in once toggled back", async () => {
        const demo = await start();
        await editRoom(demo, { allowExplicit: false });
        const before = (await fetchQueue(demo)).body.data.length;
        const rejected = await requestTrack(demo, explicitTrack.id);
        expect(rejected.status).toBe(422);
        expect(rejected.body).toEqual(blocked);
        expect((await fetchQueue(demo)).body.data).toHaveLength(before);
        const clean = await requestTrack(demo, cleanTrack.id);
        expect(clean.status).toBe(201);
        expect(clean.body.request.track.explicit).toBe(false);
        await editRoom(demo, { allowExplicit: true });
        const allowed = await requestTrack(demo, explicitTrack.id);
        expect(allowed.status).toBe(201);
        expect(allowed.body.request.track.explicit).toBe(true);
        const rows = (await fetchQueue(demo)).body.data;
        expect(rows.find((r: { title: string }) => r.title === explicitTrack.name).explicit).toBe(true);
        expect(rows.find((r: { title: string }) => r.title === cleanTrack.name).explicit).toBe(false);
        // Seeded snapshot tracks have no flag, so it stays unknown.
        expect(rows.find((r: { title: string }) => r.title === "DtMF")).not.toHaveProperty("explicit");
    });

    it("rejects a request for an already-queued explicit track, but not a vote", async () => {
        const demo = await start();
        const queued = await requestTrack(demo, explicitTrack.id);
        await editRoom(demo, { allowExplicit: false });
        const again = await requestTrack(demo, explicitTrack.id);
        expect(again.status).toBe(422);
        expect(again.body).toEqual(blocked);
        const vote = await request(app).put(api("/requests/vote")).set("X-Demo-Token", demo.djToken).send({ requestId: queued.body.request._id });
        expect(vote.status).toBe(200);
    });

    it("checks queued seed tracks with Spotify and fails closed when it can't confirm", async () => {
        const demo = await start();
        await editRoom(demo, { allowExplicit: false });
        const seeded = (await readQueue(demo)).body.requests.find((r: DemoRequest) => r.status === "pending");
        vi.mocked(getDemoSpotifyTrack).mockRejectedValueOnce(new DemoSpotifyError(503, "Spotify is temporarily unavailable."));
        const unknown = await requestTrack(demo, seeded.track.spotifyTrackId);
        expect(unknown.status).toBe(503);
        expect(unknown.body).toEqual({ success: false, error: "Service Unavailable", message: "We couldn't check this song right now, please try again shortly." });
        vi.mocked(getDemoSpotifyTrack).mockRejectedValueOnce(new DemoSpotifyError(429, "Spotify is busy.", 7));
        const busy = await requestTrack(demo, cleanTrack.id);
        expect(busy.status).toBe(503);
        expect(busy.headers["retry-after"]).toBe("7");
        expect((await readQueue(demo)).body.requests.find((r: DemoRequest) => r._id === seeded._id).votes).toBe(seeded.votes);
        vi.mocked(getDemoSpotifyTrack).mockResolvedValueOnce({ ...demoCatalog[0]!, id: seeded.track.spotifyTrackId, explicit: false });
        expect((await requestTrack(demo, seeded.track.spotifyTrackId)).body.alreadyQueued).toBe(true);
    });
});

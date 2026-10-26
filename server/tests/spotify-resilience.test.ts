import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import { initSocketIO } from "../src/controllers/request.controller";

vi.unmock("../src/services/spotify-client.ts");
vi.mock("../src/services/spotify-token", () => ({ getAccessToken: vi.fn().mockResolvedValue("test-token") }));
vi.mock("axios", async (importOriginal) => {
    const original = await importOriginal<typeof import("axios")>();
    return { ...original, default: { ...original.default, get: vi.fn() } };
});

const id = "4uLU6hMCjMI75M1A2tKUQC";
const otherId = "0DiWol3AO6WpXZgp0goxAV";
const raw = { id, name: "Canonical title", artists: [{ name: "Canonical artist" }], album: { name: "Album", images: [{ url: "https://i.scdn.co/image/canonical" }] }, duration_ms: 123000 };
const client = { id, name: "Forged title", artist: "Forged artist", albumImage: "https://example.com/forged" };
const emit = vi.fn();
let roomId: string;
let now = Date.now();
const submit = (track: Record<string, unknown> = client) => request(app).post("/api/requests").set("Cookie", `sway_guest=${randomUUID()}`).send({ roomId, track });
const timeout = () => ({ isAxiosError: true, code: "ECONNABORTED", config: { headers: { Authorization: "secret-upstream-token" } } });
const throttled = (retryAfter: string) => ({ isAxiosError: true, response: { status: 429, headers: { "retry-after": retryAfter } } });

beforeEach(async () => {
    now += 10 * 60_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(axios.get).mockReset().mockRejectedValue(new Error("Unexpected Spotify HTTP call"));
    await SongRequest.init();
    const room = await Room.create({ roomName: "Spotify", roomDescription: "Spotify resilience", roomCode: "SPOTI", roomCreator: new mongoose.Types.ObjectId() });
    roomId = String(room._id);
    emit.mockClear();
    initSocketIO({ to: () => ({ emit }) });
});
afterEach(() => vi.restoreAllMocks());

const paths = ["/api/spotify/search?q=track", `/api/spotify/tracks/${id}`, `/api/spotify/artists/${id}/top-tracks`];
describe("Production Spotify resilience", () => {
    it.each(paths)("returns a clean 503 for an upstream timeout on %s", async (path) => {
        vi.mocked(axios.get).mockRejectedValueOnce(timeout());
        const response = await request(app).get(path).expect(503);
        expect(response.body).toEqual({ success: false, error: "Service Unavailable", message: "Spotify is temporarily unavailable. Please try again shortly." });
        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("https://api.spotify.com/v1/"), expect.objectContaining({ timeout: 8000 }));
        expect(JSON.stringify(response.body)).not.toContain("secret-upstream-token");
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("secret-upstream-token");
    });

    it.each(paths)("returns Retry-After and suppresses further upstream calls after 429 on %s", async (path) => {
        vi.mocked(axios.get).mockRejectedValueOnce(throttled("45"));
        const first = await request(app).get(path).expect(429);
        expect(first.headers["retry-after"]).toBe("45");
        expect(first.body).toMatchObject({ success: false, error: "Too Many Requests" });
        await request(app).get(`/api/spotify/tracks/${otherId}`).expect(429);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it("resumes after Retry-After expires without caching the provider failure", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(throttled("2"));
        await request(app).get("/api/spotify/search?q=retry").expect(429);
        now += 2001;
        vi.mocked(axios.get).mockResolvedValueOnce({ data: { tracks: { items: [raw] } } });
        const response = await request(app).get("/api/spotify/search?q=retry").expect(200);
        expect(response.body.tracks[0].name).toBe(raw.name);
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it("supports an HTTP-date Retry-After header", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(throttled(new Date(now + 30_000).toUTCString()));
        const response = await request(app).get("/api/spotify/search?q=date").expect(429);
        expect(Number(response.headers["retry-after"])).toBeGreaterThanOrEqual(29);
        expect(Number(response.headers["retry-after"])).toBeLessThanOrEqual(30);
    });

    it("coalesces concurrent searches and shares canonical track cache with submissions", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: { tracks: { items: [raw] } } });
        const responses = await Promise.all([request(app).get("/api/spotify/search?q=Track"), request(app).get("/api/spotify/search?q=track")]);
        expect(responses.every(({ status }) => status === 200)).toBe(true);
        await request(app).get(`/api/spotify/tracks/${id}`).expect(200);
        const created = await submit().expect(201);
        expect(created.body.request.track.title).toBe(raw.name);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it("caches artist top tracks", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: { tracks: [raw] } });
        const first = await request(app).get(`/api/spotify/artists/${id}/top-tracks`).expect(200);
        const second = await request(app).get(`/api/spotify/artists/${id}/top-tracks`).expect(200);
        expect(first.body.tracks).toEqual(second.body.tracks);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });
});

describe("Server-owned request metadata", () => {
    it("overrides supplied metadata and skips lookup and client metadata validation for a queued track", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: raw });
        const created = await submit().expect(201);
        expect(created.body.request.track).toMatchObject({ spotifyTrackId: id, title: raw.name, artist: "Canonical artist", albumArtUrl: raw.album.images[0]!.url });
        const duplicate = await submit({ id }).expect(200);
        expect(duplicate.body.request._id).toBe(created.body.request._id);
        expect(duplicate.body.request.track.title).toBe(raw.name);
        expect(duplicate.body.request.votes).toBe(2);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it("accepts an ID without client metadata when Spotify resolves it", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: raw });
        const created = await submit({ id }).expect(201);
        expect(created.body.request.track.title).toBe(raw.name);
    });

    it.each(["timeout", "429"])("falls back to bounded client metadata on %s", async (error) => {
        vi.mocked(axios.get).mockRejectedValueOnce(error === "timeout" ? timeout() : throttled("45"));
        const created = await submit({ ...client, name: "t".repeat(500), artist: "a".repeat(500), albumImage: `https://example.com/${"x".repeat(2050)}` }).expect(201);
        expect(created.body.request.track.title).toHaveLength(200);
        expect(created.body.request.track.artist).toHaveLength(200);
        expect(created.body.request.track.albumArtUrl).toBeUndefined();
        expect(created.body.request.votes).toBe(1);
        expect(emit).toHaveBeenCalledTimes(1);
    });

    it("preserves safe fallback artwork while rejecting unsafe URLs and missing text", async () => {
        vi.mocked(axios.get).mockRejectedValue(timeout());
        const safe = await submit(client).expect(201);
        expect(safe.body.request.track.albumArtUrl).toBe(client.albumImage);
        const unsafe = await submit({ ...client, id: otherId, albumImage: "javascript:alert(1)" }).expect(201);
        expect(unsafe.body.request.track.albumArtUrl).toBeUndefined();
        await submit({ id: "missing", name: {}, artist: "Artist" }).expect(400);
        expect(await SongRequest.countDocuments({ roomId })).toBe(2);
    });

    it("uses fallback metadata when the provider returns a malformed track", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ data: { id } });
        const created = await submit().expect(201);
        expect(created.body.request.track.title).toBe(client.name);
    });

    it("returns 404 for an unavailable track rather than treating it as an outage", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
        await submit().expect(404);
        expect(await SongRequest.countDocuments({ roomId })).toBe(0);
    });

    it("allows existing-track votes while another submission waits for metadata", async () => {
        await SongRequest.create({ roomId, votes: 0, track: { spotifyTrackId: otherId, title: "Queued", artist: "Artist", spotifyLink: "link", spotifyURI: "uri" } });
        let finish!: (value: unknown) => void;
        vi.mocked(axios.get).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
        const pending = submit().then((response) => response);
        await vi.waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
        try {
            await submit({ id: otherId }).timeout(1000).expect(200);
        } finally { finish({ data: raw }); }
        expect((await pending).status).toBe(201);
    });
});

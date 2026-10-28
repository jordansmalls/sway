import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import Vote from "../src/models/vote.model";
import { initSocketIO } from "../src/controllers/request.controller";
import { getSpotifyTrack, normalize, type SpotifyCatalogTrack } from "../src/services/spotify-client";
import { authCookie } from "./cookies";

const emit = vi.fn();
const id = "4uLU6hMCjMI75M1A2tKUQC";
const raw = { id, name: "Canonical title", artists: [{ name: "Canonical artist" }], album: { name: "Album", images: [{ url: "https://i.scdn.co/image/canonical" }] }, duration_ms: 123000 };
const canonical = (explicit: boolean): SpotifyCatalogTrack => ({ ...normalize(raw), explicit });
// The client always claims the track is clean; only Spotify's answer counts.
const track = { id, name: "Client title", artist: "Client artist", explicit: false };
const add = (roomId: string, guest = randomUUID()) =>
    request(app).post("/api/requests").set("Cookie", `sway_guest=${guest}`).send({ roomId, track });
const room = async (allowExplicit: boolean) =>
    String((await Room.create({ roomName: "Filter", roomDescription: "Explicit filter", roomCode: "FILTR", roomCreator: new mongoose.Types.ObjectId(), allowExplicit }))._id);

const expectNothingWritten = async () => {
    expect(await SongRequest.countDocuments()).toBe(0);
    expect(await Vote.countDocuments()).toBe(0);
    expect(emit).not.toHaveBeenCalled();
};

beforeEach(async () => {
    await SongRequest.init();
    emit.mockClear();
    vi.mocked(getSpotifyTrack).mockClear();
    initSocketIO({ to: () => ({ emit }) });
});

describe("Explicit filter on requests", () => {
    it("admits an explicit track when the room allows explicit songs", async () => {
        const roomId = await room(true);
        vi.mocked(getSpotifyTrack).mockResolvedValueOnce(canonical(true));

        await add(roomId).expect(201);
        expect((await SongRequest.findOne({ roomId }))?.track.explicit).toBe(true);
    });

    it("rejects an explicit track in a blocking room without writing, voting, or emitting", async () => {
        const roomId = await room(false);
        vi.mocked(getSpotifyTrack).mockResolvedValueOnce(canonical(true));

        const response = await add(roomId).expect(422);
        expect(response.body).toEqual({ success: false, error: "Unprocessable Entity: explicit track", message: "This room isn't accepting explicit songs." });
        await expectNothingWritten();
    });

    it("admits a clean track in a blocking room", async () => {
        const roomId = await room(false);
        vi.mocked(getSpotifyTrack).mockResolvedValueOnce(canonical(false));

        await add(roomId).expect(201);
        expect((await SongRequest.findOne({ roomId }))?.track.explicit).toBe(false);
    });

    it("fails closed when Spotify can't confirm the track in a blocking room", async () => {
        const roomId = await room(false);

        const response = await add(roomId).expect(503);
        expect(response.body).toMatchObject({ success: false, message: "We couldn't check this song right now, please try again shortly." });
        await expectNothingWritten();
    });

    it("keeps the outage fallback when the room allows explicit songs", async () => {
        const roomId = await room(true);

        await add(roomId).expect(201);
        expect((await SongRequest.findOne({ roomId }))?.track.title).toBe("Client title");
    });

    it("blocks duplicate requests for a queued explicit track once the DJ turns the filter on, but not upvotes, and toggles back", async () => {
        const dj = authCookie(await request(app).post("/api/auth").send({ email: "dj@example.com", password: "password123" }).expect(201));
        const roomId = (await request(app).post("/api/rooms").set("Cookie", dj).send({ roomName: "Live set", roomDescription: "Tonight" }).expect(201)).body.newRoom._id;
        vi.mocked(getSpotifyTrack).mockResolvedValueOnce(canonical(true));

        const first = await add(roomId).expect(201);
        await request(app).put(`/api/rooms/${roomId}`).set("Cookie", dj).send({ allowExplicit: false }).expect(200);
        emit.mockClear();

        const blocked = await add(roomId).expect(422);
        expect(blocked.body.error).toBe("Unprocessable Entity: explicit track");
        expect(await SongRequest.countDocuments({ roomId })).toBe(1);
        expect(await Vote.countDocuments({ roomId })).toBe(1);
        expect(emit).not.toHaveBeenCalled();

        // D5: upvoting the existing row is not blocked.
        const upvote = await request(app).put("/api/requests/vote").set("Cookie", `sway_guest=${randomUUID()}`).send({ requestId: first.body.request._id }).expect(200);
        expect(upvote.body.request.votes).toBe(2);

        await request(app).put(`/api/rooms/${roomId}`).set("Cookie", dj).send({ allowExplicit: true }).expect(200);
        const allowed = await add(roomId).expect(200);
        expect(allowed.body).toMatchObject({ alreadyQueued: true, request: { votes: 3 } });
    });

    it("checks a legacy queued row with Spotify before accepting a duplicate", async () => {
        const roomId = await room(false);
        // Written before track.explicit existed.
        await SongRequest.collection.insertOne({ roomId: new mongoose.Types.ObjectId(roomId), status: "pending", votes: 1, requestedBy: null, guestId: "legacy-guest",
            playedAt: null, completedAt: null, createdAt: new Date(), updatedAt: new Date(),
            track: { spotifyTrackId: id, title: "Legacy title", artist: "Legacy artist", spotifyLink: `https://open.spotify.com/track/${id}`, spotifyURI: `spotify:track:${id}` } });
        vi.mocked(getSpotifyTrack).mockResolvedValueOnce(canonical(true));

        await add(roomId).expect(422);
        expect(getSpotifyTrack).toHaveBeenCalledExactlyOnceWith(id);
        expect(await Vote.countDocuments()).toBe(0);
        expect((await SongRequest.findOne({ roomId }))?.votes).toBe(1);
        expect(emit).not.toHaveBeenCalled();
    });
});

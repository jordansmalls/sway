import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../src/app";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import { initSocketIO } from "../src/controllers/request.controller";
import { getSpotifyTrack, normalize, type SpotifyCatalogTrack } from "../src/services/spotify-client";
import { resolveRequestTrack } from "../src/services/request-track";

const id = "4uLU6hMCjMI75M1A2tKUQC";
const raw = { id, name: "Canonical title", artists: [{ name: "Canonical artist" }], album: { name: "Album", images: [{ url: "https://i.scdn.co/image/canonical" }] }, duration_ms: 123000 };
const canonical = (explicit: boolean): SpotifyCatalogTrack => ({ ...normalize(raw), explicit });
// The client claims the opposite of Spotify to prove its flag is ignored.
const client = { id, name: "Forged title", artist: "Forged artist", explicit: false };
let roomId: string;

beforeEach(async () => {
    await SongRequest.init();
    initSocketIO({ to: () => ({ emit: vi.fn() }) });
    const room = await Room.create({ roomName: "Explicit", roomDescription: "Explicit capture", roomCode: "EXPLI", roomCreator: new mongoose.Types.ObjectId() });
    roomId = String(room._id);
});

describe("Explicit flag capture", () => {
    it("normalizes Spotify's explicit flag, treating a missing flag as clean", () => {
        expect(normalize({ ...raw, explicit: true }).explicit).toBe(true);
        expect(normalize({ ...raw, explicit: false }).explicit).toBe(false);
        expect(normalize(raw).explicit).toBe(false);
    });

    it("resolves explicit from the canonical track, never the client", async () => {
        vi.mocked(getSpotifyTrack).mockResolvedValueOnce(canonical(true));
        await expect(resolveRequestTrack(client)).resolves.toMatchObject({ title: "Canonical title", explicit: true });
        vi.mocked(getSpotifyTrack).mockResolvedValueOnce(canonical(false));
        await expect(resolveRequestTrack({ ...client, explicit: true } as typeof client)).resolves.toMatchObject({ explicit: false });
    });

    it("leaves explicit out when Spotify is unavailable", async () => {
        const metadata = await resolveRequestTrack({ ...client, explicit: true } as typeof client);
        expect(metadata.title).toBe("Forged title");
        expect("explicit" in metadata).toBe(false);
    });

    it("stores track.explicit on requests created through the API", async () => {
        vi.mocked(getSpotifyTrack).mockResolvedValueOnce(canonical(true));
        await request(app).post("/api/requests").set("Cookie", `sway_guest=${randomUUID()}`).send({ roomId, track: client }).expect(201);
        expect((await SongRequest.findOne({ roomId }))?.track.explicit).toBe(true);

        // Outage fallback: the field is absent, not false.
        await request(app).post("/api/requests").set("Cookie", `sway_guest=${randomUUID()}`).send({ roomId, track: { ...client, id: "0DiWol3AO6WpXZgp0goxAV", explicit: true } }).expect(201);
        const stored = await SongRequest.collection.findOne({ "track.spotifyTrackId": "0DiWol3AO6WpXZgp0goxAV" });
        expect(stored?.track).not.toHaveProperty("explicit");
    });
});

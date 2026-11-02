import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import User from "../src/models/user.model";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import { popularTracks } from "../src/utils/popular.tracks";

const createDj = async (username: string) => {
    const user = await User.create({ username, email: `${username}@example.com`, password: "password123" });
    const room = await Room.create({ roomName: "Set", roomDescription: "Recommendation tests", roomCode: username.slice(0, 5).toUpperCase(), roomCreator: user._id });
    return { userId: String(user._id), roomId: room._id };
};

const playTracks = (roomId: unknown, count: number, prefix: string, playsPerTrack = (_index: number) => 1) =>
    SongRequest.insertMany(Array.from({ length: count }, (_, index) =>
        Array.from({ length: playsPerTrack(index) }, () => ({
            roomId, status: "played", playedAt: new Date(),
            track: { spotifyTrackId: `${prefix}-${index}`, title: `${prefix} ${index}`, artist: "Artist",
                spotifyLink: `https://open.spotify.com/track/${prefix}-${index}`, spotifyURI: `spotify:track:${prefix}-${index}` },
        }))).flat());

const explicitTrack = (id: string, explicit?: boolean) => ({
    spotifyTrackId: id, title: id, artist: "Artist", spotifyLink: `https://open.spotify.com/track/${id}`,
    spotifyURI: `spotify:track:${id}`, ...(explicit === undefined ? {} : { explicit }),
});

describe("Recommended tracks", () => {
    it("uses the DJ's own most played songs once they have 20 unique plays", async () => {
        const dj = await createDj("seasoned");
        await playTracks(dj.roomId, 25, "mine", (index) => (index === 24 ? 5 : 1));

        const response = await request(app).get(`/api/analytics/${dj.userId}/recommended-tracks`);
        expect(response.status).toBe(200);
        expect(response.body.source).toBe("personal");
        expect(response.body.tracks).toHaveLength(20);
        expect(response.body.tracks[0]).toMatchObject({ spotifyTrackId: "mine-24", playCount: 5 });
    });

    it("falls back to Sway's most played songs, topped up with popular tracks", async () => {
        const newcomer = await createDj("newcomer");
        const veteran = await createDj("veteran");
        await playTracks(newcomer.roomId, 5, "mine");
        await playTracks(veteran.roomId, 1, "global", () => 30);

        const response = await request(app).get(`/api/analytics/${newcomer.userId}/recommended-tracks`);
        const ids = response.body.tracks.map((track: any) => track.spotifyTrackId);
        expect(response.body.source).toBe("global");
        expect(response.body.tracks).toHaveLength(20);
        expect(response.body.tracks[0]).toMatchObject({ spotifyTrackId: "global-0", playCount: 30 });
        expect(new Set(ids).size).toBe(20);
        expect(ids.slice(6)).toEqual(popularTracks.slice(0, 14).map((track) => track.spotifyTrackId));
    });

    it("includes explicit from each track's most recent request and omits it when unknown", async () => {
        const dj = await createDj("explicit");
        await playTracks(dj.roomId, 20, "mine");
        const play = (id: string, createdAt: string, explicit?: boolean) =>
            ({ roomId: dj.roomId, status: "played", playedAt: new Date(), createdAt: new Date(createdAt), track: explicitTrack(id, explicit) });
        // Played more than the filler tracks so all three land in the top 20
        await SongRequest.insertMany([
            play("dirty", "2026-01-01", false), play("dirty", "2026-02-01", true),
            play("clean", "2026-01-01", true), play("clean", "2026-02-01", false),
            play("legacy", "2026-01-01"), play("legacy", "2026-02-01"),
        ], { timestamps: false } as any);

        const response = await request(app).get(`/api/analytics/${dj.userId}/recommended-tracks`);
        const byId = new Map(response.body.tracks.map((item: any) => [item.spotifyTrackId, item]));
        expect(response.body.source).toBe("personal");
        expect(byId.get("dirty")).toMatchObject({ explicit: true });
        expect(byId.get("clean")).toMatchObject({ explicit: false });
        expect(byId.get("legacy")).toBeDefined();
        expect(byId.get("legacy")).not.toHaveProperty("explicit");
    });

    it("includes explicit on Sway's most played fallback tracks", async () => {
        const newcomer = await createDj("fresh");
        const veteran = await createDj("famous");
        await SongRequest.insertMany([
            { roomId: veteran.roomId, status: "played", playedAt: new Date(), track: explicitTrack("g-dirty", true) },
            { roomId: veteran.roomId, status: "played", playedAt: new Date(), track: explicitTrack("g-clean", false) },
            { roomId: veteran.roomId, status: "played", playedAt: new Date(), track: explicitTrack("g-legacy") },
        ]);

        // Step past the 1-hour most-played cache filled by the earlier fallback test
        const now = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2 * 60 * 60 * 1000);
        const response = await request(app).get(`/api/analytics/${newcomer.userId}/recommended-tracks`);
        now.mockRestore();
        const byId = new Map(response.body.tracks.map((item: any) => [item.spotifyTrackId, item]));
        expect(response.body.source).toBe("global");
        expect(byId.get("g-dirty")).toMatchObject({ explicit: true });
        expect(byId.get("g-clean")).toMatchObject({ explicit: false });
        expect(byId.get("g-legacy")).not.toHaveProperty("explicit");
        // Curated fallback tracks have no verified flag
        expect(popularTracks.every((track) => !("explicit" in track))).toBe(true);
    });
});

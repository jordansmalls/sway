import { describe, expect, it } from "vitest";
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
});

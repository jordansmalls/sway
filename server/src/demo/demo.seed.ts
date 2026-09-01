import { randomBytes } from "node:crypto";
import { demoQueueTracks, demoRecommendationTracks, demoSeedTracks } from "./demo.tracks";
import type { SpotifyCatalogTrack } from "./demo.spotify";

// Separate synthetic listening histories keep the two recommendation rows varied.
// These counts never contribute to real-user or global analytics.
export function demoRecommendations(scope: "personal" | "global") {
    const counts = [203, 331, 146, 387, 248, 319, 271, 456, 402, 168, 235, 524, 428, 312, 98, 361, 219, 176, 121];
    return demoRecommendationTracks.map((track, index) => ({
        spotifyTrackId: track.id, title: track.name, artist: track.artist,
        albumArtUrl: track.albumImage, spotifyLink: `https://open.spotify.com/track/${track.id}`,
        playCount: counts[index]!, requestCount: counts[index]! + 37,
        totalVotes: counts[index]! * 3, latestRequestedAt: null, latestPlayedAt: null,
    })).filter((_, index) => index % 2 === (scope === "personal" ? 0 : 1));
}

export function demoRequest(track: SpotifyCatalogTrack, roomId: string, requestedBy: string, index = 0) {
    const createdAt = new Date(Date.now() - index * 120_000).toISOString();
    return {
        _id: `demo-request-${randomBytes(12).toString("hex")}`,
        roomId, status: "pending", votes: 1, playedAt: null as string | null,
        completedAt: null as string | null, requestedBy, createdAt, updatedAt: createdAt,
        track: { spotifyTrackId: track.id, title: track.name, artist: track.artist,
            albumArtUrl: track.albumImage, spotifyLink: `https://open.spotify.com/track/${track.id}`, spotifyURI: `spotify:track:${track.id}` },
    };
}

export function seedDemo() {
    const suffix = randomBytes(12).toString("hex");
    const createdAt = new Date().toISOString();
    const user = { _id: `demo-user-${suffix}`, username: "demo_dj", email: "", isDemo: true,
        hasActiveRoom: true, hasUsername: true, active: true, admin: false, createdAt, updatedAt: createdAt };
    const room = { _id: `demo-room-${suffix}`, roomCode: `DEMO-${suffix.toUpperCase()}`, roomName: "The Sway Demo",
        roomDescription: "Your room. Your rhythm. Try requesting a track, voting for a favorite, or stepping behind the decks.",
        roomCreator: user._id, active: true, isDemo: true, createdAt, updatedAt: createdAt };
    // Keep the five active songs independent of the sample played tracklist.
    const requests = [...demoQueueTracks, ...demoSeedTracks.slice(5, 8)].map((track, index) => {
        const request = demoRequest(track, room._id, ["Alex", "Sam", "Taylor", "Jordan"][index % 4]!, 9 - index);
        request.votes = [12, 9, 7, 5, 4, 8, 6, 3][index]!;
        if (index === 0) { request.status = "playing"; request.playedAt = new Date().toISOString(); }
        if (index >= demoQueueTracks.length) { request.status = "played"; request.playedAt = request.createdAt; request.completedAt = request.createdAt; }
        return request;
    });
    return { user, room, requests, votedIds: [] as string[] };
}

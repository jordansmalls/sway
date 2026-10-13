import { demoExtraRecommendationTracks, demoQueueTracks, demoSeedTracks } from "../demo/demo.tracks";

// Curated pop fallback for recommendations when Sway doesn't have enough play history yet.
// Reuses the verified Spotify snapshots from the demo catalog.
const popularTrackIds = [
    "39LLxExYz6ewLAcYrzQQyP", // Levitating
    "6dOtVTDdiauQNBQEDOtlAB", // BIRDS OF A FEATHER
    "1vLqigPHwiFnXsfrLMehV1", // Espresso
    "4Dvkj6JhhA12EX05fT7y2e", // As It Was
    "7MXVkk9YMctZqd1Srtv4MB", // Starboy
    "3PfIrDoz19wz7qK7tYeu62", // Don't Start Now
    "1p80LdxRV74UKvL8gnD7ky", // Blank Space
    "3e9HZxeyfWwjeyPAMmWSSQ", // thank u, next
    "7J1uxwnxfQLu4APicE5Rnj", // Billie Jean
    "69kOkLUCkxIZYexIgSG8rq", // Get Lucky
    "6D8y7Bck8h11byRY88Pt2z", // Houdini
    "1IHWl5LamUGEuP4ozKQSXZ", // Tití Me Preguntó
    "3sK8wGT43QFpWrvNQsrQya", // DtMF
    "0GjEhVFGZW8afUYGChu3Rr", // Dancing Queen
    "4RvWPyQ5RL0ao9LPZeSouE", // Everybody Wants To Rule The World
    "0DiWol3AO6WpXZgp0goxAV", // One More Time
    "5b5cPscqVEMChvDqscVw26", // Training Season
    "2xLMifQCjDGFmkHkpNLD9h", // SICKO MODE
    "29iva9idM6rFCPUlu7Rhxl", // YUKON
    "6eDApnV9Jdb1nYahOlbbUh", // One Time
];

const catalog = new Map(
    [...demoSeedTracks, ...demoExtraRecommendationTracks, ...demoQueueTracks].map((track) => [track.id, track]),
);

export const popularTracks = popularTrackIds.map((id) => {
    const track = catalog.get(id)!;
    return {
        spotifyTrackId: track.id,
        title: track.name,
        artist: track.artist,
        albumArtUrl: track.albumImage,
        spotifyLink: `https://open.spotify.com/track/${track.id}`,
        spotifyURI: track.uri,
        playCount: 0,
    };
});

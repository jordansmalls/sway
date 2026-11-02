import { getSpotifyTrack, SpotifyError } from "./spotify-client.js";
import { createSpotifyLink, createSpotifyUriLink } from "../utils/formatters/format.spotify.js";

type ClientTrack = { id: string; name?: unknown; artist?: unknown; albumImage?: unknown };
function boundedText(value: unknown, max: number) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function artwork(value: unknown) {
    if (typeof value !== "string" || value.length > 2048) return undefined;
    try { return ["http:", "https:"].includes(new URL(value).protocol) ? value : undefined; }
    catch { return undefined; }
}

export async function resolveRequestTrack(track: ClientTrack) {
    let title: string;
    let artist: string;
    let albumArtUrl: string | undefined;
    // Only Spotify's answer counts; undefined means it couldn't be checked.
    let explicit: boolean | undefined;
    try {
        const canonical = await getSpotifyTrack(track.id);
        title = boundedText(canonical.name, 200);
        artist = boundedText(canonical.artist, 200);
        albumArtUrl = artwork(canonical.albumImage);
        explicit = canonical.explicit;
    } catch (error) {
        if (!(error instanceof SpotifyError) || ![429, 503].includes(error.status)) throw error;
        // A provider outage must not stop the queue during a set.
        title = boundedText(track.name, 200);
        artist = boundedText(track.artist, 200);
        albumArtUrl = artwork(track.albumImage);
    }
    if (!title || !artist) throw Object.assign(new Error("Please provide a track title and artist."), { status: 400, expose: true });
    return { spotifyTrackId: track.id, title, artist, albumArtUrl, spotifyLink: createSpotifyLink(track.id), spotifyURI: createSpotifyUriLink(track.id),
        ...(explicit === undefined ? {} : { explicit }) };
}

import axios from "axios";
import type { Response } from "express";
import { STATUS_CODES } from "node:http";
import { getAccessToken } from "./spotify-token.js";

export type SpotifyCatalogTrack = {
    id: string; name: string; artist: string; duration_ms: number;
    albumImage?: string; uri: string; album?: string; popularity?: number; previewUrl?: string | null;
};
type SpotifyRawTrack = {
    id: string; name: string; artists: { name: string }[]; duration_ms: number;
    album: { name: string; images: { url: string }[] }; popularity?: number; preview_url?: string | null;
};

export class SpotifyError extends Error {
    constructor(public status: number, message: string, public retryAfter?: number, public upstreamStatus?: number, public code?: string) { super(message); }
}

const CACHE_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
let blockedUntil = 0;
let tokenRequest: Promise<string> | null = null;

function cacheValue<T>(key: string, value: Promise<T>) {
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
    const entry = { expiresAt: Date.now() + CACHE_MS, value };
    cache.set(key, entry);
    // Do not cache errors or allow a rejected older call to evict a newer value.
    void value.catch(() => { if (cache.get(key) === entry) cache.delete(key); });
    return value;
}

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const entry = cache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.value as Promise<T>;
    cache.delete(key);
    return cacheValue(key, load());
}

function normalize(track: SpotifyRawTrack): SpotifyCatalogTrack {
    if (!track || typeof track.name !== "string" || !Array.isArray(track.artists) || !Array.isArray(track.album?.images)) {
        throw new SpotifyError(503, "Spotify is temporarily unavailable. Please try again shortly.");
    }
    return { id: track.id, name: track.name, artist: track.artists.map((a) => a.name).join(", "),
        album: track.album.name, albumImage: track.album.images[0]?.url, duration_ms: track.duration_ms,
        uri: `spotify:track:${track.id}`, popularity: track.popularity ?? 0, previewUrl: track.preview_url ?? null };
}

async function spotifyGet<T>(path: string, params?: Record<string, string | number>, beforeUpstream?: () => void): Promise<T> {
    const now = Date.now();
    if (now < blockedUntil) throw new SpotifyError(429, "Spotify is busy. Please wait before searching again.", Math.ceil((blockedUntil - now) / 1000));
    beforeUpstream?.();
    try {
        // Reuse the app's client-credentials token, never a visitor's Spotify account.
        tokenRequest ??= getAccessToken().finally(() => { tokenRequest = null; });
        const token = await tokenRequest;
        const response = await axios.get<T>(`https://api.spotify.com/v1${path}`, {
            params, headers: { Authorization: `Bearer ${token}` }, timeout: 8000,
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
            const retryAfter = error.response.headers["retry-after"];
            const delay = Number(retryAfter) || (Date.parse(String(retryAfter)) - Date.now()) / 1000;
            const seconds = Number.isFinite(delay) && delay > 0 ? Math.max(1, Math.ceil(delay)) : 30;
            blockedUntil = Date.now() + seconds * 1000;
            throw new SpotifyError(429, "Spotify is busy. Please wait before searching again.", seconds, 429, error.code);
        }
        if (axios.isAxiosError(error) && error.response?.status === 404) throw new SpotifyError(404, "That track is no longer available on Spotify. Please choose another.", undefined, 404, error.code);
        // Never return or log Axios request headers, which include API credentials.
        throw new SpotifyError(503, "Spotify is temporarily unavailable. Please try again shortly.", undefined, axios.isAxiosError(error) ? error.response?.status : undefined, axios.isAxiosError(error) ? error.code : undefined);
    }
}

export function searchSpotify(query: string, beforeUpstream?: () => void) {
    return cached(`search:${query.trim().toLowerCase()}`, async () => {
        const data = await spotifyGet<{ tracks: { items: (SpotifyRawTrack | null)[] } }>("/search", { q: query.trim(), type: "track", limit: 8 }, beforeUpstream);
        const tracks = data.tracks.items.filter((track): track is SpotifyRawTrack => Boolean(track?.id)).map(normalize);
        for (const track of tracks) cacheValue(`track:${track.id}`, Promise.resolve(track));
        return tracks;
    });
}

export function getSpotifyTrack(id: string, beforeUpstream?: () => void) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new SpotifyError(400, "Choose a valid Spotify track.");
    return cached(`track:${id}`, async () => normalize(await spotifyGet<SpotifyRawTrack>(`/tracks/${encodeURIComponent(id)}`, undefined, beforeUpstream)));
}

export function getSpotifyArtistTopTracks(id: string) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new SpotifyError(400, "Choose a valid Spotify artist.");
    return cached(`artist:${id}`, async () => {
        const data = await spotifyGet<{ tracks: SpotifyRawTrack[] }>(`/artists/${encodeURIComponent(id)}/top-tracks`, { market: "US" });
        return data.tracks.map(normalize);
    });
}

export function sendSpotifyError(error: unknown, res: Response) {
    const failure = error instanceof SpotifyError ? error : new SpotifyError(503, "Spotify is temporarily unavailable. Please try again shortly.");
    if (failure.retryAfter) res.set("Retry-After", String(failure.retryAfter));
    return res.status(failure.status).json({ success: false, error: STATUS_CODES[failure.status] ?? "Spotify Error", message: failure.message });
}

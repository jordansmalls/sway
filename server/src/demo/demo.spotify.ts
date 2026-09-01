import axios from "axios";
import type { Response } from "express";
import { getAccessToken } from "../controllers/spotify.controller";

export type SpotifyCatalogTrack = {
    id: string; name: string; artist: string; duration_ms: number;
    albumImage?: string; uri: string; album?: string; popularity?: number; previewUrl?: string | null;
};
type SpotifyRawTrack = {
    id: string; name: string; artists: { name: string }[]; duration_ms: number;
    album: { name: string; images: { url: string }[] }; popularity?: number; preview_url?: string | null;
};

export class DemoSpotifyError extends Error {
    constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}

const CACHE_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 500;
// All demo searches and uncached track verification share a conservative budget.
const UPSTREAM_WINDOW_MS = 30_000;
const MAX_UPSTREAM_CALLS = 30;
const cache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
let upstreamCalls: number[] = [];
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
    return { id: track.id, name: track.name, artist: track.artists.map((a) => a.name).join(", "),
        album: track.album.name, albumImage: track.album.images[0]?.url, duration_ms: track.duration_ms,
        uri: `spotify:track:${track.id}`, popularity: track.popularity ?? 0, previewUrl: track.preview_url ?? null };
}

async function spotifyGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const now = Date.now();
    if (now < blockedUntil) throw new DemoSpotifyError(429, "Spotify is busy. Please wait before searching again.", Math.ceil((blockedUntil - now) / 1000));
    upstreamCalls = upstreamCalls.filter((time) => time > now - UPSTREAM_WINDOW_MS);
    if (upstreamCalls.length >= MAX_UPSTREAM_CALLS) throw new DemoSpotifyError(429, "Demo music search is busy. Please try again shortly.", Math.max(1, Math.ceil((upstreamCalls[0]! + UPSTREAM_WINDOW_MS - now) / 1000)));
    upstreamCalls.push(now);
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
            const seconds = Math.max(1, Math.ceil(Number(error.response.headers["retry-after"]) || 30));
            blockedUntil = Date.now() + seconds * 1000;
            throw new DemoSpotifyError(429, "Spotify is busy. Please wait before searching again.", seconds);
        }
        if (axios.isAxiosError(error) && error.response?.status === 404) throw new DemoSpotifyError(404, "That track is no longer available on Spotify. Please choose another.");
        // Never return or log Axios request headers, which include API credentials.
        throw new DemoSpotifyError(503, "Spotify is temporarily unavailable. Please try again shortly.");
    }
}

export function searchDemoSpotify(query: string) {
    return cached(`search:${query.trim().toLowerCase()}`, async () => {
        const data = await spotifyGet<{ tracks: { items: (SpotifyRawTrack | null)[] } }>("/search", { q: query.trim(), type: "track", limit: 8 });
        const tracks = data.tracks.items.filter((track): track is SpotifyRawTrack => Boolean(track?.id)).map(normalize);
        for (const track of tracks) cacheValue(`track:${track.id}`, Promise.resolve(track));
        return tracks;
    });
}

export function getDemoSpotifyTrack(id: string) {
    if (!/^[A-Za-z0-9]{22}$/.test(id)) throw new DemoSpotifyError(400, "Choose a valid Spotify track.");
    return cached(`track:${id}`, async () => normalize(await spotifyGet<SpotifyRawTrack>(`/tracks/${id}`)));
}

export function sendDemoSpotifyError(error: unknown, res: Response) {
    const failure = error instanceof DemoSpotifyError ? error : new DemoSpotifyError(503, "Spotify is temporarily unavailable. Please try again shortly.");
    if (failure.retryAfter) res.set("Retry-After", String(failure.retryAfter));
    return res.status(failure.status).json({ success: false, message: failure.message });
}

import type { Response } from "express";
import { getSpotifyTrack, searchSpotify, SpotifyError } from "../services/spotify-client.js";
export type { SpotifyCatalogTrack } from "../services/spotify-client.js";
export { SpotifyError as DemoSpotifyError } from "../services/spotify-client.js";

// Keep the demo's independent upstream budget when sharing the catalog cache.
const UPSTREAM_WINDOW_MS = 30_000;
const MAX_UPSTREAM_CALLS = 30;
let upstreamCalls: number[] = [];
function consumeDemoBudget() {
    const now = Date.now();
    upstreamCalls = upstreamCalls.filter((time) => time > now - UPSTREAM_WINDOW_MS);
    if (upstreamCalls.length >= MAX_UPSTREAM_CALLS) throw new SpotifyError(429, "Demo music search is busy. Please try again shortly.", Math.max(1, Math.ceil((upstreamCalls[0]! + UPSTREAM_WINDOW_MS - now) / 1000)));
    upstreamCalls.push(now);
}

export function searchDemoSpotify(query: string) { return searchSpotify(query, consumeDemoBudget); }
export function getDemoSpotifyTrack(id: string) {
    if (!/^[A-Za-z0-9]{22}$/.test(id)) throw new SpotifyError(400, "Choose a valid Spotify track.");
    return getSpotifyTrack(id, consumeDemoBudget);
}
export function sendDemoSpotifyError(error: unknown, res: Response) {
    const failure = error instanceof SpotifyError ? error : new SpotifyError(503, "Spotify is temporarily unavailable. Please try again shortly.");
    if (failure.retryAfter) res.set("Retry-After", String(failure.retryAfter));
    return res.status(failure.status).json({ success: false, message: failure.message });
}

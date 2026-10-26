import axios from "axios";
import type { Request, Response } from "express";
import { getSpotifyArtistTopTracks, getSpotifyTrack, searchSpotify, sendSpotifyError, SpotifyError } from "../services/spotify-client.js";
export { getAccessToken } from "../services/spotify-token.js";

// Only the endpoint, upstream status and code: Axios errors carry request headers with API credentials.
function logSpotifyError(req: Request, endpoint: string, error: unknown) {
    req.log.error({
        endpoint,
        status: error instanceof SpotifyError ? error.upstreamStatus : axios.isAxiosError(error) ? error.response?.status : undefined,
        code: error instanceof SpotifyError ? error.code : axios.isAxiosError(error) ? error.code : undefined,
    }, "Spotify request failed");
}

/**
 * @desc    Search Spotify for Tracks
 * @route   GET /api/spotify/search
 * @access  PUBLIC
 */
export const searchTracks = async (req: Request, res: Response) => {
    const query = req.query.q;
    if (typeof query !== "string" || !query.trim() || query.length > 200) {
        return res.status(400).json({ success: false, error: "Bad Request", message: "A search query of up to 200 characters is required." });
    }
    try {
        return res.status(200).json({ success: true, tracks: await searchSpotify(query) });
    } catch (err) {
        logSpotifyError(req, "/v1/search", err);
        return sendSpotifyError(err, res);
    }
};

/**
 * @desc    Fetch Track Details
 * @route   GET /api/spotify/tracks/:id
 * @access  PUBLIC
 */
export const fetchTrackDetails = async (req: Request, res: Response) => {
    try {
        return res.status(200).json({ success: true, track: await getSpotifyTrack(String(req.params.id ?? "")) });
    } catch (err) {
        logSpotifyError(req, "/v1/tracks/:id", err);
        return sendSpotifyError(err, res);
    }
};

/**
 * @desc    Fetch Artist's Top Tracks
 * @route   GET /api/spotify/artists/:id/top-tracks
 * @access  PUBLIC
 */
export const fetchArtistTopTracks = async (req: Request, res: Response) => {
    try {
        return res.status(200).json({ success: true, tracks: await getSpotifyArtistTopTracks(String(req.params.id ?? "")) });
    } catch (err) {
        logSpotifyError(req, "/v1/artists/:id/top-tracks", err);
        return sendSpotifyError(err, res);
    }
};

import axios from "axios";
import config from "../config/config";

const CLIENT_ID = config.spotify_client_id
const CLIENT_SECRET = config.spotify_client_secret

// Cache the token to avoid unnecessary requests
let cachedToken = null;
let tokenExpiration = null;

const getAccessToken = async () => {
    // check for valid cached token
    if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
        return cachedToken;
    }

    try {
        // Get new token
        const response = await axios({
            method: "post",
            url: "https://accounts.spotify.com/api/token",
            params: {
                grant_type: "client_credentials",
            },
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization:
                    "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
            },
        });

        // Cache the token and expiration
        cachedToken = response.data.access_token;
        // Set expiration 10 seconds before actual expiry to be safe
        tokenExpiration = Date.now() + (response.data.expires_in - 10) * 1000;

        return cachedToken;
    } catch (err) {
        console.error("There was an error getting a token from Spotify:", err)
        throw err;
    }
};




/**
 * @desc    Search Spotify for Tracks
 * @route   GET /api/spotify/search
 * @access  PUBLIC
 */

export const searchTracks = async (req, res) => {
    try {
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: search query missing",
                message: "Search Query is required.",
            })
        }

        const token = await getAccessToken();

        const response = await axios({
            method: "get",
            url: "https://api.spotify.com/v1/search",
            params: {
                q: query,
                type: "track",
                limit: 8,
            },
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const tracks = response.data.tracks.items.map((track) => ({
            id: track.id,
            name: track.name,
            artist: track.artists.map((artist) => artist.name).join(", "),
            duration_ms: track.duration_ms,
            albumImage: track.album.images[track.album.images.length - 1]?.url,
            uri: track.uri,
        }));

        return res.status(200).json({
            success: true,
            tracks
            });
    } catch (err) {
        console.error("There was an error searching tracks:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again."
        })
    }
};


/**
 * @desc    Fetch Track Details
 * @route   GET /api/spotify/tracks/:id
 * @access  PUBLIC
 */

export const fetchTrackDetails = async (req, res) => {
    try {
        const trackId = req.params.id;

        if (!trackId) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: track id missing",
                message: "Track ID is required."
            })
        }

        const token = await getAccessToken();

        const response = await axios({
            method: "get",
            url: `https://api.spotify.com/v1/tracks/${trackId}`,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const track = {
            id: response.data.id,
            name: response.data.name,
            artist: response.data.artists.map((artist) => artist.name).join(", "),
            album: response.data.album.name,
            duration_ms: response.data.duration_ms,
            popularity: response.data.popularity,
            albumImage: response.data.album.images[0]?.url,
            previewUrl: response.data.preview_url,
            uri: response.data.uri,
        };
        return res.status(200).json({
            success: true,
            track
        })
    } catch (err) {
        console.error("There was an error fetching the details of a track:", err)
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again."
        })
    }
};

/**
 * @desc    Fetch Artist's Top Tracks
 * @route   GET /api/spotify/artists/:id/top-tracks
 * @access  PUBLIC
 */

export const fetchArtistTopTracks = async (req, res) => {
    try {
        const artistId = req.params.id;

        if (!artistId) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: artist ID missing",
                message: "Oops! Artist ID is required."
            })
        }

        const token = await getAccessToken();

        const response = await axios({
            method: "get",
            url: `https://api.spotify.com/v1/artists/${artistId}/top-tracks`,
            params: {
                market: "US",
            },
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const tracks = response.data.tracks.map((track) => ({
            id: track.id,
            name: track.name,
            album: track.album.name,
            duration_ms: track.duration_ms,
            albumImage: track.album.images[track.album.images.length - 1]?.url,
            uri: track.uri,
        }));

        return res.status(200).json({
            success: true,
            tracks
        })
    } catch (err) {
        console.error("There was an error fetching an artist's top tracks:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        })
    }
};





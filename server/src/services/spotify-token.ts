import axios from "axios";
import config from "../config/config";
import { logger } from "../config/logger";

const CLIENT_ID = config.spotify_client_id;
const CLIENT_SECRET = config.spotify_client_secret;

// Cache the token to avoid unnecessary requests
let cachedToken: string | null = null;
let tokenExpiration: number | null = null;

export const getAccessToken = async () => {
    // check for valid cached token
    if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
        return cachedToken;
    }

    try {
        // Get new token
        const response = await axios({
            method: "post",
            url: "https://accounts.spotify.com/api/token",
            timeout: 8000,
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
        cachedToken = response.data.access_token as string;
        // Set expiration 10 seconds before actual expiry to be safe
        tokenExpiration = Date.now() + (response.data.expires_in - 10) * 1000;

        return cachedToken;
    } catch (err) {
        logger.error({
            endpoint: "/api/token",
            status: axios.isAxiosError(err) ? err.response?.status : undefined,
            code: axios.isAxiosError(err) ? err.code : undefined,
        }, "Spotify request failed");
        throw err;
    }
};


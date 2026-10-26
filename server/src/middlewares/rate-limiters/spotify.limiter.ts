import rateLimit from "express-rate-limit";

/**
 * Catalog lookups for the normal Spotify routes. Search is debounced on the client and cached on the
 * server, so these only stop scripts. Keyed on the guest cookie (mount after `ensureGuestId`), with an
 * IP ceiling high enough for a venue's Wi-Fi.
 * 60 per guest and 1200 per IP, per minute
 */
export const SPOTIFY_GUEST_LIMIT = 60;
export const SPOTIFY_IP_LIMIT = 1200;

const message = {
    success: false,
    error: "Too Many Requests",
    message: "Too many searches, please wait a moment and try again.",
};

export const spotifyGuestLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: SPOTIFY_GUEST_LIMIT,
    keyGenerator: (req) => `guest:${req.cookies.sway_guest}`,
    message,
    standardHeaders: true,
    legacyHeaders: false,
});

export const spotifyIpLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: SPOTIFY_IP_LIMIT,
    message,
    standardHeaders: true,
    legacyHeaders: false,
});

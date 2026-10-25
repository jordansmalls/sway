import rateLimit from "express-rate-limit";

/**
 * Generous per-IP limit for public, read-only routes such as profile analytics.
 * A profile page load makes about ten of these calls, and venue Wi-Fi puts many guests behind one IP.
 * 300 requests per 15 minutes
 */
export const PUBLIC_READ_LIMIT = 300;

export const publicReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: PUBLIC_READ_LIMIT,
    message: {
        success: false,
        error: "Too Many Requests",
        message: "Too many requests, please try again in a few minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

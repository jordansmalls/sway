import rateLimit from "express-rate-limit";

/**
 * Implements rate limiting for upvoting songs
 * 5 upvotes per 30s
 */
export const voteLimiter = rateLimit({
    windowMs: 30 * 1000,
    max: 5,
    message: "Too many votes from this user, please try again soon.",
    standardHeaders: true,
    legacyHeaders: false,
});

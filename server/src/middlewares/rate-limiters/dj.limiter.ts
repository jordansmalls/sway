import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

type AuthenticatedRequest = Request & { user?: { _id: unknown } };

/**
 * Generous limit for authenticated DJ routes, keyed on the user ID so a DJ working through a
 * long set (React Query refetches on focus) is never locked out, and DJs sharing a venue IP
 * don't share a budget. Mount after `protect`.
 * 600 requests per 15 minutes
 */
export const DJ_LIMIT = 600;

export const djLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: DJ_LIMIT,
    keyGenerator: (req: AuthenticatedRequest) => (req.user?._id ? `user:${req.user._id}` : ipKeyGenerator(req.ip ?? "")),
    message: {
        success: false,
        error: "Too Many Requests",
        message: "Too many requests, please slow down and try again in a few minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

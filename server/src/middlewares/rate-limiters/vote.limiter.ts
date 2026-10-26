import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";

// Both guest writes share these stores. The IP ceiling accommodates venue Wi-Fi.
// A DJ adding to their own room (identifyRoomOwner) is not a guest; the DJ limiter covers them.
const skip = (_req: Request, res: Response) => Boolean(res.locals.roomOwner);

export const voteLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    keyGenerator: (req) => req.cookies.sway_guest,
    skip,
    message: "Too many requests from this guest, please try again soon.",
    standardHeaders: true,
    legacyHeaders: false,
});

export const guestIpLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    message: "Too many requests from this network, please try again soon.",
    skip,
    standardHeaders: true,
    legacyHeaders: false,
});

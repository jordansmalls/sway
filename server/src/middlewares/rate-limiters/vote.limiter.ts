import rateLimit from "express-rate-limit";

// Both guest writes share these stores. The IP ceiling accommodates venue Wi-Fi.
export const voteLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    keyGenerator: (req) => req.cookies.sway_guest,
    message: "Too many requests from this guest, please try again soon.",
    standardHeaders: true,
    legacyHeaders: false,
});

export const guestIpLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    message: "Too many requests from this network, please try again soon.",
    standardHeaders: true,
    legacyHeaders: false,
});

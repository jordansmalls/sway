import rateLimit from "express-rate-limit";

const generalLimiter = rateLimit({
    // 15 minutes
    // windowMs: 15 * 60 * 1000,

    // 2 hours (2 * 60 minutes * 60 seconds * 1000 milliseconds)
    windowMs: 2 * 60 * 60 * 1000,

    // maximum number of requests a single IP can make during the windowMs time frame.
    max: 100,

    // message is the response sent when the limit is exceeded.
    // message: "Too many requests from this IP, please try again after 15 minutes.",

    message: "Too many requests from this IP, please try again after 2 hours.",

    // standardHeaders: 'draft-7' is a common option to enable
    // standard RateLimit headers (RateLimit-Limit, RateLimit-Remaining, etc.).
    standardHeaders: true,

    // legacyHeaders: false disables the older X-RateLimit-* headers.
    legacyHeaders: false,
});

export default generalLimiter;

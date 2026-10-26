import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { getAuthCookieOptions } from "../utils/generate.jwt.js";

export const ensureGuestId: RequestHandler = (req, res, next) => {
    const existing = req.cookies?.sway_guest;
    const guestId = typeof existing === "string" && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(existing)
        ? existing.toLowerCase() : randomUUID();
    req.cookies ??= {};
    req.cookies.sway_guest = guestId;
    if (guestId !== existing) res.cookie("sway_guest", guestId, { ...getAuthCookieOptions(), maxAge: 365 * 24 * 60 * 60 * 1000 });
    next();
};

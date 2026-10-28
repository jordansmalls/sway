import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import User from "../models/user.model.js";
import Room from "../models/room.model.js";
import config from "../config/config.js";

type SessionUser = NonNullable<Awaited<ReturnType<typeof resolveSession>>["user"]>;

declare global {
    namespace Express {
        interface Request {
            /** Set by `protect` (always) and `identifyRoomOwner` (when the DJ owns the room). */
            user?: SessionUser;
        }
    }
}

/** The active user behind a session token, or the reason it was rejected. */
const resolveSession = async (token: string) => {
    let decoded;
    try {
        // validateRuntimeConfig refuses to start the server without a secret.
        decoded = jwt.verify(token, config.jwt_secret!);
    } catch {
        return { user: null, failure: "Not authorized, token failed" };
    }

    if (
        typeof decoded === "string" ||
        typeof decoded.userId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(decoded.userId)
    ) {
        return { user: null, failure: "Not authorized, token failed" };
    }

    const user = await User.findById(decoded.userId).select("-password");
    // Existing tokens without a version remain valid only until the first revocation.
    const sessionVersion = decoded.sessionVersion ?? 0;
    if (
        !user ||
        !user.active ||
        !Number.isSafeInteger(sessionVersion) ||
        sessionVersion !== user.sessionVersion
    ) {
        return { user: null, failure: "Not authorized, session revoked" };
    }

    return { user, failure: null };
};

const protect = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.jwt;
    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    const session = await resolveSession(token);
    if (!session.user) {
        return res.status(401).json({ message: session.failure });
    }

    req.user = session.user;
    next();
};

/**
 * For public routes that take a `roomId` body: marks a signed-in DJ adding to their own room, so
 * guest limits can step aside. Never rejects; anyone else continues as a guest.
 */
const identifyRoomOwner = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.jwt;
    const roomId = req.body?.roomId;
    if (typeof token === "string" && token && typeof roomId === "string" && Types.ObjectId.isValid(roomId)) {
        const { user } = await resolveSession(token);
        if (user && await Room.exists({ _id: roomId, roomCreator: user._id })) {
            req.user = user;
            res.locals.roomOwner = true;
        }
    }
    next();
};

export { protect, identifyRoomOwner };
export type { SessionUser };

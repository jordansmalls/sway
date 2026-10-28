import type { NextFunction, Request as ExpressRequest, Response } from "express";
import type { Types } from "mongoose";
import Vote from "../models/vote.model.js";
import { castVote, checkQueueCapacity, withQueueAdmission } from "../services/guest-votes.js";
import { ownedRequestFilter, transitionRequestStatus } from "../services/request-transitions.js";
import Room from "../models/room.model.js";
import Request from "../models/request.model.js";
import { resolveRequestTrack } from "../services/request-track.js";
import { logger } from "../config/logger.js";

/** The slice of the socket.io server the controllers emit through; tests pass a stub. */
type RoomEmitter = { to(room: string): { emit(event: string, data: unknown): unknown } };

// Socket.io instance - to be initalized in index.js and passed here
let io: RoomEmitter | undefined;

// Initialize socket.io
export const initSocketIO = (socketIO: RoomEmitter | undefined) => {
    io = socketIO;
};

type RoomId = Types.ObjectId | string;

// Emit event to room
const emitToRoom = (roomId: RoomId, event: string, data: unknown) => {
    if (io) {
        io.to(`room-${roomId}`).emit(event, data);
    } else {
        logger.warn({ roomId: String(roomId), event }, "emitToRoom called but io is not initialized");
    }
};

// Emit room ended event
export const emitRoomEnded = (roomId: RoomId) => {
    emitToRoom(roomId, "room:ended", { roomId });
};

//? Emit room update event
// export const emitRoomUpdated = (roomId, updatedData) => {
// 	emitToRoom(roomId, "room:updated", updatedData)
// }

export const emitRoomUpdated = (
    roomId: RoomId,
    updatedData: { roomName: string; roomDescription: string; allowExplicit: boolean },
) => {
    // normalize payload: include roomId as `roomId` so client can check easily
    const payload = {
        roomId,
        roomName: updatedData.roomName,
        roomDescription: updatedData.roomDescription,
        allowExplicit: updatedData.allowExplicit,
    };
    emitToRoom(roomId, "room:updated", payload);
};

/**
 * @desc    Create a Song Request
 * @route   POST /api/requests
 * @access  PUBLIC
 */
export const createRequest = async (req: ExpressRequest, res: Response, next: NextFunction) => {
    const { track, roomId, requestedBy } = req.body;

    // Validate required fields
    if (!track || !roomId) {
        return res.status(400).json({
            success: false,
            error: "Invalid Credentials: missing fields",
            message: "Please provide all required fields.",
        });
    }

    const { id: spotifyTrackId } = track;

    // Validate track details
    if (typeof spotifyTrackId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(spotifyTrackId)) {
        return res.status(400).json({
            success: false,
            error: "Invalid Credentials: missing required track details",
            message: "Please provide all required track details.",
        });
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
        return res.status(404).json({
            success: false,
            error: "Resource not found",
            message: "Room does not exist!",
        });
    }

    // Ended rooms are history; neither new requests nor duplicate upvotes may change them.
    if (!room.active) {
        return res.status(409).json({
            success: false,
            error: "Conflict - room has ended",
            message: "This room has ended and is no longer accepting requests.",
        });
    }

    try {
        const guestId = req.cookies.sway_guest;
        const capacity = { roomOwner: Boolean(res.locals.roomOwner) };
        const filter = { roomId, "track.spotifyTrackId": spotifyTrackId, status: { $in: ["pending", "playing"] as const } };
        let metadata: Awaited<ReturnType<typeof resolveRequestTrack>> | undefined;
        // When the room blocks explicit songs, only a track Spotify confirmed clean gets in (D4).
        // Rejections return before any write, vote, or emit; checkQueueCapacity only reads counts.
        const blocksExplicit = room.allowExplicit === false;
        const rejectExplicit = (explicit: boolean | undefined) => {
            if (!blocksExplicit || explicit === false) return undefined;
            return explicit
                ? res.status(422).json({ success: false, error: "Unprocessable Entity: explicit track", message: "This room isn't accepting explicit songs." })
                : res.status(503).json({ success: false, error: "Service Unavailable", message: "We couldn't check this song right now, please try again shortly." });
        };
        // Legacy queued rows have no stored flag, so ask Spotify (metadata is reused if already resolved).
        const queuedExplicit = async (queued: { track: { title: string; artist: string; explicit?: boolean | null } }) => {
            if (typeof queued.track.explicit === "boolean") return queued.track.explicit;
            metadata ??= await resolveRequestTrack({ id: spotifyTrackId, name: queued.track.title, artist: queued.track.artist });
            return metadata.explicit;
        };
        const existing = await Request.findOne(filter).select("track");
        if (!existing) {
            await checkQueueCapacity(roomId, guestId, capacity);
            metadata = await resolveRequestTrack(track);
            const rejected = rejectExplicit(metadata.explicit);
            if (rejected) return rejected;
        } else if (blocksExplicit) {
            const rejected = rejectExplicit(await queuedExplicit(existing));
            if (rejected) return rejected;
        }
        return await withQueueAdmission(String(roomId), async () => {
            const queued = await Request.findOne(filter);
            if (!queued) await checkQueueCapacity(roomId, guestId, capacity);
            // Re-check inside the lock: the queue may have changed since the pre-check.
            if (blocksExplicit) {
                const rejected = rejectExplicit(queued ? await queuedExplicit(queued) : (metadata ??= await resolveRequestTrack(track)).explicit);
                if (rejected) return rejected;
            }
            let request = queued;
            let alreadyQueued = Boolean(queued);
            if (!request) {
                metadata ??= await resolveRequestTrack(track);
                try {
                    const result = await Request.findOneAndUpdate(filter, { $setOnInsert: {
                        roomId, guestId, status: "pending", votes: 0, playedAt: null, completedAt: null,
                        requestedBy: requestedBy || null,
                        track: metadata,
                    } }, { upsert: true, returnDocument: "after", includeResultMetadata: true, setDefaultsOnInsert: false, runValidators: true });
                    request = result.value;
                    alreadyQueued = Boolean(result.lastErrorObject?.updatedExisting);
                } catch (error) {
                    if ((error as { code?: number }).code !== 11000) throw error;
                    request = await Request.findOne(filter);
                    alreadyQueued = true;
                }
            }
            if (!request) throw Object.assign(new Error("The queue changed. Please try again."), { status: 409, expose: true });
            const result = await castVote(String(request._id), guestId);
            if (!result.alreadyVoted) emitToRoom(roomId, alreadyQueued ? "request:updated" : "request:created", result.request);
            return res.status(alreadyQueued ? 200 : 201).json({
                success: true, alreadyQueued, alreadyVoted: result.alreadyVoted,
                message: result.alreadyVoted ? "You already voted for this request." : `Success! Your vote for ${result.request.track.title} has been counted.`,
                request: { ...result.request.toObject(), hasVoted: true },
            });
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Upvote a song
 * @route   PUT /api/requests/vote
 * @access  PUBLIC
 */
export const upvoteRequest = async (req: ExpressRequest, res: Response, next: NextFunction) => {
    try {
        const result = await castVote(req.body.requestId, req.cookies.sway_guest);
        // The route only carries a request ID; expose the room to the request log.
        res.locals.roomId = String(result.request.roomId);
        if (!result.alreadyVoted) emitToRoom(result.request.roomId, "request:updated", result.request);
        return res.status(200).json({
            success: true, alreadyVoted: result.alreadyVoted,
            message: result.alreadyVoted ? "You already voted for this request." : `Your upvote on ${result.request.track.title} has been counted!`,
            request: { ...result.request.toObject(), hasVoted: true },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Mark Song Request as Playing
 * @route   PUT /api/requests/:requestId/mark-playing
 * @access  PRIVATE
 */
const markRequestStatus = (to: "playing" | "played") => async (req: ExpressRequest<{ requestId: string }>, res: Response, next: NextFunction) => {
    try {
        const result = await transitionRequestStatus(req.params.requestId, req.user!.id, to);
        res.locals.roomId = String(result.request.roomId);
        for (const previous of result.demoted) emitToRoom(previous.roomId, "request:played", previous);
        if (result.changed) emitToRoom(result.request.roomId, `request:${to}`, result.request);
        return res.status(200).json({ success: true, message: `Request marked as ${to}.`, request: result.request });
    } catch (err) {
        next(err);
    }
};

export const markRequestPlaying = markRequestStatus("playing");
export const markRequestPlayed = markRequestStatus("played");

/**
 * @desc    Remove a Song Request
 * @route   DELETE /api/requests/:requestId/delete
 * @access  PRIVATE
 */
export const deleteRequest = async (req: ExpressRequest<{ requestId: string }>, res: Response, next: NextFunction) => {
    const { requestId } = req.params;

    try {
        const filter = await ownedRequestFilter(requestId, req.user!.id);
        const request = await Request.findOneAndDelete(filter);
        if (!request) return res.status(404).json({ success: false, error: "Resource not found", message: "Request not found." });

        await Vote.deleteMany({ requestId });
        const roomId = request.roomId; // Store roomId before deletion
        res.locals.roomId = String(roomId);

        // Emit socket event for deletion
        emitToRoom(roomId, "request:deleted", { requestId });

        return res.status(200).json({
            success: true,
            message: "Request has been removed.",
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Fetch Room Requests
 * @route   GET /api/requests/:roomId/requests
 * @access  PUBLIC
 */
export const fetchRoomRequests = async (req: ExpressRequest<{ roomId: string }>, res: Response) => {
    const { roomId } = req.params;

    try {
        const requests = await listRoomRequests({ roomId }, req.cookies.sway_guest);
        if (!requests) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found.",
            });
        }

        return res.status(200).json({ success: true, requests });
    } catch (err) {
        req.log.error({ err }, "There was an error while fetching the requests for a room");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

/**
 * @desc    Fetch Request details
 * @route   GET /api/requests/:requestId
 * @access  PUBLIC
 */
export const fetchRequestDetails = async (req: ExpressRequest, res: Response) => {
    const { requestId } = req.params;

    try {
        const request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Request not found",
            });
        }
        return res.status(200).json({
            success: true,
            request,
        });
    } catch (err) {
        req.log.error({ err }, "There was an error attempting to fetch request details");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

/**
 * @desc    Filter Requests
 * @route   GET /api/requests/:roomId/filter
 * @access  PUBLIC
 */
export const filterRequests = async (req: ExpressRequest<{ roomId: string }>, res: Response) => {
    const { roomId } = req.params;
    const { status } = req.query;

    try {
        // Validate status
        if (status && !isRequestStatus(status)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: missing status parameter",
                message: "Invalid status parameter.",
            });
        }

        const requests = await listRoomRequests(isRequestStatus(status) ? { roomId, status } : { roomId }, req.cookies.sway_guest);
        if (!requests) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found.",
            });
        }

        return res.status(200).json({ success: true, requests });
    } catch (err) {
        req.log.error({ err }, "There was an error attempting to filter requests");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

type RequestStatus = "pending" | "playing" | "played" | "rejected";

const validStatuses: readonly unknown[] = ["pending", "playing", "played", "rejected"] satisfies RequestStatus[];
const isRequestStatus = (value: unknown): value is RequestStatus => validStatuses.includes(value);

/**
 * A room's requests, sorted by votes, with the guest's `hasVoted` on each, or null if the room doesn't exist.
 * Guests poll this, so the three reads run in parallel (one database round trip of latency instead of three),
 * the room check skips the stored QR image, and rows come back as plain objects instead of Mongoose documents.
 */
async function listRoomRequests(filter: { roomId: string; status?: RequestStatus }, guestId: string) {
    const [room, requests, votes] = await Promise.all([
        Room.exists({ _id: filter.roomId }),
        Request.find(filter).sort({ votes: -1, createdAt: 1, _id: 1 }).lean(),
        Vote.find({ roomId: filter.roomId, guestId }).select("requestId").lean(),
    ]);
    if (!room) return null;
    const voted = new Set(votes.map((vote) => String(vote.requestId)));
    // Plain objects skip schema defaults, so older rows missing these fields still match the client's types.
    return requests.map((request) => ({
        playedAt: null,
        completedAt: null,
        ...request,
        hasVoted: voted.has(String(request._id)),
    }));
}

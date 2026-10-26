import type { NextFunction, Response } from "express";
import Vote from "../models/vote.model.js";
import { castVote, checkQueueCapacity, withQueueAdmission } from "../services/guest-votes.js";
import { ownedRequestFilter, transitionRequestStatus } from "../services/request-transitions.js";
import Room from "../models/room.model.js";
import Request from "../models/request.model.js";
import { resolveRequestTrack } from "../services/request-track.js";

// Socket.io instance - to be initalized in index.js and passed here
let io;

// Initialize socket.io
export const initSocketIO = (socketIO) => {
    io = socketIO;
};

// Emit event to room
const emitToRoom = (roomId, event, data) => {
    if (io) {
        io.to(`room-${roomId}`).emit(event, data);
    } else {
        console.warn("emitToRoom called but io is not initialized");
    }
};

// Emit room ended event
export const emitRoomEnded = (roomId) => {
    emitToRoom(roomId, "room:ended", { roomId });
};

//? Emit room update event
// export const emitRoomUpdated = (roomId, updatedData) => {
// 	emitToRoom(roomId, "room:updated", updatedData)
// }

export const emitRoomUpdated = (roomId, updatedData) => {
    // normalize payload: include roomId as `roomId` so client can check easily
    const payload = {
        roomId,
        roomName: updatedData.roomName,
        roomDescription: updatedData.roomDescription,
    };
    emitToRoom(roomId, "room:updated", payload);
};

/**
 * @desc    Create a Song Request
 * @route   POST /api/requests
 * @access  PUBLIC
 */
export const createRequest = async (req: any, res: Response, next: NextFunction) => {
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
        const filter = { roomId, "track.spotifyTrackId": spotifyTrackId, status: { $in: ["pending", "playing"] as const } };
        let metadata: Awaited<ReturnType<typeof resolveRequestTrack>> | undefined;
        if (!await Request.exists(filter)) {
            await checkQueueCapacity(roomId, guestId);
            metadata = await resolveRequestTrack(track);
        }
        return await withQueueAdmission(String(roomId), async () => {
            const queued = await Request.findOne(filter);
            if (!queued) await checkQueueCapacity(roomId, guestId);
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
                message: result.alreadyVoted ? "You already voted for this request." : `Success! Your vote for ${result.request.track!.title} has been counted.`,
                request: { ...result.request.toObject(), hasVoted: true },
            });
        });
    } catch (err) {
        console.error("There was a database error while attempting to create a request:", err);
        next(err);
    }
};

/**
 * @desc    Upvote a song
 * @route   PUT /api/requests/vote
 * @access  PUBLIC
 */
export const upvoteRequest = async (req: any, res: Response, next: NextFunction) => {
    try {
        const result = await castVote(req.body.requestId, req.cookies.sway_guest);
        if (!result.alreadyVoted) emitToRoom(result.request.roomId, "request:updated", result.request);
        return res.status(200).json({
            success: true, alreadyVoted: result.alreadyVoted,
            message: result.alreadyVoted ? "You already voted for this request." : `Your upvote on ${result.request.track!.title} has been counted!`,
            request: { ...result.request.toObject(), hasVoted: true },
        });
    } catch (err) {
        console.error("There was an error while attempting to log an upvote on a request:", err);
        next(err);
    }
};

/**
 * @desc    Mark Song Request as Playing
 * @route   PUT /api/requests/:requestId/mark-playing
 * @access  PRIVATE
 */
const markRequestStatus = (to: "playing" | "played") => async (req: any, res: Response, next: NextFunction) => {
    try {
        const result = await transitionRequestStatus(req.params.requestId, req.user.id, to);
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
export const deleteRequest = async (req: any, res: Response, next: NextFunction) => {
    const { requestId } = req.params;

    try {
        const filter = await ownedRequestFilter(requestId, req.user.id);
        const request = await Request.findOneAndDelete(filter);
        if (!request) return res.status(404).json({ success: false, error: "Resource not found", message: "Request not found." });

        await Vote.deleteMany({ requestId });
        const roomId = request.roomId; // Store roomId before deletion

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
export const fetchRoomRequests = async (req, res) => {
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
        console.error("There was an error while fetching the requests for a room:", err);
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
export const fetchRequestDetails = async (req, res) => {
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
        console.error("There was an error attempting to fetch request details:", err);
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
export const filterRequests = async (req, res) => {
    const { roomId } = req.params;
    const { status } = req.query;

    try {
        // Validate status
        const validStatuses = ["pending", "playing", "played", "rejected"];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: missing status parameter",
                message: "Invalid status parameter.",
            });
        }

        const requests = await listRoomRequests(status ? { roomId, status } : { roomId }, req.cookies.sway_guest);
        if (!requests) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found.",
            });
        }

        return res.status(200).json({ success: true, requests });
    } catch (err) {
        console.error("There was an error attempting to filter requests:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

/**
 * A room's requests, sorted by votes, with the guest's `hasVoted` on each, or null if the room doesn't exist.
 * Guests poll this, so the three reads run in parallel (one database round trip of latency instead of three),
 * the room check skips the stored QR image, and rows come back as plain objects instead of Mongoose documents.
 */
type RequestStatus = "pending" | "playing" | "played" | "rejected";

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

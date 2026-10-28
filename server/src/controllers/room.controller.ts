import Vote from "../models/vote.model";
import Room from "../models/room.model";
import { getUniqueRoomCode } from "../utils/generate.room.code";
import mongoose, { isObjectIdOrHexString } from "mongoose";
import { emitRoomEnded, emitRoomUpdated } from "./request.controller";
import Request from "../models/request.model";
import { createSpotifyLink, createSpotifyUriLink } from "../utils/formatters/format.spotify";
import { generateRoomQr } from "../utils/room.qr";
import type { NextFunction, Request as ExpressRequest, Response } from "express";

/**
 * @desc    Fetch the authenticated user's five most recently created rooms
 * @route   GET /api/rooms/recent
 * @access  PRIVATE
 */
export const fetchUserLatestRooms = async (req: ExpressRequest, res: Response) => {
    try {
        const latestRooms = await Room.find({ roomCreator: req.user!._id })
            .select("roomName roomCode active createdAt updatedAt")
            .sort({ active: -1, createdAt: -1 })
            .limit(5)
            .lean();

        return res.status(200).json({
            success: true,
            latestRooms,
        });
    } catch (err) {
        req.log.error({ err }, "There was an error fetching the user's latest rooms");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble loading your recent rooms, please try again soon.",
        });
    }
};

/**
 * @desc    Fetch the authenticated user's active room and live summary
 * @route   GET /api/rooms/active/summary
 * @access  PRIVATE
 */
export const fetchActiveRoomSummary = async (req: ExpressRequest, res: Response) => {
    try {
        const activeRoom = await Room.findOne({
            roomCreator: req.user!._id,
            active: true,
        })
            .select("roomName roomDescription roomCode roomCreator active scheduledAt createdAt updatedAt")
            .lean();

        if (!activeRoom) {
            return res.status(200).json({
                success: true,
                activeRoom: null,
            });
        }

        const [metricsResult, recentRequests] = await Promise.all([
            Request.aggregate([
                { $match: { roomId: activeRoom._id } },
                {
                    $group: {
                        _id: null,
                        requestsReceived: { $sum: 1 },
                        requestsPlayed: {
                            $sum: { $cond: [{ $eq: ["$status", "played"] }, 1, 0] },
                        },
                        requestsWaiting: {
                            $sum: {
                                $cond: [{ $in: ["$status", ["pending", "playing"]] }, 1, 0],
                            },
                        },
                        totalVotes: { $sum: "$votes" },
                    },
                },
            ]),
            Request.find({ roomId: activeRoom._id })
                .select("track status votes createdAt")
                .sort({ createdAt: -1 })
                .limit(4)
                .lean(),
        ]);
        const metrics = metricsResult[0];

        return res.status(200).json({
            success: true,
            activeRoom: {
                ...activeRoom,
                requestsReceived: metrics?.requestsReceived ?? 0,
                requestsPlayed: metrics?.requestsPlayed ?? 0,
                requestsWaiting: metrics?.requestsWaiting ?? 0,
                totalVotes: metrics?.totalVotes ?? 0,
                recentRequests,
            },
        });
    } catch (err) {
        req.log.error({ err }, "There was an error fetching the active room summary");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble loading your active room, please try again soon.",
        });
    }
};

const isActiveRoomConflict = (err: any) =>
    err?.code === 11000 && (err.keyPattern?.roomCreator || String(err.message).includes("one_active_room_per_creator"));

/**
 * @desc    Create a Room
 * @route   POST /api/rooms
 * @access  PRIVATE
 */

export const createRoom = async (req: ExpressRequest, res: Response) => {
    const { roomName, roomDescription } = req.body;

    try {
        if (!roomName || !roomDescription) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room name/description missing",
                message: "Both a room name and description are required.",
            });
        }

        // generate room code to use during room creation
        const roomCode = await getUniqueRoomCode();

        // The one_active_room_per_creator index rejects a second active room, even under concurrent creates.
        const newRoom = await Room.create({
            roomName,
            roomDescription,
            roomCode,
            roomCreator: req.user!._id,
            active: true,
        });

        // The new room has no ID in the URL or body; expose it to the request log.
        res.locals.roomId = String(newRoom._id);

        //  generate room QR code
        await Room.generateRoomQr(newRoom._id);

        return res.status(201).json({
            success: true,
            message: `Success! ${newRoom.roomName} has been created and is now active.`,
            newRoom,
        });
    } catch (err) {
        if (isActiveRoomConflict(err)) {
            return res.status(409).json({
                success: false,
                error: "Conflict: user has active room",
                message: "You already have an active room.",
            });
        }

        req.log.error({ err }, "There was an error attempting to create a room");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble creating the room, please try again soon.",
        });
    }
};

/**
 * @desc    Update Room Details
 * @route   PUT /api/rooms/:roomId
 * @access  PRIVATE
 * @feats   Update room name and room description
 */

export const updateRoom = async (req: ExpressRequest<{ roomId: string }>, res: Response) => {
    const { roomName, roomDescription } = req.body;
    const userId = req.user!._id;
    const { roomId } = req.params;

    try {
        // Validate roomId
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: invalid room id",
                message: "Oops! Invalid room ID.",
            });
        }

        // Find room and validate authorization
        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found.",
            });
        }

        if (room.roomCreator.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: "Forbidden: not authorized",
                message: "Unauthorized to update this room.",
            });
        }

        // update the room
        const updatedRoom = await Room.findByIdAndUpdate(
            roomId,
            { roomName, roomDescription },
            { new: true, runValidators: true },
        );

        if (!updatedRoom) {
            return res.status(500).json({
                success: false,
                error: "Internal Server Error",
                message: "Failed to update room. Please try again.",
            });
        }


        try {
            // emit the live event update to all connected clients in the room
            emitRoomUpdated(roomId, updatedRoom);
        } catch (err) {
            req.log.error({ err }, "There was an error: Failed to emit room updated event");
        }

        return res.status(200).json({
            success: true,
            message: "Room updated successfully.",
            updatedRoom,
        });
    } catch (err) {
        req.log.error({ err }, "There was an error attempting to update the details of a room");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

/**
 * @desc    Join a Room
 * @route   POST /api/rooms/join
 * @access  PUBLIC
 */

export const joinRoom = async (req: ExpressRequest, res: Response) => {
    const { roomCode } = req.body;

    try {
        // check if room code is provided
        if (!roomCode) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: roomCode missing",
                message: "Room code is required.",
            });
        }

        // trim and transform to uppercase for consistency with DB
        const formattedRoomCode = roomCode.trim().toUpperCase();

        // find room with associated with requested roomCode
        const room = await Room.findOne({ roomCode: formattedRoomCode });

        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found.",
            });
        }

        // check if room is active
        if (!room.active) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: inactive room",
                message: "This room is no longer active.",
            });
        }

        // return only room details that are needed for joining

        const roomDetails = {
            _id: room._id,
            roomName: room.roomName,
            roomDescription: room.roomDescription,
            roomCode: room.roomCode,
            createdAt: room.createdAt,
        };

        return res.status(200).json({
            success: true,
            roomDetails,
        });
    } catch (err) {
        req.log.error({ err }, "There was an error attempting to connect a user to a room");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "Oops! We're having trouble connecting you to the room, please try again.",
        });
    }
};

/**
 * @desc    End a Room/Make a Room Inactive
 * @route   PUT /api/rooms/end
 * @access  PRIVATE
 */

export const endRoom = async (req: ExpressRequest, res: Response, next: NextFunction) => {

    const { roomId } = req.body;
    const userId = req.user!._id;

    try {
        if (!isObjectIdOrHexString(roomId)) {
            throw Object.assign(new Error("Room ID is invalid."), { status: 400, expose: true });
        }

        // One conditional write: only the owner can end it, and only once.
        const ended = await Room.findOneAndUpdate(
            { _id: roomId, roomCreator: userId, active: true },
            { active: false },
        );

        if (!ended) {
            // Explain the rejection without changing anything.
            const room = await Room.findById(roomId).select("roomCreator active").lean();
            if (!room) {
                throw Object.assign(new Error("Room not found."), { status: 404, expose: true });
            }
            if (room.roomCreator.toString() !== userId.toString()) {
                throw Object.assign(new Error("You are not authorized to end this room."), { status: 403, expose: true });
            }
            throw Object.assign(new Error("Room has already ended."), { status: 409, expose: true });
        }

        emitRoomEnded(roomId);

        return res.status(200).json({
            success: true,
            message: "The room is now over.",
        });
    } catch (err) {
        return next(err);
    }
};

/**
 * @desc    Delete a room
 * @route   DELETE /api/rooms/:roomId
 * @access  PRIVATE
 * @feats   Deletes a room and its requests.
 */

export const deleteRoom = async (req: ExpressRequest<{ roomId: string }>, res: Response) => {
    try {
        // get room ID from URL params
        const { roomId } = req.params;

        // Use the authenticated identity, never a client-supplied owner ID.
        const userId = req.user!._id;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room ID is required",
                message: "Oops! We're having trouble, try again.",
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: user ID is required",
                message: "Oops! We're having trouble, try again.",
            });
        }

        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found.",
            });
        }

        // check if user is authorized (is the roomCreator)
        const roomCreator = room.roomCreator;

        if (roomCreator.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                error: "Forbidden: not authorized",
                message: "Not Authorized! You are not the creator of this room.",
            });
        }

        // delete room
        const deletedRoom = await Room.findOneAndDelete({ _id: room._id, roomCreator: userId });
        if (!deletedRoom) {
            return res.status(404).json({ success: false, message: "Room not found." });
        }

        // delete the requests that were created in the room
        await Request.deleteMany({ roomId: room._id });
        await Vote.deleteMany({ roomId: room._id });

        // return success response
        return res.status(200).json({
            success: true,
            message: `The ${room.roomName} room has been successfully deleted.`,
            room,
        });
    } catch (err) {
        req.log.error({ err }, "There was an error attempting to delete a room");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're currently having trouble deleting this room, please try again soon.",
        });
    }
};

/**
 * @desc    Fetch Room Details
 * @route   GET /api/rooms/:roomCode
 * @access  PUBLIC
 * @feats   Finds and returns a room's details based on roomCode
 */

export const fetchRoomDetails = async (req: ExpressRequest<{ roomCode: string }>, res: Response) => {
    const { roomCode } = req.params;

    try {
        const room = await Room.findOne({ roomCode });

        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found!",
            });
        } else {
            const roomDetails = {
                _id: room._id,
                roomName: room.roomName,
                roomDescription: room.roomDescription,
                roomCode: room.roomCode,
                roomCreator: room.roomCreator,
                // Stored images may still encode an old localhost URL.
                roomQr: await generateRoomQr(room.roomCode),
                createdAt: room.createdAt,
                updatedAt: room.updatedAt,
                active: room.active,
            };

            return res.status(200).json({
                success: true,
                message: `Success! Here's ${room.roomName}'s details.`,
                roomDetails,
            });
        }
    } catch (err) {
        req.log.error({ err }, "There was an error fetching a room's details");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

/**
 * @desc    Fetch Room's Requests (with spotify links + URIs)
 * @route   GET /api/rooms/:roomCode/fetch/requests
 * @access  PUBLIC
 */

export const fetchRoomRequests = async (req: ExpressRequest<{ roomCode: string }>, res: Response) => {
    const { roomCode } = req.params;

    if (!roomCode) {
        return res.status(400).json({
            success: false,
            error: "Invalid Credentials: missing room code",
            message: "Room Code is required.",
        });
    }

    try {
        const room = await Room.findOne({ roomCode });

        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room does not exist.",
            });
        }

        const requests = await Request.find({ roomId: room._id });
        const votes = await Vote.find({ roomId: room._id, guestId: req.cookies.sway_guest }).select("requestId").lean();
        const voted = new Set(votes.map((vote) => String(vote.requestId)));

        const data = requests.map((req) => {
            const track = req.track;
            return {
                id: req._id,
                title: track.title,
                artist: track.artist,
                albumArtUrl: track.albumArtUrl,
                spotifyUri: createSpotifyUriLink(track.spotifyTrackId),
                spotifyLink: createSpotifyLink(track.spotifyTrackId),
                status: req.status,
                votes: req.votes,
                hasVoted: voted.has(String(req._id)),
                requestedAt: req.createdAt,
                requestedBy: req.requestedBy,
                playedAt: req.playedAt,
            };
        });

        return res.status(200).json({
            success: true,
            message: "Requests loaded.",
            data,
        });
    } catch (err) {
        req.log.error({ err }, "There was an error fetching a room's requests");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again. Thank you.",
        });
    }
};

/**
 * @desc	Fetch a Room's Played Requests (with Spotify Links + URIs)
 * @route	GET /api/rooms/:roomCode/fetch/spotify/played
 * @access	PUBLIC
 */

export const fetchRoomPlayedRequests = async (req: ExpressRequest<{ roomCode: string }>, res: Response) => {
    const { roomCode } = req.params;

    if (!roomCode) {
        return res.status(400).json({
            success: false,
            error: "Invalid Credentials: room code missing",
            message: "Room code is required.",
        });
    }

    try {
        const room = await Room.findOne({ roomCode });

        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room does not exist.",
            });
        }

        // find only played requests, in play order
        const requests = await Request.find({ roomId: room._id, status: "played" })
            .sort({ playedAt: 1 })
            .populate("track");

        const data = requests.map((req) => {
            const track = req.track;
            return {
                id: req._id,
                title: track.title,
                artist: track.artist,
                albumArtUrl: track.albumArtUrl,
                spotifyUri: createSpotifyUriLink(track.spotifyTrackId),
                spotifyLink: createSpotifyLink(track.spotifyTrackId),
                status: req.status,
                votes: req.votes,
                // ISO timestamps; the client formats them in the viewer's time zone
                requestedAt: req.createdAt,
                requestedBy: req.requestedBy,
                playedAt: req.playedAt,
            };
        });

        return res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        req.log.error({ err }, "There was an error fetching a room's played requests with spotify information");
        return res
            .status(500)
            .json({ message: "We're having trouble, please try again. Thank you." });
    }
};

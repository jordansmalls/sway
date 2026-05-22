import Room from "../models/room.model.js";
import Request from "../models/request.model.js";
import { createSpotifyLink, createSpotifyUriLink } from "../utils/formatters/format.spotify.js";

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
        //?
        console.log(`🔊 emitToRoom -> event: ${event}, room-${roomId}`, data);
    } else {
        //?
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
export const createRequest = async (req, res) => {
    const { track, roomId, requestedBy } = req.body;

    // Validate required fields
    if (!track || !roomId) {

        return res.status(400).json({
            success: false,
            error: "Invalid Credentials: missing fields",
            message: "Please provide all required fields."
        })
    }

    const { id: spotifyTrackId, name: title, artist, albumImage: albumArtUrl } = track;

    // Validate track details
    if (!spotifyTrackId || !title || !artist) {
        return res.status(400).json({
            success: false,
            error: "Invalid Credentials: missing required track details",
            message: "Please provide all required track details."
        })
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
        return res.status(404).json({
            success: false,
            error: "Resource not found",
            message: "Room does not exist!",
        })
    }

    try {
        // Create the request
        const request = await Request.create({
            roomId,
            requestedBy: requestedBy || null,
            track: {
                spotifyTrackId,
                title,
                artist,
                albumArtUrl,
                spotifyLink: createSpotifyLink(spotifyTrackId),
                spotifyURI: createSpotifyUriLink(spotifyTrackId),
            },
        });

        if (request) {
            // Emit socket event for new request
            emitToRoom(roomId, "request:created", request);

            return res.status(201).json({
                success: true,
                message: `Success! ${request.track.title} has been added to the queue.`,
                request
            })
        } else {

            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: missing request data",
                message: "Oops! Invalid request data."
            })
        }
    } catch (err) {
        console.error("There was a database error while attempting to create a request:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error - database error",
            message: "We had trouble submitting your request, please try again."
        })
    }
};

/**
 * @desc    Upvote a song
 * @route   PUT /api/requests/vote
 * @access  PUBLIC
 */
export const upvoteRequest = async (req, res) => {
    const { requestId } = req.body;

    try {
        // const request = await Request.findById(requestId);

        // if (!request) {
        //     console.error(
        //         "There was an error attempting to log an upvote on a request:",
        //         requestId,
        //     );
        //     return res.status(404).json({
        //         success: false,
        //         error: "Resource not found",
        //         message: "Song request not found!",
        //     });
        // }

        // request.votes += 1;

        // await request.save();


        const request = await Request.findByIdAndUpdate(
            requestId,
            { $inc: { votes: 1 } },
            { new: true },
        );

        if(!request) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Request not found!"
            })
        }

        // Emit socket event for upvote
        emitToRoom(request.roomId, "request:updated", request);

        return res.status(200).json({
            success: true,
            message: `Your upvote on ${request.track.title} has been counted!`,
            request,
        });
    } catch (err) {
        console.error("There was an error while attempting to log an upvote on a request:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon."
        })
    }
};

/**
 * @desc    Mark Song Request as Playing
 * @route   PUT /api/requests/:requestId/mark-playing
 * @access  PRIVATE
 */
export const markRequestPlaying = async (req, res) => {
    const { requestId } = req.body;

    try {
        const request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Request not found!",
            });
        }

        // Check if user is room creator
        const room = await Room.findById(request.roomId);
        if (room.roomCreator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "Forbidden - Not authorized",
                message: "You are not authorized to update this request.",
            });
        }

        request.status = "playing";
        request.playedAt = Date.now();

        await request.save();

        // Emit socket event for status change
        emitToRoom(request.roomId, "request:playing", request);

        return res.status(200).json({
            success: true,
            message: "Request marked as playing.",
            request,
        });
    } catch (err) {
        console.error("There was an error attempting to mark a request as playing:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

/**
 * @desc    Mark Song Request as Played
 * @route   PUT /api/requests/:requestId/mark-played
 * @access  PRIVATE
 */

export const markRequestPlayed = async (req, res) => {
    const { requestId } = req.body;

    try {
        const request = await Request.findById(requestId);

        if (!request) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Request not found.",
            });
        }

        // Check if user is room creator
        const room = await Room.findById(request.roomId);
        if (room.roomCreator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "Forbidden - not authorized",
                message: "Not authorized to update this request.",
            });
        }

        request.status = "played";
        request.completedAt = Date.now();

        await request.save();

        // Emit socket event for status change
        emitToRoom(request.roomId, "request:played", request);

        return res.status(200).json({
            success: true,
            message: "Request marked as played.",
            request,
        });
    } catch (err) {
        console.error("There was an error attempting to mark a request as played:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

/**
 * @desc    Remove a Song Request
 * @route   DELETE /api/requests/:requestId/delete
 * @access  PRIVATE
 */
export const deleteRequest = async (req, res) => {
        const { requestId } = req.body;

    try {
        const request = await Request.findById(requestId);

        if (!request) {
            // res.status(404);
            // throw new Error("Request not found.");

            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Request not found.",
            });
        }

        // Check if user is room creator
        const room = await Room.findById(request.roomId);
        if (room.roomCreator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "Forbidden - not authorized",
                message: "Not authorized to delete this request.",
            });
        }

        const roomId = request.roomId; // Store roomId before deletion

        await Request.findByIdAndDelete(requestId);

        // Emit socket event for deletion
        emitToRoom(roomId, "request:deleted", { requestId });

        return res.status(200).json({
            success: true,
            message: "Request has been removed.",
        });
    } catch (err) {
        console.error("There was an error attempting to delete a request:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
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
        // Check if room exists
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found.",
            });
        }

        // Get requests for room, sort by votes (descending)
        const requests = await Request.find({ roomId }).sort({ votes: -1 });

        return res.status(200).json({
            success: true,
            requests,
        });
    } catch (err) {
        console.error("There was an error while fetching the requests for a room:", err)
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again."
        })
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
        console.error("There was an error attempting to fetch request details:", err)
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

        // Check if room exists
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found.",
            });
        }

        // Build filter
        const filter = { roomId };
        if (status) {
            filter.status = status;
        }

        // Get filtered requests
        const requests = await Request.find(filter).sort({ votes: -1 });
        return res.status(200).json({
            success: true,
            requests,
        });
    } catch (err) {
        console.error("There was an error attempting to filter requests:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
}

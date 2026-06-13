import mongoose from "mongoose";
import User from "../models/user.model";
import Room from "../models/room.model";
import Request from "../models/request.model";

const validateUser = async (userId: string): Promise<any> => {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return {
            status: 400,
            body: {
                success: false,
                error: "Invalid Credentials: invalid user ID",
                message: "We're having trouble, please try again.",
            },
        };
    }

    const user = await User.findById(userId).select("_id username createdAt");

    if (!user) {
        return {
            status: 404,
            body: {
                success: false,
                error: "Resource not found",
                message: "User not found.",
            },
        };
    }

    return { user };
};

const fetchUserRoomIds = async (userId: any): Promise<any[]> => {
    const rooms = await Room.find({ roomCreator: userId }).select("_id").lean();
    return rooms.map((room) => room._id);
};

/**
 * @desc    Total Rooms/Events Hosted
 * @route   GET /api/analytics/:userId/total-rooms-hosted
 * @access  PUBLIC
 */

export const totalRoomsHosted = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateUser(userId);

        if (validation.status) {
            return res.status(validation.status).json(validation.body);
        }

        const roomsHosted = await Room.countDocuments({ roomCreator: validation.user._id });

        return res.status(200).json({
            success: true,
            roomsHosted,
        });
    } catch (err) {
        console.error("There was an error fetching total rooms hosted:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};

/**
 * @desc    Total Requests Received
 * @route   GET /api/analytics/:userId/total-requests-received
 * @access  PUBLIC
 */

export const totalRequestsReceived = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateUser(userId);

        if (validation.status) {
            return res.status(validation.status).json(validation.body);
        }

        const roomIds = await fetchUserRoomIds(validation.user._id);
        const requestsReceived = roomIds.length
            ? await Request.countDocuments({ roomId: { $in: roomIds } })
            : 0;

        return res.status(200).json({
            success: true,
            requestsReceived,
        });
    } catch (err) {
        console.error("There was an error fetching total requests received:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};

/**
 * @desc    Total Requests Played
 * @route   GET /api/analytics/:userId/total-requests-played
 * @access  PUBLIC
 */

export const totalRequestsPlayed = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateUser(userId);

        if (validation.status) {
            return res.status(validation.status).json(validation.body);
        }

        const roomIds = await fetchUserRoomIds(validation.user._id);
        const requestsPlayed = roomIds.length
            ? await Request.countDocuments({ roomId: { $in: roomIds }, status: "played" })
            : 0;

        return res.status(200).json({
            success: true,
            requestsPlayed,
        });
    } catch (err) {
        console.error("There was an error fetching total requests played:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};

/**
 * @desc    5 Most Played Artists
 * @route   GET /api/analytics/:userId/most-played-artists
 * @access  PUBLIC
 */

export const mostPlayedArtists = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateUser(userId);

        if (validation.status) {
            return res.status(validation.status).json(validation.body);
        }

        const roomIds = await fetchUserRoomIds(validation.user._id);
        const artists = roomIds.length
            ? await Request.aggregate([
                  {
                      $match: {
                          roomId: { $in: roomIds },
                          status: "played",
                      },
                  },
                  {
                      $group: {
                          _id: "$track.artist",
                          playCount: { $sum: 1 },
                      },
                  },
                  { $sort: { playCount: -1, _id: 1 } },
                  { $limit: 5 },
                  {
                      $project: {
                          _id: 0,
                          artist: "$_id",
                          playCount: 1,
                      },
                  },
              ])
            : [];

        return res.status(200).json({
            success: true,
            artists,
        });
    } catch (err) {
        console.error("There was an error fetching most played artists:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};

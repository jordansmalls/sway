import mongoose from "mongoose";
import User from "../models/user.model";
import Room from "../models/room.model";
import Request from "../models/request.model";

const validateAnalyticsUser = async (req: any, userId: string): Promise<any> => {
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

    if (req.user?._id?.toString() !== userId.toString()) {
        return {
            status: 403,
            body: {
                success: false,
                error: "Forbidden: not authorized",
                message: "Unauthorized to view these analytics.",
            },
        };
    }

    const user = await User.findById(userId).select("_id");

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

const songGroupStage = {
    $group: {
        _id: "$track.spotifyTrackId",
        title: { $first: "$track.title" },
        artist: { $first: "$track.artist" },
        albumArtUrl: { $first: "$track.albumArtUrl" },
        spotifyLink: { $first: "$track.spotifyLink" },
        spotifyURI: { $first: "$track.spotifyURI" },
        requestCount: { $sum: 1 },
        totalVotes: { $sum: "$votes" },
        latestRequestedAt: { $max: "$createdAt" },
        latestPlayedAt: { $max: "$playedAt" },
    },
};

const songProjectStage = {
    $project: {
        _id: 0,
        spotifyTrackId: "$_id",
        title: 1,
        artist: 1,
        albumArtUrl: 1,
        spotifyLink: 1,
        spotifyURI: 1,
        requestCount: 1,
        totalVotes: 1,
        latestRequestedAt: 1,
        latestPlayedAt: 1,
    },
};

const aggregateSongsForUser = async (userId: any, match: any, sort: any): Promise<any[]> => {
    const roomIds = await fetchUserRoomIds(userId);

    if (!roomIds.length) {
        return [];
    }

    return Request.aggregate([
        {
            $match: {
                roomId: { $in: roomIds },
                ...match,
            },
        },
        songGroupStage,
        { $sort: sort },
        { $limit: 10 },
        songProjectStage,
    ]);
};

/**
 * @desc    10 Most Requested Songs
 * @route   GET /api/analytics/:userId/most-requested-songs
 * @access  PRIVATE
 */

export const mostRequestedSongs = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateAnalyticsUser(req, userId);

        if (validation.status) {
            return res.status(validation.status).json(validation.body);
        }

        const songs = await aggregateSongsForUser(
            validation.user._id,
            {},
            { requestCount: -1, totalVotes: -1, title: 1 },
        );

        return res.status(200).json({
            success: true,
            songs,
        });
    } catch (err) {
        console.error("There was an error attempting to fetch a user's most requested songs:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};

/**
 * @desc    10 Most Played Songs
 * @route   GET /api/analytics/:userId/most-played-songs
 * @access  PRIVATE
 */

export const mostPlayedSongs = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateAnalyticsUser(req, userId);

        if (validation.status) {
            return res.status(validation.status).json(validation.body);
        }

        const songs = await aggregateSongsForUser(
            validation.user._id,
            { status: "played" },
            { requestCount: -1, totalVotes: -1, title: 1 },
        );

        return res.status(200).json({
            success: true,
            songs,
        });
    } catch (err) {
        console.error("There was an error attempting to fetch a user's most played songs:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};

/**
 * @desc    10 Most Upvoted Songs
 * @route   GET /api/analytics/:userId/most-upvoted-songs
 * @access  PRIVATE
 */

export const mostUpvotedSongs = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateAnalyticsUser(req, userId);

        if (validation.status) {
            return res.status(validation.status).json(validation.body);
        }

        const songs = await aggregateSongsForUser(
            validation.user._id,
            {},
            { totalVotes: -1, requestCount: -1, title: 1 },
        );

        return res.status(200).json({
            success: true,
            songs,
        });
    } catch (err) {
        console.error("There was an error attempting to fetch a user's most upvoted songs:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};

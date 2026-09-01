import mongoose from "mongoose";
import User from "../models/user.model";
import Room from "../models/room.model";
import Request from "../models/request.model";

const validateAnalyticsUser = async (userId: string): Promise<any> => {
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

const requestActivityRanges = {
    "7d": { days: 7, interval: "day" },
    "30d": { days: 30, interval: "day" },
    "90d": { days: 90, interval: "day" },
    "6m": { days: 182, interval: "week" },
    "1y": { days: 365, interval: "month" },
} as const;

const startOfUtcBucket = (date: Date, interval: "day" | "week" | "month") => {
    const bucket = new Date(date);
    bucket.setUTCHours(0, 0, 0, 0);

    if (interval === "week") {
        bucket.setUTCDate(bucket.getUTCDate() - bucket.getUTCDay());
    } else if (interval === "month") {
        bucket.setUTCDate(1);
    }

    return bucket;
};

const nextUtcBucket = (date: Date, interval: "day" | "week" | "month") => {
    const next = new Date(date);

    if (interval === "day") next.setUTCDate(next.getUTCDate() + 1);
    if (interval === "week") next.setUTCDate(next.getUTCDate() + 7);
    if (interval === "month") next.setUTCMonth(next.getUTCMonth() + 1);

    return next;
};

/**
 * @desc    Request activity over time for one user's rooms
 * @route   GET /api/analytics/:userId/request-activity?range=7d
 * @access  PRIVATE
 */
export const requestActivity = async (req: any, res: any) => {
    const { userId } = req.params;
    const range = String(req.query.range ?? "30d") as keyof typeof requestActivityRanges | "all";

    try {
        const validation = await validateAnalyticsUser(userId);

        if (validation.status) {
            return res.status(validation.status).json(validation.body);
        }

        if (req.user._id.toString() !== userId && !req.user.admin) {
            return res.status(403).json({
                success: false,
                error: "Forbidden: not authorized",
                message: "You are not authorized to view these analytics.",
            });
        }

        const fixedRangeConfig = range === "all" ? null : requestActivityRanges[range];

        if (range !== "all" && !fixedRangeConfig) {
            return res.status(400).json({
                success: false,
                error: "Invalid range",
                message: "Range must be one of: 7d, 30d, 90d, 6m, 1y, or all.",
            });
        }

        const roomIds = await fetchUserRoomIds(validation.user._id);
        const endDate = new Date();
        let interval: "day" | "week" | "month";
        let rawStartDate: Date;

        if (range === "all") {
            const earliestRequest = roomIds.length
                ? await Request.findOne({ roomId: { $in: roomIds } })
                    .select("createdAt")
                    .sort({ createdAt: 1 })
                    .lean()
                : null;
            rawStartDate = earliestRequest?.createdAt
                ? new Date(earliestRequest.createdAt)
                : new Date(endDate);
            const historyDays = Math.max(
                1,
                Math.ceil((endDate.getTime() - rawStartDate.getTime()) / 86_400_000),
            );
            interval = historyDays <= 90 ? "day" : historyDays <= 730 ? "week" : "month";
        } else {
            interval = fixedRangeConfig!.interval;
            rawStartDate = new Date(endDate);
            rawStartDate.setUTCDate(rawStartDate.getUTCDate() - (fixedRangeConfig!.days - 1));
        }

        const startDate = startOfUtcBucket(rawStartDate, interval);

        const activity = roomIds.length
            ? await Request.aggregate([
                {
                    $match: {
                        roomId: { $in: roomIds },
                        $or: [
                            { createdAt: { $gte: startDate } },
                            { playedAt: { $gte: startDate } },
                        ],
                    },
                },
                {
                    $facet: {
                        received: [
                            { $match: { createdAt: { $gte: startDate } } },
                            {
                                $group: {
                                    _id: {
                                        $dateTrunc: {
                                            date: "$createdAt",
                                            unit: interval,
                                            timezone: "UTC",
                                            ...(interval === "week" ? { startOfWeek: "sunday" } : {}),
                                        },
                                    },
                                    count: { $sum: 1 },
                                },
                            },
                        ],
                        played: [
                            { $match: { status: "played", playedAt: { $gte: startDate } } },
                            {
                                $group: {
                                    _id: {
                                        $dateTrunc: {
                                            date: "$playedAt",
                                            unit: interval,
                                            timezone: "UTC",
                                            ...(interval === "week" ? { startOfWeek: "sunday" } : {}),
                                        },
                                    },
                                    count: { $sum: 1 },
                                },
                            },
                        ],
                    },
                },
            ])
            : [{ received: [], played: [] }];

        const receivedByDate = new Map(
            activity[0].received.map((item: any) => [new Date(item._id).toISOString().slice(0, 10), item.count]),
        );
        const playedByDate = new Map(
            activity[0].played.map((item: any) => [new Date(item._id).toISOString().slice(0, 10), item.count]),
        );
        const data: Array<{ date: string; requestsReceived: number; requestsPlayed: number }> = [];

        for (
            let bucket = new Date(startDate);
            bucket <= endDate;
            bucket = nextUtcBucket(bucket, interval)
        ) {
            const date = bucket.toISOString().slice(0, 10);
            data.push({
                date,
                requestsReceived: Number(receivedByDate.get(date) ?? 0),
                requestsPlayed: Number(playedByDate.get(date) ?? 0),
            });
        }

        return res.status(200).json({
            success: true,
            range,
            interval,
            data,
        });
    } catch (err) {
        console.error("There was an error fetching request activity:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble loading request activity, please try again soon.",
        });
    }
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
        playCount: {
            $sum: { $cond: [{ $eq: ["$status", "played"] }, 1, 0] },
        },
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
        playCount: 1,
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
 * @access  PUBLIC
 */

export const mostRequestedSongs = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateAnalyticsUser(userId);

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
 * @access  PUBLIC
 */

export const mostPlayedSongs = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateAnalyticsUser(userId);

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
 * @access  PUBLIC
 */

export const mostUpvotedSongs = async (req: any, res: any) => {
    const { userId } = req.params;

    try {
        const validation = await validateAnalyticsUser(userId);

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

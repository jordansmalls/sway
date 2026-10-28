import type { Request as ExpressRequest, Response } from "express";
import Request from "../models/request.model";
import Room from "../models/room.model";

interface TopTrack {
    _id: string;
    title: string;
    artist: string;
    albumArtUrl?: string;
    spotifyLink: string;
    totalVotes: number;
    requestCount: number;
    playCount: number;
    latestRequestedAt: Date;
    latestPlayedAt: Date | null;
}

interface TopArtist {
    artist: string;
    totalVotes: number;
    totalSongRequests: number;
}


/**
 * @desc    Top 10 Requested Tracks on Sway
 * @route   GET /api/global/tracks
 * @access  PUBLIC
 */


// simple in memory cache objects

let topTracksCache: TopTrack[] | null = null;
let topTracksCacheTime = 0;
let mostPlayedTracksCache: any[] | null = null;
let mostPlayedTracksCacheTime = 0;

const CACHE_DURATION = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds



export const mostRequestedTracks = async (req: ExpressRequest, res: Response) => {
    try {

        const now = Date.now();

        // return cached data if it's still fresh
        if (topTracksCache && now - topTracksCacheTime < CACHE_DURATION) {
            return res.status(200).json({
                success: true,
                cached: true,
                data: topTracksCache,
            });
        }

        const topTracks = await Request.aggregate<TopTrack>([
            // Filter out rejected requests from being counted
            { $match: { status: { $ne: "rejected" } } },

            // Group by the unique Spotify Track ID
            {
                $group: {
                    _id: "$track.spotifyTrackId",
                    title: { $first: "$track.title" },
                    artist: { $first: "$track.artist" },
                    albumArtUrl: { $first: "$track.albumArtUrl" },
                    spotifyLink: { $first: "$track.spotifyLink" },
                    // Sum up the total votes across all requests for this track
                    totalVotes: { $sum: "$votes" },
                    // Count how many times this song was added to a queue overall
                    requestCount: { $sum: 1 },
                    // Count how many of those requests were played
                    playCount: {
                        $sum: { $cond: [{ $eq: ["$status", "played"] }, 1, 0] },
                    },
                    latestRequestedAt: { $max: "$createdAt" },
                    latestPlayedAt: { $max: "$playedAt" },
                },
            },

            // sort by which gets upvoted more
            // { $sort: { totalVotes: -1 } },

            // sort by which gets requested more
            { $sort: { requestCount: -1 } },

            // Limit to top 10
            { $limit: 10 },
        ]);

        // Update cache
        topTracksCache = topTracks;
        topTracksCacheTime = now;

        return res.status(200).json({
            success: true,
            cached: false,
            data: topTracks,
        });

    } catch (err) {
        req.log.error({ err }, "There was an error fetching the most requested tracks on Sway");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};

const MOST_PLAYED_TRACKS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour, so recommendations pick up new plays

export const fetchMostPlayedTracks = async (): Promise<any[]> => {
    const now = Date.now();
    if (mostPlayedTracksCache && now - mostPlayedTracksCacheTime < MOST_PLAYED_TRACKS_CACHE_DURATION) {
        return mostPlayedTracksCache;
    }

    const tracks = await Request.aggregate([
        { $match: { status: "played" } },
        {
            $group: {
                _id: "$track.spotifyTrackId",
                spotifyTrackId: { $first: "$track.spotifyTrackId" },
                title: { $first: "$track.title" },
                artist: { $first: "$track.artist" },
                albumArtUrl: { $first: "$track.albumArtUrl" },
                spotifyLink: { $first: "$track.spotifyLink" },
                spotifyURI: { $first: "$track.spotifyURI" },
                explicit: { $top: { sortBy: { createdAt: -1 }, output: "$track.explicit" } },
                playCount: { $sum: 1 },
                latestPlayedAt: { $max: "$playedAt" },
            },
        },
        { $sort: { playCount: -1, latestPlayedAt: -1 } },
        { $limit: 20 },
        // Unknown (legacy rows) is left off rather than sent as null
        { $set: { explicit: { $ifNull: ["$explicit", "$$REMOVE"] } } },
    ]);

    mostPlayedTracksCache = tracks;
    mostPlayedTracksCacheTime = now;
    return tracks;
};

/**
 * @desc    Top 20 Played Tracks on Sway
 * @route   GET /api/global/tracks/played
 * @access  PUBLIC
 */
export const mostPlayedTracks = async (req: ExpressRequest, res: Response) => {
    try {
        const cached = mostPlayedTracksCache !== null && Date.now() - mostPlayedTracksCacheTime < MOST_PLAYED_TRACKS_CACHE_DURATION;
        const tracks = await fetchMostPlayedTracks();
        return res.status(200).json({ success: true, cached, data: tracks });
    } catch (err) {
        req.log.error({ err }, "There was an error fetching the most played tracks on Sway");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble finding the most played tracks, please try again soon.",
        });
    }
};




/**
 * @desc    Top 10 Requested Artists on Sway
 * @route   GET /api/global/artists
 * @access  PUBLIC
 */

let topArtistsCache: TopArtist[] | null = null;
let topArtistsCacheTime = 0;

export const mostRequestedArtists = async (req: ExpressRequest, res: Response) => {
    try {
        const now = Date.now();

        if (topArtistsCache && now - topArtistsCacheTime < CACHE_DURATION) {
            return res.status(200).json({
                success: true,
                cached: true,
                data: topArtistsCache,
            });
        }

        const topArtists = await Request.aggregate<TopArtist>([
            { $match: { status: { $ne: "rejected" } } },

            // Group by artist name
            {
                $group: {
                    _id: "$track.artist",
                    totalVotes: { $sum: "$votes" },
                    totalSongRequests: { $sum: 1 },
                },
            },
            { $sort: { totalVotes: -1 } },
            { $limit: 10 },
            // optional, project/reshape the output to look cleaner
            {
                $project: {
                    _id: 0,
                    artist: "$_id",
                    totalVotes: 1,
                    totalSongRequests: 1,
                },
            },
        ]);

        topArtistsCache = topArtists;
        topArtistsCacheTime = now;

        return res.status(200).json({
            success: true,
            cached: false,
            data: topArtists,
        });
    } catch (err) {
        req.log.error({ err }, "There was an error fetching the most requested artists on Sway");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};


/**
 * @desc    Total Number of Songs Requested on Sway
 * @route   GET /api/global/requests
 * @access  PUBLIC
 */

export const totalSongsRequested = async (req: ExpressRequest, res: Response) => {
    try {

        const totalRequests = await Request.countDocuments({});

        if(totalRequests === 0) {
            return res.status(200).json({
                success: true,
                message: "There have been no songs requested on Sway.",
                totalRequests: 0
            })
        } else {
            return res.status(200).json({
                success: true,
                message: `There have been ${totalRequests} songs requested on Sway.`,
                totalRequests: totalRequests,
            });

        }

    } catch (err) {
        req.log.error({ err }, "There was an error fetching the total number of songs requested on Sway");
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble finding the total number of requests, please try again later.",
        });
    }
}


/**
 * @desc    Total Number of Rooms Created on Sway
 * @route   GET /api/global/rooms
 * @access  PUBLIC
 */

export const totalRoomsCreated = async (req: ExpressRequest, res: Response) => {
    try {
        const totalRooms = await Room.countDocuments({});

        if(totalRooms === 0) {
            return res.status(200).json({
                success: true,
                message: "There have been no rooms created on Sway, be the first!",
                totalRooms: 0,
            })
        } else {

        return res.status(200).json({
            success: true,
            message: `There have been ${totalRooms} created on Sway.`,
            totalRooms: totalRooms,
        })
        }
    } catch (err) {
       req.log.error({ err }, "There was an error fetching the total number of rooms created on Sway");
       return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're having trouble finding the total number of rooms, please try again later."
       })
    }
}

import Request from "../models/request.model";
import Room from "../models/room.model";


/**
 * @desc    Top 10 Requested Tracks on Sway
 * @route   GET /api/global/tracks
 * @access  PUBLIC
 */


// simple in memory cache objects

let topTracksCache = null;
let topTracksCacheTime = 0;

const CACHE_DURATION = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds



export const mostRequestedTracks = async (req, res) => {
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

        const topTracks = await Request.aggregate([
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
        console.error(
            "There was an error fetching the most requested tracks on Sway:",
            err,
        );
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again soon.",
        });
    }
};




/**
 * @desc    Top 10 Requested Artists on Sway
 * @route   GET /api/global/artists
 * @access  PUBLIC
 */

let topArtistsCache = null;
let topArtistsCacheTime = 0;

export const mostRequestedArtists = async (req, res) => {
    try {
        const now = Date.now();

        if (topArtistsCache && now - topArtistsCacheTime < CACHE_DURATION) {
            return res.status(200).json({
                success: true,
                cached: true,
                data: topArtistsCache,
            });
        }

        const topArtists = await Request.aggregate([
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
        console.error("There was an error fetching the most requested artists on Sway:", err);
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

export const totalSongsRequested = async (req, res) => {
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
        console.error(
            "There was an error fetching the total number of songs requested on Sway:",
            err,
        );
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

export const totalRoomsCreated = async (req, res) => {
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
       console.error("There was an error fetching the total number of rooms created on Sway:", err);
       return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're having trouble finding the total number of rooms, please try again later."
       })
    }
}
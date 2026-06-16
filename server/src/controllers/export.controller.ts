import Room from "../models/room.model";
import Request from "../models/request.model.js";
import { formatTo12HourTime, formatToFullDate12Hour } from "../utils/formatters/format.times.js";
import { createObjectCsvStringifier } from "csv-writer";
import { pad, truncate } from "../utils/formatters/plaintext-helpers.js";

/**
 * @desc    Export Room Tracklist JSON (Played songs only)
 * @route   GET /api/exports/:roomId/tracklist/json
 * @access  PRIVATE
 * @feats   Allows authorized users to export the tracklist for a room, once it's over. (only songs that were played during the room)
 */

export const exportTracklistJson = async (req, res) => {
    const { roomId } = req.params;

    try {
        if (!roomId) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room ID missing",
                message: "Room ID is required.",
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

        if (room.active == true) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room is active",
                message: "A room must be inactive to export the tracklist.",
            });
        }

        const user = req.user._id;

        if (room.roomCreator.toString() !== user.toString()) {
            return res.status(403).json({
                success: false,
                error: "Forbidden - Not authorized",
                message:
                    "You are not authorized to export tracklists for rooms you did not create.",
            });
        }

        const playedSongs = await Request.find({ roomId, status: "played" }).populate("track");

        const tracklist = playedSongs.map((request) => ({
            title: request.track.title,
            artist: request.track.artist,
            playedAt: formatTo12HourTime(request.playedAt),
        }));

        return res.status(200).json({
            success: true,
            message: "Tracklist exported successfully.",
            tracklist,
        });
    } catch (err) {
        console.error("There was an error attempting to export a tracklist as JSON:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
    }
};

/**
 * @desc    Export Room Tracklist CSV (Played songs only)
 * @route   GET /api/exports/:roomId/tracklist/csv
 * @access  PRIVATE
 * @feats   Allows authorized users to export the tracklist as CSV for a room, once it's over.
 */
export const exportTracklistCsv = async (req, res) => {
    const { roomId } = req.params;


    if (!roomId) {
        return res.status(400).json({
            success: false,
            error: "Invalid Credentials: room ID missing",
            message: "Room ID is required.",
        });
    }

    try {
        const room = await Room.findById(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room not found.",
            });
        }

        if (room.active) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room is active",
                message: "A room must be inactive to export the tracklist.",
            });
        }

        const user = req.user._id;
        if (room.roomCreator.toString() !== user.toString()) {
            return res.status(403).json({
                success: false,
                error: "Forbidden - not authorized",
                message:
                    "You are not authorized to export tracklists for rooms you did not create.",
            });
        }

        const playedSongs = await Request.find({ roomId, status: "played" }).populate("track");

        if (!playedSongs.length) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Could not find any played songs for this room.",
            });
        }

        // --- Prepare rows --- \\
        const rows = playedSongs.map((request) => ({
            title: request.track.title,
            artist: request.track.artist,
            playedAt: formatTo12HourTime(request.playedAt),
        }));

        // --- CSV writer --- \\
        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: "title", title: "Title" },
                { id: "artist", title: "Artist" },
                { id: "playedAt", title: "Played At" },
            ],
        });

        const csvHeader = csvStringifier.getHeaderString();
        const csvBody = csvStringifier.stringifyRecords(rows);

        // ----- Stream response ------------------------------------------------
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="tracklist-${room.roomCode || roomId}.csv"`,
        );
        res.write(csvHeader);
        res.write(csvBody);
        res.end();
    } catch (err) {
        console.error("There was an error attempting to export a tracklist as CSV:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble exporting the CSV, please try again.",
        });
    }
};

/**
 * @desc    Export Room Tracklist Plain text (Played songs only)
 * @route   GET /api/exports/:roomId/tracklist/txt
 * @access  PRIVATE
 * @feats   Allows auth'd users to export the tracklist as txt for a room, once it's over.
 */
export const exportTracklistTxt = async (req, res) => {
    const { roomId } = req.params;

    try {
        if (!roomId) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room ID missing",
                message: "Room ID is required.",
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

        if (room.active) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room is active",
                message: "A room must be inactive to export the tracklist.",
            });
        }

        const user = req.user._id;
        if (room.roomCreator.toString() !== user.toString()) {
            return res.status(403).json({
                success: false,
                error: "Forbidden - not authorized",
                message:
                    "You are not authorized to export tracklists for rooms you did not create.",
            });
        }

        const playedSongs = await Request.find({ roomId, status: "played" }).populate("track");

        if (!playedSongs.length) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Could not find any played songs for this room.",
            });
        }

        // --- Build a nice table --- \\
        const header = [pad("Title", 35), pad("Artist", 30), pad("Played At", 12)].join(" | ");

        const separator = "-".repeat(header.length);
        const lines = [header, separator];

        for (const request of playedSongs) {
            const line = [
                pad(truncate(request.track.title, 35), 35),
                pad(truncate(request.track.artist, 30), 30),
                pad(formatTo12HourTime(request.playedAt), 12),
            ].join(" | ");
            lines.push(line);
        }

        const txt = lines.join("\n");

        // ----- Stream response ------------------------------------------------
        res.setHeader("Content-Type", "text/plain");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="tracklist-${room.roomCode || roomId}.txt"`,
        );
        res.send(txt);
    } catch (err) {
        console.error("There was an error attempting to export a tracklist as plaintext:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble exporting your plaintext file, please try again.",
        });
    }
};

/**
 * @desc    Exporting a Room's Requests as JSON
 * @route   GET /api/exports/:roomCode/export/json
 * @access  PUBLIC
 * @feats   If Room active -> false: Exports a list of the requests (will implement played songs only later) for a Room in csv or json?
 */

export const exportRoomRequestsJson = async (req, res) => {
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

        // check if room exists
        if (!room) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Room does not exist.",
            });
        }

        // rooms must inactive before exporting requests
        if (room.active) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room is active",
                message: "Room must be over before exporting requests.",
            });
        }

        // find requests
        const requests = await Request.find({ roomId: room._id });

        if (!requests.length) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Could not find any requests for this room.",
            });
        }

        const data = requests.map((req) => ({
            title: req.track.title,
            artist: req.track.artist,
            votes: req.votes,
            status: req.status,
            // playedAt: formatTo12HourTime(req.playedAt),
            playedAt: req.playedAt ? formatTo12HourTime(req.playedAt) : "",
            requestedAt: formatToFullDate12Hour(req.createdAt),
            requestedBy: req.requestedBy,
        }));

        return res.status(200).json({
            success: true,
            message: "Requests exported successfully.",
            data,
        });
    } catch (err) {
        console.error("There was an error exporting a room's requests as JSON:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble exporting the requests of the room, please try again.",
        });
    }
};

/**
 * @desc    Exporting a Room's Requests as CSV
 * @route   GET /api/exports/:roomCode/export/csv
 * @access  PUBLIC
 * @feats   If Room active -> false: Exports a list of the requests (will implement played songs only later) for a Room in csv or json?
 */

export const exportRoomRequestsCsv = async (req, res) => {
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

        if (room.active) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room is active",
                message: "Room must be over before exporting requests.",
            });
        }

        // TODO: test with and without populate
        // const requests = await Request.find({ roomId: room._id });
        const requests = await Request.find({ roomId: room._id }).populate("track");

        if (!requests.length) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Could not find any requests for this room.",
            });
        }

        // --- Prepare rows --- \\

        const rows = requests.map((r) => ({
            title: r.track.title,
            artist: r.track.artist,
            votes: r.votes,
            status: r.status,
            // playedAt: r.playedAt ? formatTo12HourTime(r.playedAt) : '',
            playedAt: r.playedAt ? formatTo12HourTime(r.playedAt) : "",
            requestedAt: formatToFullDate12Hour(r.createdAt),
            requestedBy: r.requestedBy,
        }));

        // --- CSV writer --- \\

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: "title", title: "Title" },
                { id: "artist", title: "Artist" },
                { id: "votes", title: "Votes" },
                { id: "status", title: "Status" },
                { id: "playedAt", title: "Played At" },
                { id: "requestedAt", title: "Requested At" },
                { id: "requestedBy", title: "Requested By" },
            ],
        });

        const csvHeader = csvStringifier.getHeaderString();
        const csvBody = csvStringifier.stringifyRecords(rows);

        // ----- Stream response ------------------------------------------------
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="requests-${roomCode}.csv"`);
        res.write(csvHeader);
        res.write(csvBody);
        res.end();
    } catch (err) {
        console.error("There was an error attempting to export a room's requests as CSV:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble exporting the CSV, please try again.",
        });
    }
};

/**
 * @desc    Exporting a Room's Requests as Plain text
 * @route   GET /api/exports/:roomCode/export/plaintext
 * @access  PUBLIC
 * @feats   If Room active -> false: Exports a list of the requests (will implement played songs only later) for a Room in csv or json?
 */

export const exportRoomRequestsTxt = async (req, res) => {
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

        if (room.active) {
            return res.status(400).json({
                success: false,
                error: "Invalid Credentials: room is active",
                message: "Room must be over before exporting requests.",
            });
        }

        // TODO: test
        // const requests = await Request.find({ roomId: room._id })
        const requests = await Request.find({ roomId: room._id }).populate("track");

        if (!requests.length) {
            return res.status(404).json({
                success: false,
                error: "Resource not found",
                message: "Could not find any requests for this room.",
            });
        }

        // --- Build a nice table --- \\

        const header = [
            pad("Title", 30),
            pad("Artist", 25),
            pad("Votes", 6),
            pad("Status", 10),
            pad("Played At", 12),
            pad("Requested At", 20),
            pad("Requested By", 20),
        ].join(" | ");

        const separator = "-".repeat(header.length);

        const lines = [header, separator];

        for (const r of requests) {
            const line = [
                pad(truncate(r.track.title, 30), 30),
                pad(truncate(r.track.artist, 25), 25),
                pad(String(r.votes), 6),
                pad(r.status, 10),
                pad(r.playedAt ? formatTo12HourTime(r.playedAt) : "", 12),
                pad(formatToFullDate12Hour(r.createdAt), 20),
                pad(r.requestedBy, 20),
            ].join(" | ");
            lines.push(line);
        }

        const txt = lines.join("\n");

        // ----- Stream response ------------------------------------------------
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Content-Disposition", `attachment; filename="requests-${roomCode}.txt"`);
        res.send(txt);
    } catch (err) {
        console.error("There was an error exporting requests as plaintext:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble exporting the plain text file, please try again.",
        });
    }
};

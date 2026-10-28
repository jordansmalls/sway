import { beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../src/app";
import config from "../src/config/config";
import Room from "../src/models/room.model";
import SongRequest from "../src/models/request.model";
import User from "../src/models/user.model";

const formats = ["json", "csv", "txt"] as const;
const kinds = ["requests", "tracklist"] as const;
type ExportKind = (typeof kinds)[number];
const roomCode = "EXPRT";
const playedAt = new Date("2026-10-10T20:30:00.000Z");
const createdAt = new Date("2026-10-10T19:00:00.000Z");
const track = {
    spotifyTrackId: "played-song",
    title: "Played song",
    artist: "Played artist",
    spotifyLink: "https://open.spotify.com/track/played-song",
    spotifyURI: "spotify:track:played-song",
};
let roomId: string;
let ownerCookie: string;
let otherCookie: string;

const exportPath = (kind: ExportKind, format: string, identifier = kind === "requests" ? roomCode : roomId) =>
    `/api/exports/${identifier}/${kind === "requests" ? "export" : "tracklist"}/${format}`;

// Read quoted CSV fields, including doubled quotes and embedded CR/LF, independently
// of the CSV writer used by the endpoint.
function parseCsv(csv: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < csv.length; index++) {
        const character = csv[index];
        if (character === '"') {
            if (quoted && csv[index + 1] === '"') {
                cell += '"';
                index++;
            } else {
                quoted = !quoted;
            }
        } else if (!quoted && character === ",") {
            row.push(cell);
            cell = "";
        } else if (!quoted && (character === "\n" || character === "\r")) {
            rows.push([...row, cell]);
            row = [];
            cell = "";
            if (character === "\r" && csv[index + 1] === "\n") index++;
        } else {
            cell += character;
        }
    }
    expect(quoted).toBe(false);
    if (row.length || cell) rows.push([...row, cell]);
    return rows;
}

async function seedCsvCells(values: { title: string; artist: string; requestedBy?: string; playedAt?: Date | null }[]) {
    await SongRequest.deleteMany({ roomId });
    // Keep legacy/untrusted leading whitespace intact rather than applying the
    // model's title/artist trimming before testing the export boundary.
    await SongRequest.collection.insertMany(values.map((value, index) => ({
        roomId: new mongoose.Types.ObjectId(roomId),
        status: "played",
        votes: 2,
        playedAt: value.playedAt === undefined ? playedAt : value.playedAt,
        createdAt,
        updatedAt: createdAt,
        requestedBy: value.requestedBy,
        track: { ...track, spotifyTrackId: `csv-${index}`, title: value.title, artist: value.artist },
    })));
}

beforeEach(async () => {
    const jwtSecret = config.jwt_secret;
    if (!jwtSecret) throw new Error("Test JWT secret is not configured.");
    const [owner, other] = await Promise.all([
        User.create({ email: "export-owner@example.com", password: "password123" }),
        User.create({ email: "export-other@example.com", password: "password123" }),
    ]);
    ownerCookie = `jwt=${jwt.sign({ userId: String(owner._id), sessionVersion: owner.sessionVersion }, jwtSecret)}`;
    otherCookie = `jwt=${jwt.sign({ userId: String(other._id), sessionVersion: other.sessionVersion }, jwtSecret)}`;
    const room = await Room.create({
        roomName: "Export room",
        roomDescription: "Export regressions",
        roomCode,
        roomCreator: owner._id,
        active: false,
    });
    roomId = String(room._id);
    await SongRequest.create((["played", "pending", "playing", "rejected"] as const).map((status) => ({
        roomId: room._id,
        status,
        votes: 2,
        playedAt: status === "played" ? playedAt : null,
        createdAt,
        requestedBy: `${status} guest`,
        track: {
            ...track,
            spotifyTrackId: `${status}-song`,
            title: `${status[0]!.toUpperCase()}${status.slice(1)} song`,
        },
    })));
});

describe.each(kinds)("%s exports", (kind) => {
    it.each(formats)("exports %s for the owner with the existing response style", async (format) => {
        const response = await request(app).get(exportPath(kind, format)).set("Cookie", ownerCookie).expect(200);
        if (format === "json") {
            expect(response.headers["content-type"]).toMatch(/^application\/json/);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(kind === "requests" ? "Requests exported successfully." : "Tracklist exported successfully.");
            const data = kind === "requests" ? response.body.data : response.body.tracklist;
            expect(data).toHaveLength(kind === "requests" ? 4 : 1);
            expect(data).toContainEqual(expect.objectContaining({ title: "Played song", artist: "Played artist", playedAt: expect.any(String) }));
            if (kind === "requests") {
                expect(data).toContainEqual(expect.objectContaining({
                    title: "Pending song", votes: 2, status: "pending", playedAt: "", requestedAt: expect.any(String), requestedBy: "pending guest",
                }));
                expect(data.map((item: { status: string }) => item.status).sort()).toEqual(["pending", "played", "playing", "rejected"]);
            } else {
                expect(Object.keys(data[0]).sort()).toEqual(["artist", "playedAt", "title"]);
            }
        } else {
            expect(response.headers["content-type"]).toMatch(format === "csv" ? /^text\/csv/ : /^text\/plain/);
            expect(response.headers["content-disposition"]).toBe(`attachment; filename="${kind}-${roomCode}.${format}"`);
            expect(response.text).toContain("Played song");
            for (const status of ["Pending", "Playing", "Rejected"]) {
                if (kind === "requests") expect(response.text).toContain(`${status} song`);
                else expect(response.text).not.toContain(`${status} song`);
            }
            if (format === "csv") {
                const rows = parseCsv(response.text);
                expect(rows[0]).toEqual(kind === "requests"
                    ? ["Title", "Artist", "Votes", "Status", "Played At", "Requested At", "Requested By"]
                    : ["Title", "Artist", "Played At"]);
                expect(rows).toHaveLength(kind === "requests" ? 5 : 2);
            }
        }
    });

    it.each(formats)("rejects guests with 401 for %s", async (format) => {
        const response = await request(app).get(exportPath(kind, format)).expect(401);
        expect(response.body).toEqual({ message: "Not authorized, no token" });
    });

    it.each(formats)("rejects another DJ with 403 for %s, including active rooms", async (format) => {
        for (const active of [false, true]) {
            await Room.updateOne({ _id: roomId }, { active });
            const response = await request(app).get(exportPath(kind, format)).set("Cookie", otherCookie).expect(403);
            expect(response.body).toEqual({
                success: false,
                error: expect.stringMatching(/^Forbidden/),
                message: expect.stringContaining("not authorized"),
            });
        }
    });

    it.each(formats)("returns 404 for a missing room in %s", async (format) => {
        const identifier = kind === "requests" ? "GONE1" : String(new mongoose.Types.ObjectId());
        const response = await request(app).get(exportPath(kind, format, identifier)).set("Cookie", ownerCookie).expect(404);
        expect(response.body).toEqual({ success: false, error: "Resource not found", message: expect.any(String) });
    });

    it.each(formats)("handles malformed room identifiers in %s without a server error", async (format) => {
        const identifiers = kind === "requests" ? ["invalid-code", "%00"] : ["invalid-id", "abcdefghijkl", "z".repeat(24)];
        for (const identifier of identifiers) {
            const response = await request(app).get(exportPath(kind, format, identifier)).set("Cookie", ownerCookie)
                .expect(kind === "requests" ? 404 : 400);
            expect(response.body).toEqual({ success: false, error: expect.any(String), message: expect.any(String) });
        }
    });

    it.each(formats)("returns 404 when the room identifier is absent in %s", async (format) => {
        const response = await request(app).get(exportPath(kind, format, "")).set("Cookie", ownerCookie).expect(404);
        expect(response.body.success).toBe(false);
    });

    it.each(formats)("keeps active-room exports unavailable to the owner in %s", async (format) => {
        await Room.updateOne({ _id: roomId }, { active: true });
        const response = await request(app).get(exportPath(kind, format)).set("Cookie", ownerCookie).expect(400);
        expect(response.body).toEqual({ success: false, error: "Invalid Credentials: room is active", message: expect.any(String) });
    });

    it.each(formats)("preserves empty-export behavior in %s", async (format) => {
        await SongRequest.deleteMany({ roomId });
        const emptyTracklistJson = kind === "tracklist" && format === "json";
        const response = await request(app).get(exportPath(kind, format)).set("Cookie", ownerCookie).expect(emptyTracklistJson ? 200 : 404);
        if (emptyTracklistJson) expect(response.body.tracklist).toEqual([]);
        else expect(response.body).toEqual({ success: false, error: "Resource not found", message: expect.any(String) });
    });

    it("neutralizes formula and leading control-character prefixes in every untrusted CSV column", async () => {
        const values = [
            "=1+1", "+SUM(1,2)", "-2+3", "@SUM(1,2)",
            "\t=1+1", "\r=1+1", "\n=1+1", "\u0000=1+1", "\v=1+1", "\f=1+1", "\u001f=1+1", "\u007f=1+1",
            " =1+1", "  +1+1", "\uFEFF@SUM(1,2)", " \u0000=1+1",
            "\tGuest", "\rGuest", "\nGuest",
        ];
        await seedCsvCells(values.map((value) => ({ title: value, artist: value, requestedBy: value })));
        const response = await request(app).get(exportPath(kind, "csv")).set("Cookie", ownerCookie).expect(200);
        const rows = parseCsv(response.text).slice(1);
        expect(rows).toHaveLength(values.length);
        expect(rows.map((row) => row[0])).toEqual(expect.arrayContaining(values.map((value) => `'${value}`)));
        for (const row of rows) {
            expect(row).toHaveLength(kind === "requests" ? 7 : 3);
            expect(row[1]).toBe(row[0]);
            if (kind === "requests") expect(row[6]).toBe(row[0]);
        }
    });

    it("quotes commas, quotes, and CR/LF without corrupting legitimate CSV text or creating rows", async () => {
        const values = [
            { title: 'Funk, "Soul"\nMix', artist: "Björk\rLive", requestedBy: 'Guest, "A"\r\nB' },
            { title: "  Café d'été  ", artist: "Rock + Roll", requestedBy: "'Already literal" },
            { title: 'Intro",=1+1,"Outro', artist: "Artist\n=2+2", requestedBy: "Guest\r=3+3" },
            { title: "Instrumental", artist: "Guest - DJ" },
        ];
        await seedCsvCells(values);
        const response = await request(app).get(exportPath(kind, "csv")).set("Cookie", ownerCookie).expect(200);
        expect(response.text).toContain('"Funk, ""Soul""\nMix","Björk\rLive"');
        expect(response.text).toContain('"Intro"",=1+1,""Outro","Artist\n=2+2"');
        if (kind === "requests") expect(response.text).toContain('"Guest, ""A""\r\nB"');
        const rows = parseCsv(response.text).slice(1);
        expect(rows).toHaveLength(values.length);
        for (const value of values) {
            const row = rows.find((row) => row[0] === value.title);
            expect(row).toBeDefined();
            expect(row).toHaveLength(kind === "requests" ? 7 : 3);
            expect(row![1]).toBe(value.artist);
            if (kind === "requests") expect(row![6]).toBe(value.requestedBy ?? "");
        }
    });

    it.each(["json", "txt"] as const)("preserves literal formula-like text in %s exports", async (format) => {
        await seedCsvCells([{ title: "=1+1", artist: "+Artist", requestedBy: "@Guest" }]);
        const response = await request(app).get(exportPath(kind, format)).set("Cookie", ownerCookie).expect(200);
        if (format === "json") {
            const data = kind === "requests" ? response.body.data : response.body.tracklist;
            expect(data[0]).toMatchObject({ title: "=1+1", artist: "+Artist" });
            if (kind === "requests") expect(data[0].requestedBy).toBe("@Guest");
        } else {
            expect(response.text).toContain("=1+1");
            expect(response.text).toContain("+Artist");
            if (kind === "requests") expect(response.text).toContain("@Guest");
            expect(response.text).not.toContain("'=1+1");
        }
    });
});

describe("tracklist exports", () => {
    it.each(formats)("leaves Played At blank for a played song saved without playedAt in %s", async (format) => {
        await seedCsvCells([{ title: "Untimed song", artist: "Untimed artist", playedAt: null }]);
        const response = await request(app).get(exportPath("tracklist", format)).set("Cookie", ownerCookie).expect(200);
        if (format === "json") {
            expect(response.body.tracklist).toEqual([{ title: "Untimed song", artist: "Untimed artist", playedAt: "" }]);
        } else if (format === "csv") {
            expect(parseCsv(response.text).slice(1)).toEqual([["Untimed song", "Untimed artist", ""]]);
        } else {
            const line = response.text.split("\n").find((line) => line.includes("Untimed song"));
            expect(line?.split("|").map((cell) => cell.trim())).toEqual(["Untimed song", "Untimed artist", ""]);
        }
    });
});

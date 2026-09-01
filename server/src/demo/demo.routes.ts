import express from "express";
import type { Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import { rateLimit, type Options } from "express-rate-limit";
import { DemoSession, type DemoDocument } from "./demo.model";
import { demoRecommendations, demoRequest, seedDemo } from "./demo.seed";
import { demoDisplayQr } from "./demo.display";
import { getDemoSpotifyTrack, searchDemoSpotify, sendDemoSpotifyError } from "./demo.spotify";

export const DEMO_LIFETIME_MS = 30 * 60_000;
export const hashDemoToken = (token: string) => createHash("sha256").update(token).digest("hex");
const fail = (res: Response, status: number, message: string) => res.status(status).json({ success: false, message });
const limiter = (windowMs: number, limit: number, extra: Partial<Options> = {}) => rateLimit({
    windowMs, limit, standardHeaders: "draft-8", legacyHeaders: false,
    message: { success: false, message: "Too many demo requests. Please try again shortly." }, ...extra,
});
export const demoCreationLimiter = limiter(60 * 60_000, 10);
export const demoSpotifyIpLimiter = limiter(60_000, 60, {
    message: { success: false, message: "Too many demo music searches from this network. Please try again in a minute." },
});
export const demoSpotifySessionLimiter = limiter(60_000, 20, {
    keyGenerator: (_req, res) => String(res.locals.demo._id),
    message: { success: false, message: "Demo music search limit reached. Please try again in a minute." },
});
const demoRouter = express.Router();
demoRouter.use(limiter(60_000, 240));
demoRouter.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

demoRouter.post("/session", demoCreationLimiter, async (_req, res) => {
    const djToken = randomBytes(32).toString("hex");
    const guestToken = randomBytes(32).toString("hex");
    const session = await DemoSession.create({
        djTokenHash: hashDemoToken(djToken), guestTokenHash: hashDemoToken(guestToken),
        expiresAt: new Date(Date.now() + DEMO_LIFETIME_MS), ...seedDemo(),
    });
    res.status(201).json({ success: true, djToken, guestToken, expiresAt: session.expiresAt,
        room: session.room, user: session.user });
});

demoRouter.use(async (req, res, next) => {
    const token = req.get("X-Demo-Token");
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return fail(res, 401, "Start a demo to continue.");
    const hash = hashDemoToken(token);
    const session = await DemoSession.findOne({ $or: [{ djTokenHash: hash }, { guestTokenHash: hash }] });
    if (!session || session.expiresAt.getTime() <= Date.now()) return fail(res, 410, "Your demo has expired. Start a new demo to keep exploring.");
    res.locals.demo = session;
    res.locals.role = session.djTokenHash === hash ? "dj" : "guest";
    next();
});
demoRouter.use(limiter(60_000, 180, { keyGenerator: (_req, res) => String(res.locals.demo._id) }));
demoRouter.use(limiter(60_000, 40, { keyGenerator: (_req, res) => String(res.locals.demo._id), skip: (req) => req.method === "GET" }));

// Apply only after authentication/expiry checks, including song submissions that
// may verify a track upstream. Submitting directly cannot bypass search limits.
demoRouter.use("/api/spotify", demoSpotifyIpLimiter, demoSpotifySessionLimiter);
demoRouter.post("/api/requests", demoSpotifyIpLimiter, demoSpotifySessionLimiter);

demoRouter.get("/session", (_req, res) => {
    const session: DemoDocument = res.locals.demo;
    res.json({ success: true, expiresAt: session.expiresAt, room: session.room, user: session.user });
});

// Saving an entire sandbox uses a version check to prevent concurrent lost updates.
async function save(session: DemoDocument, res: Response) {
    session.markModified("room");
    session.markModified("user");
    session.markModified("requests");
    try { await session.save(); return true; }
    catch (error) {
        if (error instanceof Error && error.name === "VersionError") {
            fail(res, 409, "The demo changed in another view. Please try again.");
            return false;
        }
        throw error;
    }
}

demoRouter.post("/reset", async (_req, res) => {
    const session: DemoDocument = res.locals.demo;
    const seed = seedDemo();
    // Keep URLs, role tokens and the fixed expiration stable across resets.
    session.room = { ...seed.room, _id: session.room._id, roomCode: session.room.roomCode, roomCreator: session.user._id };
    session.user = { ...seed.user, _id: session.user._id };
    session.requests = seed.requests.map((request) => ({ ...request, roomId: session.room._id }));
    session.votedIds = [];
    if (await save(session, res)) res.json({ success: true, message: "Demo reset." });
});

// Only these API contracts exist in the sandbox. No normal controllers, credentials,
// account integrations, production IDs or production database collections are used.
demoRouter.use("/api", async (req, res) => {
    const session: DemoDocument = res.locals.demo;
    const { room, user } = session;
    const requests = session.requests;
    const path = req.path;
    const body = req.body ?? {};
    const ok = (data = {}) => res.json({ success: true, ...data });
    const ownRoom = (id: unknown) => id === room._id || id === room.roomCode;
    const dj = () => res.locals.role === "dj";
    const notFound = () => fail(res, 404, "That item is not part of your demo.");
    const formatTime = (value: string | null) => value ? new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";

    if (req.method === "GET") {
        if (path === "/users/me") return ok({ user });
        if (path === "/rooms/recent") return ok({ latestRooms: [room] });
        const roomMatch = path.match(/^\/rooms\/([^/]+)(\/fetch\/(requests|spotify\/played))?$/);
        if (roomMatch) {
            if (!ownRoom(roomMatch[1])) return notFound();
            if (!roomMatch[2]) return ok({ roomDetails: { ...room, roomQr: await demoDisplayQr() } });
            return ok({ data: requests.filter((r) => roomMatch[3] !== "spotify/played" || r.status === "played").map((r) => ({
                id: r._id, title: r.track.title, artist: r.track.artist, albumArtUrl: r.track.albumArtUrl,
                spotifyUri: r.track.spotifyURI, spotifyLink: r.track.spotifyLink, status: r.status, votes: r.votes,
                requestedAt: roomMatch[3] === "spotify/played" ? formatTime(r.createdAt) : r.createdAt,
                requestedBy: r.requestedBy,
                playedAt: roomMatch[3] === "spotify/played" ? formatTime(r.playedAt) : r.playedAt,
            })) });
        }
        const listMatch = path.match(/^\/requests\/([^/]+)\/(requests|filter)$/);
        if (listMatch) {
            if (!ownRoom(listMatch[1])) return notFound();
            return ok({ requests: requests.filter((r) => !req.query.status || r.status === req.query.status).sort((a, b) => b.votes - a.votes) });
        }
        const requestMatch = path.match(/^\/requests\/([^/]+)$/);
        if (requestMatch) {
            const item = requests.find((r) => r._id === requestMatch[1]);
            return item ? ok({ request: item }) : notFound();
        }
        if (path === "/spotify/search") {
            const query = req.query.q;
            if (typeof query !== "string" || query.trim().length < 2 || query.length > 100)
                return fail(res, 400, "Enter a search between 2 and 100 characters.");
            try { return ok({ tracks: await searchDemoSpotify(query) }); }
            catch (error) { return sendDemoSpotifyError(error, res); }
        }
        const trackMatch = path.match(/^\/spotify\/tracks\/([^/]+)$/);
        if (trackMatch) {
            try { return ok({ track: await getDemoSpotifyTrack(trackMatch[1]!) }); }
            catch (error) { return sendDemoSpotifyError(error, res); }
        }
        if (path === `/analytics/${user._id}/most-played-songs`) return ok({ songs: demoRecommendations("personal") });
        if (path === "/global/tracks/played") return ok({ data: demoRecommendations("global"), cached: false });
        return fail(res, 403, "This feature is not available in the room demo.");
    }

    if (req.method === "PUT" && path === "/rooms/end") {
        if (!dj()) return fail(res, 403, "Only the DJ can end the demo room.");
        if (!ownRoom(body.roomId)) return notFound();
        room.active = false; user.hasActiveRoom = false;
        if (await save(session, res)) return ok({ message: "Demo room ended." });
        return;
    }
    const editRoom = path.match(/^\/rooms\/([^/]+)$/);
    if (req.method === "PUT" && editRoom) {
        if (!dj()) return fail(res, 403, "Only the DJ can edit the demo room.");
        if (!ownRoom(editRoom[1])) return notFound();
        if (typeof body.roomName !== "string" || !body.roomName.trim() || body.roomName.length > 100 ||
            typeof body.roomDescription !== "string" || !body.roomDescription.trim() || body.roomDescription.length > 450)
            return fail(res, 400, "Enter a room name (up to 100 characters) and description (up to 450 characters).");
        room.roomName = body.roomName.trim(); room.roomDescription = body.roomDescription.trim(); room.updatedAt = new Date().toISOString();
        if (await save(session, res)) return ok({ updatedRoom: room });
        return;
    }
    if (!room.active) return fail(res, 409, "This demo room has ended. Reset it to try again.");
    if (req.method === "POST" && path === "/requests") {
        if (!ownRoom(body.roomId)) return notFound();
        const trackId = body.track?.spotifyTrackId;
        if (typeof trackId !== "string" || !/^[A-Za-z0-9]{22}$/.test(trackId)) return fail(res, 400, "Choose a valid Spotify track.");
        if (requests.length >= 60) return fail(res, 400, "Demo request limit reached. Reset the demo to try again.");
        if (requests.some((r) => r.track.spotifyTrackId === trackId && ["pending", "playing"].includes(r.status)))
            return fail(res, 409, "That song is already in the queue. Give it a vote instead!");
        let track;
        try { track = await getDemoSpotifyTrack(trackId); }
        catch (error) { return sendDemoSpotifyError(error, res); }
        // Slow provider responses must not let a session outlive its fixed expiry.
        if (session.expiresAt.getTime() <= Date.now()) return fail(res, 410, "Your demo has expired. Start a new demo to keep exploring.");
        if (requests.some((r) => r.track.spotifyTrackId === track.id && ["pending", "playing"].includes(r.status)))
            return fail(res, 409, "That song is already in the queue. Give it a vote instead!");
        const item = demoRequest(track, room._id, String(body.requestedBy ?? "Demo guest").trim().slice(0, 40) || "Demo guest");
        requests.push(item);
        if (await save(session, res)) return res.status(201).json({ success: true, request: item });
        return;
    }
    const action = path.match(/^\/requests\/([^/]+)\/(mark-playing|mark-played|delete)$/);
    const isVote = req.method === "PUT" && path === "/requests/vote";
    if (isVote || (action && ((req.method === "PUT" && action[2] !== "delete") || (req.method === "DELETE" && action[2] === "delete")))) {
        if (!isVote && !dj()) return fail(res, 403, "Only the DJ can manage demo requests.");
        const id = isVote ? body.requestId : action![1];
        const item = requests.find((r) => r._id === id);
        if (!item) return notFound();
        const now = new Date().toISOString();
        if (isVote) {
            if (item.status !== "pending") return fail(res, 409, "Only queued songs can receive votes.");
            if (session.votedIds.includes(id)) return fail(res, 409, "You already voted for this song.");
            session.votedIds.push(id); item.votes += 1;
        } else if (action![2] === "delete") {
            session.requests = requests.filter((r) => r._id !== id);
        } else if (action![2] === "mark-playing") {
            for (const other of requests) if (other.status === "playing" && other._id !== id) {
                other.status = "played"; other.completedAt = now; other.updatedAt = now;
            }
            item.status = "playing"; item.playedAt = now; item.completedAt = null;
        } else { item.status = "played"; item.playedAt ??= now; item.completedAt = now; }
        item.updatedAt = now;
        if (await save(session, res)) return ok({ request: item, message: "Demo updated." });
        return;
    }
    return fail(res, 403, "This action is not available in the demo. Real accounts and external connections cannot be changed.");
});

export default demoRouter;

import { Types } from "mongoose";
import Request from "../models/request.model.js";
import Room from "../models/room.model.js";

type Status = "pending" | "playing" | "played" | "rejected";
const transitions: Record<Status, Status[]> = {
    pending: ["playing", "rejected"], playing: ["played"], played: ["playing"], rejected: [],
};

function failure(status: number, message: string): never {
    throw Object.assign(new Error(message), { status, expose: true });
}

export async function ownedRequestFilter(requestId: string, ownerId: string) {
    if (!Types.ObjectId.isValid(requestId)) failure(404, "Request not found.");
    const request = await Request.findById(requestId).select("roomId");
    if (!request) failure(404, "Request not found.");
    const room = await Room.findOne({ _id: request.roomId, roomCreator: ownerId }).select("_id");
    if (!room) {
        if (!await Room.exists({ _id: request.roomId })) failure(404, "Room not found.");
        failure(403, "Not authorized to update this request.");
    }
    return { _id: request._id, roomId: room._id };
}

export async function transitionRequestStatus(requestId: string, ownerId: string, to: Status) {
    const filter = await ownedRequestFilter(requestId, ownerId);
    const original = await Request.findOne(filter);
    if (!original) failure(404, "Request not found.");
    const unchanged = (request: typeof original) => ({ request, changed: false, demoted: [] });
    if (original.status === to) return unchanged(original);
    if (!transitions[original.status as Status]?.includes(to)) failure(409, "Invalid request status transition.");

    if (to !== "playing") {
        const request = await Request.findOneAndUpdate({ ...filter, status: original.status }, {
            $set: { status: to, ...(to === "played" ? { completedAt: new Date() } : {}) },
        }, { returnDocument: "after" });
        if (request) return { request, changed: true, demoted: [] };
        const current = await Request.findOne(filter);
        if (current?.status === to) return unchanged(current);
        failure(409, "Request changed. Please try again.");
    }

    const demoted: (typeof original)[] = [];
    for (let attempt = 0; attempt <= 2; attempt++) {
        // A replay uses a pending re-request, or a new row, never the played original.
        const target = original.status === "played"
            ? await Request.findOne({ roomId: filter.roomId, "track.spotifyTrackId": original.track!.spotifyTrackId, status: { $in: ["pending", "playing"] } })
            : await Request.findOne(filter);
        if (target?.status === "playing") return { request: target, changed: false, demoted };
        if (target && target.status !== "pending") failure(409, "Request changed. Please try again.");
        const changedAt = new Date();
        const previous = await Request.find({ roomId: filter.roomId, status: "playing", ...(target ? { _id: { $ne: target._id } } : {}) });
        if (previous.length) {
            await Request.updateMany({ _id: { $in: previous.map((row) => row._id) }, roomId: filter.roomId, status: "playing" }, {
                $set: { status: "played", completedAt: changedAt },
            });
            demoted.push(...await Request.find({ _id: { $in: previous.map((row) => row._id) }, status: "played", completedAt: changedAt }));
        }
        try {
            const request = target
                ? await Request.findOneAndUpdate({ _id: target._id, roomId: filter.roomId, status: "pending" }, {
                    $set: { status: "playing", playedAt: changedAt, completedAt: null },
                }, { returnDocument: "after" })
                : await Request.create({ roomId: filter.roomId, track: original.toObject().track, status: "playing", playedAt: changedAt, votes: 0, requestedBy: null, replayOf: original._id });
            if (request) return { request, changed: true, demoted };
        } catch (error) {
            // Either another playback won or a guest re-requested the replayed track.
            if ((error as { code?: number }).code !== 11000) throw error;
        }
    }
    failure(409, "The queue changed. Please try again.");
}

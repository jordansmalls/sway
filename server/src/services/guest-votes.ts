import Request from "../models/request.model.js";
import Room from "../models/room.model.js";
import Vote from "../models/vote.model.js";

function failure(status: number, message: string): never {
    throw Object.assign(new Error(message), { status, expose: true });
}

export async function castVote(requestId: string, guestId: string) {
    const existing = await Request.findById(requestId);
    if (!existing) failure(404, "Request not found.");
    const room = await Room.findById(existing.roomId).select("active");
    if (!room) failure(404, "Room not found.");
    if (!room.active) failure(409, "This room has ended and is no longer accepting votes.");
    if (!["pending", "playing"].includes(existing.status)) failure(409, "This request is no longer in the queue.");
    try {
        await Vote.create({ requestId, roomId: existing.roomId, guestId });
    } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        return { request: await Request.findById(requestId) ?? existing, alreadyVoted: true };
    }
    const request = await Request.findOneAndUpdate({ _id: requestId, status: { $in: ["pending", "playing"] } }, { $inc: { votes: 1 } }, { returnDocument: "after" });
    if (!request) {
        await Vote.deleteOne({ requestId, guestId });
        failure(409, "The queue changed. Please try again.");
    }
    return { request, alreadyVoted: false };
}

// Sway runs one server instance. Serialize admissions so concurrent count checks
// cannot overfill a room or a guest's pending submissions. Votes need no lock.
const admissions = new Map<string, Promise<void>>();
export async function withQueueAdmission<T>(roomId: string, write: () => Promise<T>): Promise<T> {
    const previous = admissions.get(roomId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    admissions.set(roomId, current);
    await previous;
    try { return await write(); }
    finally {
        release();
        if (admissions.get(roomId) === current) admissions.delete(roomId);
    }
}

// The room cap applies to everyone; the per-guest cap does not apply to the room's DJ.
export async function checkQueueCapacity(roomId: string, guestId: string, { roomOwner = false } = {}) {
    if (await Request.countDocuments({ roomId, status: "pending" }) >= 200) failure(409, "This room's queue is full. Please try again after a track is played.");
    if (!roomOwner && await Request.countDocuments({ roomId, guestId, status: "pending" }) >= 5) failure(409, "You already have five pending requests in this room.");
}

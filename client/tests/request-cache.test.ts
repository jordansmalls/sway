import { describe, expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { optimisticallyUpdateRequest, requestKeys, sortRequestsForQueue, upsertRequestInRoomCache, type RequestsResponse } from "../src/api/request-cache";
import type { SongRequest } from "../src/api/types";

const song = (id: string, offset: number, status: SongRequest["status"] = "pending"): SongRequest => ({
    _id: id, roomId: "room", status, votes: 1, playedAt: null, completedAt: null,
    track: { spotifyTrackId: id, title: id, artist: "Artist", spotifyLink: "", spotifyURI: "" },
    createdAt: new Date(1000 + offset).toISOString(), updatedAt: new Date(1000 + offset).toISOString(),
});
function setup() {
    const client = new QueryClient();
    client.setQueryData(requestKeys.byRoom("room"), { success: true, requests: [song("a", 0), song("b", 1), song("c", 2, "playing")] });
    const rows = () => client.getQueryData<RequestsResponse>(requestKeys.byRoom("room"))!.requests;
    return { client, rows };
}

describe("Optimistic request cache", () => {
    it("keeps tied requests in arrival order through socket replacements", () => {
        const { client, rows } = setup();
        upsertRequestInRoomCache(client, song("a", 0));
        upsertRequestInRoomCache(client, song("d", 3));
        expect(rows().map((row) => row._id)).toEqual(["a", "b", "c", "d"]);
        expect(sortRequestsForQueue([song("z", 0), song("a", 0)]).map((row) => row._id)).toEqual(["a", "z"]);
    });
    it("immediately increments and reorders votes, and reconciles without double counting", () => {
        const { client, rows } = setup();
        optimisticallyUpdateRequest(client, "b", "vote");
        expect(rows()[0]?._id).toBe("b");
        expect(rows()[0]?.votes).toBe(2);
        upsertRequestInRoomCache(client, { ...song("b", 1), votes: 2 });
        expect(rows()[0]?.votes).toBe(2);
    });
    it("rolls back a failed vote without losing another song's update", () => {
        const { client, rows } = setup();
        const rollback = optimisticallyUpdateRequest(client, "b", "vote");
        upsertRequestInRoomCache(client, { ...song("a", 0), votes: 4 });
        rollback();
        expect(rows().find((row) => row._id === "b")?.votes).toBe(1);
        expect(rows()[0]?.votes).toBe(4);
    });
    it("switches now playing immediately and restores both songs if it fails", () => {
        const { client, rows } = setup();
        const rollback = optimisticallyUpdateRequest(client, "b", "playing");
        expect(rows().filter((row) => row.status === "playing").map((row) => row._id)).toEqual(["b"]);
        expect(rows().find((row) => row._id === "c")?.status).toBe("played");
        rollback();
        expect(rows().filter((row) => row.status === "playing").map((row) => row._id)).toEqual(["c"]);
        expect(rows().find((row) => row._id === "b")?.status).toBe("pending");
    });
    it("removes a song immediately and restores it in position on failure", () => {
        const { client, rows } = setup();
        const rollback = optimisticallyUpdateRequest(client, "b", "delete");
        expect(rows().map((row) => row._id)).toEqual(["a", "c"]);
        optimisticallyUpdateRequest(client, "a", "vote");
        rollback();
        expect(rows().map((row) => row._id)).toEqual(["a", "b", "c"]);
        expect(rows()[0]?.votes).toBe(2);
    });
    it("completes playing songs immediately and rolls back completion", () => {
        const { client, rows } = setup();
        const rollback = optimisticallyUpdateRequest(client, "c", "played");
        expect(rows().find((row) => row._id === "c")?.completedAt).toBeTruthy();
        rollback();
        expect(rows().find((row) => row._id === "c")?.status).toBe("playing");
    });
});

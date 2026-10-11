import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type { Server, Socket as ServerSocket } from "socket.io";
import { initSocket } from "../src/socket";

let io: Server;
let client: Socket;
let peer: ServerSocket;
const roomId = "0123456789abcdef01234567";

beforeEach(async () => {
    const http = createServer();
    io = initSocket(http);
    io.on("connection", (socket) => {
        peer = socket;
        socket.on("barrier", (acknowledge) => acknowledge());
    });
    await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
    client = connect(`http://127.0.0.1:${(http.address() as AddressInfo).port}`, {
        transports: ["websocket"],
        reconnection: false,
    });
    await new Promise<void>((resolve, reject) => {
        client.on("connect", resolve);
        client.on("connect_error", reject);
    });
});

afterEach(async () => {
    client?.disconnect();
    await new Promise<void>((resolve) => io.close(() => resolve()));
});

describe("Socket payload boundaries", () => {
    it("ignores malformed payloads and still accepts valid room subscriptions", async () => {
        for (const event of ["join-room", "leave-room", "room:update"]) {
            for (const payload of [
                null,
                42,
                [],
                {},
                { toString: null },
                { _id: { toString: null } },
                "",
                "x".repeat(10000),
            ]) {
                client.emit(event, payload);
            }
        }
        await client.timeout(2000).emitWithAck("barrier");
        expect([...peer.rooms]).toEqual([peer.id]);
        client.emit("join-room", roomId);
        await vi.waitFor(() => expect(peer.rooms.has(`room-${roomId}`)).toBe(true));
        client.emit("leave-room", roomId);
        await vi.waitFor(() => expect(peer.rooms.has(`room-${roomId}`)).toBe(false));
    });

    it("handles adapter failures inside the event handler", async () => {
        for (const action of ["join", "leave"] as const) {
            const failure = vi
                .spyOn(peer, action)
                .mockRejectedValueOnce(new Error("Adapter unavailable"));
            const error = new Promise((resolve) => client.once("room:error", resolve));
            client.emit(`${action}-room`, roomId);
            expect(await error).toEqual({ message: "Unable to change room subscription." });
            failure.mockRestore();
        }
        await client.timeout(2000).emitWithAck("barrier");
    });

    it("does not let clients broadcast room updates", async () => {
        const broadcast = vi.spyOn(io, "to");
        client.emit("room:update", { _id: roomId, roomName: "Forged" });
        await client.timeout(2000).emitWithAck("barrier");
        expect(broadcast).not.toHaveBeenCalled();
    });
});

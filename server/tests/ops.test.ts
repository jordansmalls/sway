import { createServer, request as httpRequest, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { io as connect } from "socket.io-client";
import { app } from "../src/app";
import { setShuttingDown } from "../src/controllers/health.controller";
import { createShutdown } from "../src/shutdown";
import { initSocket } from "../src/socket";

afterEach(() => {
    setShuttingDown(false);
    vi.restoreAllMocks();
});

describe("GET /health/ready", () => {
    it("returns 200 without auth once MongoDB is connected", async () => {
        const response = await request(app).get("/health/ready").expect(200);
        expect(response.body).toEqual({ success: true, status: "ready", database: "connected", shuttingDown: false });
    });

    it.each([0, 2, 3])("returns 503 when the connection state is %i", async (state) => {
        const readyState = vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(state as mongoose.ConnectionStates);
        const response = await request(app).get("/health/ready").expect(503);
        readyState.mockRestore();
        expect(response.body).toMatchObject({ success: false, status: "unavailable", database: "disconnected" });
    });

    it("returns 503 while shutting down", async () => {
        setShuttingDown(true);
        const response = await request(app).get("/health/ready").expect(503);
        expect(response.body).toMatchObject({ success: false, database: "connected", shuttingDown: true });
    });
});

// A real listening server with Socket.IO and one route whose completion the test controls.
const startServer = async () => {
    let release!: () => void;
    const released = new Promise<void>((resolve) => { release = resolve; });
    let entered!: () => void;
    const inFlight = new Promise<void>((resolve) => { entered = resolve; });
    const slowApp = express();
    slowApp.get("/slow", async (req, res) => {
        entered();
        await released;
        res.json({ finished: true });
    });
    slowApp.get("/fast", (req, res) => res.json({ ok: true }));
    const server: HttpServer = createServer(slowApp);
    const io = initSocket(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    return { server, io, port, release, inFlight };
};

// A fresh connection per call (no keep-alive agent), like a new client arriving.
const get = (port: number, path: string) => new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = httpRequest({ host: "127.0.0.1", port, path, agent: false }, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
});

describe("Graceful shutdown", () => {
    it("stops accepting connections, disconnects sockets, lets in-flight requests finish, then disconnects MongoDB", async () => {
        const { server, io, port, release, inFlight } = await startServer();
        const client = connect(`http://127.0.0.1:${port}`, { transports: ["websocket"], reconnection: false });
        await new Promise<void>((resolve, reject) => { client.on("connect", resolve); client.on("connect_error", reject); });
        const socketClosed = new Promise<string>((resolve) => client.on("disconnect", resolve));
        const disconnect = vi.fn(async () => {});
        const shutdown = createShutdown({ server, io, timeoutMs: 5_000, disconnect, log: () => {} });

        const slow = get(port, "/slow");
        await inFlight;
        const done = shutdown("SIGTERM");

        expect(await socketClosed).toBe("transport close");
        await expect(get(port, "/fast")).rejects.toMatchObject({ code: "ECONNREFUSED" });
        await request(app).get("/health/ready").expect(503);
        expect(disconnect).not.toHaveBeenCalled();

        release();
        expect(await slow).toEqual({ status: 200, body: JSON.stringify({ finished: true }) });
        expect(await done).toEqual({ timedOut: false });
        expect(disconnect).toHaveBeenCalledOnce();
        expect(server.listening).toBe(false);

        // A second signal reuses the same shutdown.
        expect(shutdown("SIGINT")).toBe(done);
        expect(disconnect).toHaveBeenCalledOnce();
        client.close();
    });

    it("closes requests still running after the timeout and disconnects anyway", async () => {
        const { server, io, port, release, inFlight } = await startServer();
        const disconnect = vi.fn(async () => {});
        const log = vi.fn();
        const shutdown = createShutdown({ server, io, timeoutMs: 100, disconnect, log });

        const hung = get(port, "/slow");
        await inFlight;
        const started = Date.now();

        expect(await shutdown("SIGTERM")).toEqual({ timedOut: true });
        expect(Date.now() - started).toBeGreaterThanOrEqual(90);
        await expect(hung).rejects.toMatchObject({ code: "ECONNRESET" });
        expect(disconnect).toHaveBeenCalledOnce();
        expect(log).toHaveBeenCalledWith(expect.stringContaining("did not finish within 100ms"));
        release();
    });

    it("shuts down an idle server immediately", async () => {
        const { server, io } = await startServer();
        const disconnect = vi.fn(async () => {});
        const started = Date.now();
        expect(await createShutdown({ server, io, disconnect, log: () => {} })("SIGTERM")).toEqual({ timedOut: false });
        expect(Date.now() - started).toBeLessThan(1_000);
        expect(disconnect).toHaveBeenCalledOnce();
    });
});

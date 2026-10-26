import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import request from "supertest";
import { ipKeyGenerator } from "express-rate-limit";
import { app } from "../src/app";
import { SPOTIFY_GUEST_LIMIT, SPOTIFY_IP_LIMIT, spotifyIpLimiter } from "../src/middlewares/rate-limiters/spotify.limiter";

// This suite uses the production Spotify limiters; setup.ts mocks them everywhere else.
vi.unmock("../src/middlewares/rate-limiters/spotify.limiter.ts");
vi.mock("../src/services/spotify-token", () => ({ getAccessToken: vi.fn().mockResolvedValue("test-token") }));
vi.mock("axios", async (importOriginal) => {
    const original = await importOriginal<typeof import("axios")>();
    return { ...original, default: { ...original.default, get: vi.fn() } };
});

const loopbackKey = ipKeyGenerator("127.0.0.1");
let server: Server;
let query = 0;

beforeAll(async () => {
    server = await new Promise<Server>((resolve) => {
        const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(async () => {
    await spotifyIpLimiter.resetKey(loopbackKey);
    vi.mocked(axios.get).mockReset().mockResolvedValue({ data: { tracks: { items: [] } } });
});

// A fresh query each time so the search cache can't hide upstream calls.
const search = (guestId?: string) => {
    const call = request(server).get("/api/spotify/search").query({ q: `limit-${++query}` });
    return guestId ? call.set("Cookie", `sway_guest=${guestId}`) : call;
};
// Overlapping requests in batches of 100: macOS caps the listen backlog at 128 connections.
const burst = async (count: number, send: () => request.Test) => {
    const responses: request.Response[] = [];
    for (let start = 0; start < count; start += 100) {
        responses.push(...await Promise.all(Array.from({ length: Math.min(100, count - start) }, send)));
    }
    return responses;
};
const statuses = (responses: request.Response[]) => responses.map(({ status }) => status);

describe("Spotify catalog limits", () => {
    it("limits one guest without affecting another guest on the same IP, and blocked calls skip Spotify", async () => {
        const guest = randomUUID();
        const responses = await burst(SPOTIFY_GUEST_LIMIT + 5, () => search(guest));

        expect(statuses(responses).filter((status) => status === 200)).toHaveLength(SPOTIFY_GUEST_LIMIT);
        const limited = responses.filter(({ status }) => status === 429);
        expect(limited).toHaveLength(5);
        expect(limited[0]!.body).toMatchObject({ success: false, error: "Too Many Requests", message: expect.any(String) });
        expect(axios.get).toHaveBeenCalledTimes(SPOTIFY_GUEST_LIMIT);

        await search(randomUUID()).expect(200);
    });

    it("shares one guest budget across search, track and artist lookups", async () => {
        const guest = randomUUID();
        await burst(SPOTIFY_GUEST_LIMIT, () => search(guest));

        await request(server).get("/api/spotify/tracks/4uLU6hMCjMI75M1A2tKUQC").set("Cookie", `sway_guest=${guest}`).expect(429);
        await request(server).get("/api/spotify/artists/0DiWol3AO6WpXZgp0goxAV/top-tracks").set("Cookie", `sway_guest=${guest}`).expect(429);
    });

    it("stops a client that clears its guest cookie at the IP ceiling", async () => {
        const responses = await burst(SPOTIFY_IP_LIMIT + 1, () => search());

        const allowed = responses.filter(({ status }) => status === 200);
        expect(allowed).toHaveLength(SPOTIFY_IP_LIMIT);
        expect(statuses(responses).filter((status) => status === 429)).toHaveLength(1);
        // Each cookieless call got its own guest ID, so only the IP ceiling stopped them.
        expect(new Set(allowed.map((response) => String(response.headers["set-cookie"]?.[0]).split(";")[0])).size).toBe(SPOTIFY_IP_LIMIT);
    });
});

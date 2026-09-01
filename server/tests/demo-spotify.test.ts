import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { getAccessToken } from "../src/controllers/spotify.controller";
import { demoSeedTracks } from "../src/demo/demo.tracks";

vi.mock("axios", async (importOriginal) => {
    const original = await importOriginal<typeof import("axios")>();
    return { ...original, default: { ...original.default, get: vi.fn() } };
});
vi.mock("../src/controllers/spotify.controller", () => ({ getAccessToken: vi.fn().mockResolvedValue("test-token") }));

const track = demoSeedTracks[0]!;
const raw = { id: track.id, name: track.name, artists: [{ name: track.artist }], duration_ms: track.duration_ms,
    album: { name: "Discovery", images: [{ url: track.albumImage }] } };

beforeEach(() => { vi.resetModules(); vi.mocked(axios.get).mockReset(); vi.mocked(getAccessToken).mockClear(); });

describe("Demo Spotify quota protection", () => {
    it("uses the real Spotify search API and shares cached canonical metadata with track verification", async () => {
        const service = await import("../src/demo/demo.spotify");
        vi.mocked(axios.get).mockResolvedValue({ data: { tracks: { items: [raw, null] } } });
        const [first, second] = await Promise.all([service.searchDemoSpotify("Daft Punk"), service.searchDemoSpotify("daft punk")]);
        expect(first).toEqual(second);
        expect(first[0]).toMatchObject({ id: track.id, name: track.name, albumImage: track.albumImage, uri: track.uri });
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith("https://api.spotify.com/v1/search", expect.objectContaining({ params: { q: "Daft Punk", type: "track", limit: 8 }, timeout: 8000 }));
        expect(await service.getDemoSpotifyTrack(track.id)).toEqual(first[0]);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it("validates identifiers before any request and fetches uncached track metadata", async () => {
        const service = await import("../src/demo/demo.spotify");
        expect(() => service.getDemoSpotifyTrack("../../users")).toThrow("valid Spotify track");
        expect(axios.get).not.toHaveBeenCalled();
        vi.mocked(axios.get).mockResolvedValueOnce({ data: raw });
        expect((await service.getDemoSpotifyTrack(track.id)).name).toBe(track.name);
        expect(axios.get).toHaveBeenCalledWith(`https://api.spotify.com/v1/tracks/${track.id}`, expect.anything());
    });

    it("honors Spotify Retry-After without immediately calling the provider again", async () => {
        const service = await import("../src/demo/demo.spotify");
        vi.mocked(axios.get).mockRejectedValueOnce({ isAxiosError: true, response: { status: 429, headers: { "retry-after": "45" } } });
        await expect(service.searchDemoSpotify("first")).rejects.toMatchObject({ status: 429, retryAfter: 45 });
        await expect(service.searchDemoSpotify("second")).rejects.toMatchObject({ status: 429 });
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it("does not cache provider failures or expose credential-bearing errors", async () => {
        const service = await import("../src/demo/demo.spotify");
        vi.mocked(axios.get).mockRejectedValueOnce(new Error("Authorization: secret-token"));
        await expect(service.searchDemoSpotify("retry")).rejects.toMatchObject({ status: 503, message: "Spotify is temporarily unavailable. Please try again shortly." });
        vi.mocked(axios.get).mockResolvedValueOnce({ data: { tracks: { items: [] } } });
        expect(await service.searchDemoSpotify("retry")).toEqual([]);
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it("caps total demo upstream calls even across different sessions and queries", async () => {
        const service = await import("../src/demo/demo.spotify");
        vi.mocked(axios.get).mockResolvedValue({ data: { tracks: { items: [] } } });
        for (let i = 0; i < 30; i++) await service.searchDemoSpotify(`query ${i}`);
        await expect(service.searchDemoSpotify("over budget")).rejects.toMatchObject({ status: 429 });
        expect(axios.get).toHaveBeenCalledTimes(30);
    });
});

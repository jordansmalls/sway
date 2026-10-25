import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

vi.mock("axios", async (importOriginal) => {
    const original = await importOriginal<typeof import("axios")>();
    return {
        ...original,
        default: Object.assign(vi.fn(), { isAxiosError: original.default.isAxiosError }),
    };
});

const secret = "secret-spotify-credential";
const upstreamError = Object.assign(new Error(secret), {
    isAxiosError: true,
    code: "ERR_BAD_RESPONSE",
    response: { status: 502, data: { secret } },
    config: { headers: { Authorization: `Bearer ${secret}` }, params: { secret } },
});

beforeEach(() => {
    vi.resetModules();
    vi.mocked(axios).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("Spotify error logging", () => {
    it("logs only endpoint, status and code for token failures", async () => {
        vi.mocked(axios).mockRejectedValueOnce(upstreamError);
        const { getAccessToken } = await import("../src/controllers/spotify.controller");
        await expect(getAccessToken()).rejects.toBe(upstreamError);
        expect(console.error).toHaveBeenCalledExactlyOnceWith("Spotify request failed:", {
            endpoint: "/api/token", status: 502, code: "ERR_BAD_RESPONSE",
        });
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(secret);
    });

    it.each([
        ["searchTracks", "/v1/search"],
        ["fetchTrackDetails", "/v1/tracks/:id"],
        ["fetchArtistTopTracks", "/v1/artists/:id/top-tracks"],
    ] as const)("keeps credentials out of %s logs and responses", async (handler, endpoint) => {
        vi.mocked(axios)
            .mockResolvedValueOnce({ data: { access_token: secret, expires_in: 3600 } })
            .mockRejectedValueOnce(upstreamError);
        const controllers = await import("../src/controllers/spotify.controller");
        const response = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
        await controllers[handler]({ query: { q: "test" }, params: { id: "track-id" } }, response);
        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.json).toHaveBeenCalledWith({
            success: false,
            error: "Internal Server Error",
            message: "We're having trouble, please try again.",
        });
        expect(console.error).toHaveBeenCalledExactlyOnceWith("Spotify request failed:", {
            endpoint, status: 502, code: "ERR_BAD_RESPONSE",
        });
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(secret);
        expect(JSON.stringify(response.json.mock.calls)).not.toContain(secret);
    });

    it("omits details from unexpected errors", async () => {
        vi.mocked(axios).mockRejectedValueOnce(new Error(secret));
        const { getAccessToken } = await import("../src/controllers/spotify.controller");
        await expect(getAccessToken()).rejects.toThrow(secret);
        expect(console.error).toHaveBeenCalledExactlyOnceWith("Spotify request failed:", {
            endpoint: "/api/token", status: undefined, code: undefined,
        });
    });
});

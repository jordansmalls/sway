import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

vi.mock("axios", async (importOriginal) => {
    const original = await importOriginal<typeof import("axios")>();
    return {
        ...original,
        default: Object.assign(vi.fn(), { get: vi.fn(), isAxiosError: original.default.isAxiosError }),
    };
});

vi.unmock("../src/services/spotify-client.ts");

const secret = "secret-spotify-credential";
const upstreamError = Object.assign(new Error(secret), {
    isAxiosError: true,
    code: "ERR_BAD_RESPONSE",
    response: { status: 502, data: { secret } },
    config: { headers: { Authorization: `Bearer ${secret}` }, params: { secret } },
});

// Modules are reset per test, so spy on the logger instance the freshly imported controllers will use.
let logger: typeof import("../src/config/logger").logger;
beforeEach(async () => {
    vi.resetModules();
    vi.mocked(axios).mockReset();
    vi.mocked(axios.get).mockReset();
    ({ logger } = await import("../src/config/logger"));
    vi.spyOn(logger, "error");
});

afterEach(() => vi.restoreAllMocks());

describe("Spotify error logging", () => {
    it("logs only endpoint, status and code for token failures", async () => {
        vi.mocked(axios).mockRejectedValueOnce(upstreamError);
        const { getAccessToken } = await import("../src/controllers/spotify.controller");
        await expect(getAccessToken()).rejects.toBe(upstreamError);
        expect(logger.error).toHaveBeenCalledExactlyOnceWith({
            endpoint: "/api/token", status: 502, code: "ERR_BAD_RESPONSE",
        }, "Spotify request failed");
        expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(secret);
    });

    it.each([
        ["searchTracks", "/v1/search"],
        ["fetchTrackDetails", "/v1/tracks/:id"],
        ["fetchArtistTopTracks", "/v1/artists/:id/top-tracks"],
    ] as const)("keeps credentials out of %s logs and responses", async (handler, endpoint) => {
        vi.mocked(axios).mockResolvedValueOnce({ data: { access_token: secret, expires_in: 3600 } });
        vi.mocked(axios.get).mockRejectedValueOnce(upstreamError);
        const controllers = await import("../src/controllers/spotify.controller");
        const response = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
        await controllers[handler]({ query: { q: "test" }, params: { id: "track-id" }, log: logger } as any, response as any);
        expect(response.status).toHaveBeenCalledWith(503);
        expect(response.json).toHaveBeenCalledWith({
            success: false,
            error: "Service Unavailable",
            message: "Spotify is temporarily unavailable. Please try again shortly.",
        });
        expect(logger.error).toHaveBeenCalledExactlyOnceWith({
            endpoint, status: 502, code: "ERR_BAD_RESPONSE",
        }, "Spotify request failed");
        expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(secret);
        expect(JSON.stringify(response.json.mock.calls)).not.toContain(secret);
    });

    it.each([503, 429])("returns a clean %s when the token endpoint fails", async (status) => {
        const error = status === 429
            ? { isAxiosError: true, response: { status: 429, headers: { "retry-after": "45" } } }
            : { isAxiosError: true, code: "ECONNABORTED" };
        vi.mocked(axios).mockRejectedValueOnce(error);
        const controllers = await import("../src/controllers/spotify.controller");
        const response = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis() };
        await controllers.searchTracks({ query: { q: "token failure" }, log: logger } as any, response as any);
        expect(response.status).toHaveBeenCalledWith(status);
        expect(axios).toHaveBeenCalledWith(expect.objectContaining({ url: "https://accounts.spotify.com/api/token", timeout: 8000 }));
        expect(axios.get).not.toHaveBeenCalled();
        if (status === 429) expect(response.set).toHaveBeenCalledWith("Retry-After", "45");
    });

    it("omits details from unexpected errors", async () => {
        vi.mocked(axios).mockRejectedValueOnce(new Error(secret));
        const { getAccessToken } = await import("../src/controllers/spotify.controller");
        await expect(getAccessToken()).rejects.toThrow(secret);
        expect(logger.error).toHaveBeenCalledExactlyOnceWith({
            endpoint: "/api/token", status: undefined, code: undefined,
        }, "Spotify request failed");
    });
});

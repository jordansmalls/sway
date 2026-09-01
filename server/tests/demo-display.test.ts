import { beforeEach, describe, expect, it, vi } from "vitest";
const { toDataURL } = vi.hoisted(() => ({ toDataURL: vi.fn<(text: string, options: unknown) => Promise<string>>() }));

vi.mock("qrcode", () => ({ default: { toDataURL } }));
vi.mock("../src/config/config", () => ({ default: { frontend_url: "https://sway.example", node_env: "test" } }));

beforeEach(() => { vi.resetModules(); toDataURL.mockReset(); });

describe("Demo display QR", () => {
    it("links to a new guest demo without exposing private room IDs or tokens, and caches the image", async () => {
        const { demoDisplayQr } = await import("../src/demo/demo.display");
        toDataURL.mockResolvedValue("data:image/png;base64,test");
        expect(await demoDisplayQr()).toBe("data:image/png;base64,test");
        await demoDisplayQr();
        expect(toDataURL).toHaveBeenCalledExactlyOnceWith("https://sway.example/demo/guest", { width: 640, margin: 2, errorCorrectionLevel: "M" });
    });

    it("allows retry after an image generation failure", async () => {
        const { demoDisplayQr } = await import("../src/demo/demo.display");
        toDataURL.mockRejectedValueOnce(new Error("Image unavailable"));
        await expect(demoDisplayQr()).rejects.toThrow("Image unavailable");
        toDataURL.mockResolvedValueOnce("image");
        expect(await demoDisplayQr()).toBe("image");
    });
});

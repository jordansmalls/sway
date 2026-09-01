import type { Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

import config from "../src/config/config";
import { clearAuthToken, getAuthCookieOptions } from "../src/utils/generate.jwt";

const originalNodeEnv = config.node_env;
const originalCookieDomain = config.cookie_domain;

afterEach(() => {
    config.node_env = originalNodeEnv;
    config.cookie_domain = originalCookieDomain;
});

describe("JWT cookie configuration", () => {
    it("uses a host-only, non-secure cookie in development", () => {
        config.node_env = "development";
        config.cookie_domain = undefined;

        expect(getAuthCookieOptions()).toEqual({
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
        });
    });

    it("uses the shared Sway domain and secure transport in production", () => {
        config.node_env = "production";
        config.cookie_domain = ".sway.onl";

        expect(getAuthCookieOptions()).toEqual({
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            domain: ".sway.onl",
        });
    });

    it("clears the JWT with the same options used to create it", () => {
        config.node_env = "production";
        config.cookie_domain = ".sway.onl";
        const clearCookie = vi.fn();

        clearAuthToken({ clearCookie } as unknown as Response);

        expect(clearCookie).toHaveBeenCalledWith("jwt", getAuthCookieOptions());
    });
});

import type { Response } from "supertest";

// Every Set-Cookie header on a response; throws if there are none.
export const setCookies = (response: Response): string[] => {
    const cookies = response.get("Set-Cookie");
    if (!cookies?.length) throw new Error("Response did not set any cookies.");
    return cookies;
};

// The "jwt=<token>" pair to send back in a Cookie header; throws if the response did not set one.
export const authCookie = (response: Response): string => {
    const cookie = setCookies(response).find((value) => value.startsWith("jwt="));
    if (!cookie) throw new Error("Response did not set a jwt cookie.");
    return cookie.split(";")[0]!;
};

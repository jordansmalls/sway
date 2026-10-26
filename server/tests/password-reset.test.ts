import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import config from "../src/config/config";
import { logger } from "../src/config/logger";
import User from "../src/models/user.model";
import * as service from "../src/services/password-reset";
import * as emailService from "../src/services/email";
import { digestEmailToken } from "../src/services/email-token";
import {
    INVALID_RESET_MESSAGE,
    PASSWORD_RESET_REQUEST_MESSAGE,
} from "../src/controllers/password-reset.controller";

let server: Server;
const resend = vi.fn<typeof fetch>();
const originalConfig = { ...config };
const requestReset = vi.spyOn(service, "requestPasswordReset");
const notifyReset = vi.spyOn(emailService, "sendPasswordChangedEmail");
const success = () => new Response(JSON.stringify({ id: "mock-resend-email" }), { status: 200 });
type SentEmail = { from: string; to: string[]; subject: string; text: string; html: string };
const sent = (): SentEmail[] =>
    resend.mock.calls.map(([, options]) => JSON.parse(String(options?.body)));
const tokenFromEmail = (index = 0) => {
    const link = sent()[index]!.text.match(/https?:\/\/\S+/)?.[0];
    if (!link) throw new Error("No reset link in the email.");
    const url = new URL(link);
    return { url, token: new URLSearchParams(url.hash.slice(1)).get("token")! };
};
// Controllers acknowledge requests before delivery. Wait for their side effects before inspecting or clearing MongoDB.
const settleEmail = async () => {
    await Promise.allSettled(requestReset.mock.results.map((result) => result.value));
    await Promise.allSettled(notifyReset.mock.results.map((result) => result.value));
};
const forgot = async (email: unknown = "dj@example.com") => {
    const response = await request(server).post("/api/auth/forgot-password").send({ email });
    await settleEmail();
    return response;
};
const reset = (token: unknown, newPassword: unknown = "newpassword456") =>
    request(server).post("/api/auth/reset-password").send({ token, newPassword });
const createDj = (email = "dj@example.com") => User.create({ email, password: "password123" });
const cookieFor = (id: string, version: number | undefined = 0) =>
    `jwt=${jwt.sign(
        {
            userId: id,
            ...(version === undefined ? {} : { sessionVersion: version }),
            jti: randomUUID(),
        },
        config.jwt_secret!,
    )}`;
const ageToken = (id: unknown) =>
    User.updateOne(
        { _id: id },
        {
            $set: {
                "emailTokens.0.createdAt": new Date(
                    Date.now() - service.PASSWORD_RESET_COOLDOWN_MS - 1000,
                ),
            },
        },
    );

beforeAll(async () => {
    server = await new Promise<Server>((resolve) => {
        const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    await User.init();
});

afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
    config.resend_api_key = "mock-resend-key";
    config.email_from = "Sway <no-reply@sway.onl>";
    config.frontend_url = "https://app.sway.onl";
    resend.mockReset().mockImplementation(async () => success());
    requestReset.mockClear();
    notifyReset.mockClear();
    vi.stubGlobal("fetch", resend);
});

afterEach(async () => {
    await settleEmail();
    config.resend_api_key = originalConfig.resend_api_key;
    config.email_from = originalConfig.email_from;
    config.frontend_url = originalConfig.frontend_url;
    vi.unstubAllGlobals();
});

describe("Requesting a password reset", () => {
    it("sends through Resend to the normalized account email and stores only a scoped, expiring digest", async () => {
        const dj = await createDj();
        const response = await forgot("  DJ@EXAMPLE.COM  ");
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true, message: PASSWORD_RESET_REQUEST_MESSAGE });
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(response.headers["set-cookie"]).toBeUndefined();
        expect(resend).toHaveBeenCalledTimes(1);
        const [endpoint, options] = resend.mock.calls[0]!;
        expect(endpoint).toBe("https://api.resend.com/emails");
        expect(options).toMatchObject({
            method: "POST",
            headers: {
                Authorization: "Bearer mock-resend-key",
                "Content-Type": "application/json",
            },
        });
        expect(options?.signal).toBeInstanceOf(AbortSignal);
        expect(sent()[0]).toMatchObject({
            from: config.email_from,
            to: [dj.email],
            subject: "Reset your Sway password",
        });
        const { url, token } = tokenFromEmail();
        expect(url.origin).toBe(config.frontend_url);
        expect(url.pathname).toBe("/reset-password");
        expect(url.search).toBe("");
        expect(token).toMatch(/^[a-f0-9]{64}$/);
        expect(sent()[0]!.html).toContain(url.toString());
        const stored = await User.findById(dj._id).select("+emailTokens").lean();
        expect(stored!.emailTokens).toHaveLength(1);
        const record = stored!.emailTokens[0]!;
        expect(record).toMatchObject({
            purpose: "password-reset",
            email: dj.email,
            sessionVersion: 0,
            digest: digestEmailToken("password-reset", token),
        });
        expect(record.expiresAt.getTime() - record.createdAt.getTime()).toBe(
            service.PASSWORD_RESET_LIFETIME_MS,
        );
        expect(JSON.stringify(stored)).not.toContain(token);
        expect((await User.findById(dj._id).lean())!.emailTokens).toBeUndefined();
        expect(stored!.password).toBe(dj.password);
        expect(stored!.sessionVersion).toBe(0);
    });

    it("uses the same public response for active, unknown, and disabled accounts", async () => {
        await createDj();
        await User.create({
            email: "disabled@example.com",
            password: "password123",
            active: false,
        });
        const active = await forgot();
        const unknown = await forgot("missing@example.com");
        const disabled = await forgot("disabled@example.com");
        expect([active.status, unknown.status, disabled.status]).toEqual([200, 200, 200]);
        expect(unknown.body).toEqual(active.body);
        expect(disabled.body).toEqual(active.body);
        expect(resend).toHaveBeenCalledTimes(1);
    });

    it("acknowledges a request without waiting for provider delivery", async () => {
        await createDj();
        let finish!: (response: Response) => void;
        resend.mockImplementationOnce(
            () =>
                new Promise<Response>((resolve) => {
                    finish = resolve;
                }),
        );
        try {
            await request(server)
                .post("/api/auth/forgot-password")
                .send({ email: "dj@example.com" })
                .timeout(1000)
                .expect(200);
            await vi.waitFor(() => expect(resend).toHaveBeenCalledTimes(1));
        } finally {
            finish?.(success());
            await settleEmail();
        }
    });

    it.each([
        undefined,
        null,
        "",
        "invalid-email",
        ["dj@example.com"],
        { $ne: null },
        `${"a".repeat(250)}@example.com`,
    ])("rejects malformed email input %j", async (email) => {
        const response = await forgot(email === undefined ? null : email);
        expect(response.status).toBe(400);
        expect(resend).not.toHaveBeenCalled();
    });

    it("limits concurrent sends with a database cooldown while keeping existing sessions usable", async () => {
        const dj = await createDj();
        const cookie = cookieFor(String(dj._id));
        const responses = await Promise.all(
            Array.from({ length: 5 }, () =>
                request(server).post("/api/auth/forgot-password").send({ email: dj.email }),
            ),
        );
        await settleEmail();
        expect(responses.every((response) => response.status === 200)).toBe(true);
        expect(resend).toHaveBeenCalledTimes(1);
        await request(server).get("/api/users/me").set("Cookie", cookie).expect(200);
        expect((await User.findById(dj._id).select("+emailTokens"))!.emailTokens).toHaveLength(1);
    });

    it("invalidates an older link after Resend accepts its replacement", async () => {
        const dj = await createDj();
        await forgot();
        const first = tokenFromEmail().token;
        await ageToken(dj._id);
        await forgot();
        const second = tokenFromEmail(1).token;
        expect(second).not.toBe(first);
        expect((await User.findById(dj._id).select("+emailTokens"))!.emailTokens).toHaveLength(1);
        expect((await reset(first)).body.message).toBe(INVALID_RESET_MESSAGE);
        await reset(second).expect(200);
    });

    it.each([403, 429, 503])(
        "keeps the previous link usable when a replacement email fails with %i",
        async (status) => {
            const dj = await createDj();
            await forgot();
            const first = tokenFromEmail().token;
            await ageToken(dj._id);
            resend.mockResolvedValueOnce(
                new Response(JSON.stringify({ message: "provider detail" }), { status }),
            );
            const response = await forgot();
            expect(response.body.message).toBe(PASSWORD_RESET_REQUEST_MESSAGE);
            expect((await User.findById(dj._id).select("+emailTokens"))!.emailTokens).toHaveLength(
                1,
            );
            await reset(tokenFromEmail(1).token).expect(400);
            await reset(first).expect(200);
        },
    );

    it.each([
        new Error("sensitive provider payload"),
        new DOMException("request timed out", "TimeoutError"),
    ])("cleans up a failed delivery and permits a retry", async (error) => {
        const dj = await createDj();
        resend.mockRejectedValueOnce(error);
        expect((await forgot()).status).toBe(200);
        expect((await User.findById(dj._id).select("+emailTokens"))!.emailTokens).toHaveLength(0);
        expect((await forgot()).status).toBe(200);
        expect(resend).toHaveBeenCalledTimes(2);
        await reset(tokenFromEmail(1).token).expect(200);
    });

    it("leaves recovery disabled without preventing normal login when Resend is not configured", async () => {
        const dj = await createDj();
        config.resend_api_key = undefined;
        expect((await forgot()).body.message).toBe(PASSWORD_RESET_REQUEST_MESSAGE);
        expect(resend).not.toHaveBeenCalled();
        expect((await User.findById(dj._id).select("+emailTokens"))!.emailTokens).toHaveLength(0);
        await request(server)
            .post("/api/auth/login")
            .send({ identifier: dj.email, password: "password123" })
            .expect(200);
    });

    it("builds links from FRONTEND_URL rather than request headers", async () => {
        await createDj();
        await request(server)
            .post("/api/auth/forgot-password")
            .set("Host", "attacker.example")
            .set("Origin", "https://attacker.example")
            .send({ email: "dj@example.com" })
            .expect(200);
        await settleEmail();
        expect(tokenFromEmail().url.origin).toBe("https://app.sway.onl");
    });

    it("rejects unsafe configured email-link origins and removes the unsent token", async () => {
        const dj = await createDj();
        config.frontend_url = "https://app.sway.onl@attacker.example/path";
        await forgot();
        expect(resend).not.toHaveBeenCalled();
        expect((await User.findById(dj._id).select("+emailTokens"))!.emailTokens).toHaveLength(0);
    });

    it("never propagates provider payloads into logs or responses", async () => {
        await createDj();
        const log = vi.spyOn(logger, "error").mockImplementation(() => {});
        const secret = "private-provider-payload-token-and-api-key";
        try {
            resend.mockRejectedValueOnce(new Error(secret));
            const response = await forgot();
            expect(log).toHaveBeenCalledWith(
                expect.objectContaining({ code: "unavailable" }),
                expect.any(String),
            );
            expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
            expect(response.text).not.toContain(secret);
        } finally {
            log.mockRestore();
        }
    });
});

describe("Using a password reset link", () => {
    it("hashes the new password, consumes the token, revokes all old sessions, and sends a notification", async () => {
        const dj = await createDj();
        const cookies = [cookieFor(String(dj._id)), cookieFor(String(dj._id))];
        await forgot();
        const { token } = tokenFromEmail();
        const response = await reset(token).expect(200);
        await settleEmail();
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(String(response.headers["set-cookie"])).toContain("jwt=;");
        expect(response.body).not.toHaveProperty("user");
        const updated = (await User.findById(dj._id).select("+emailTokens"))!;
        expect(updated.password).not.toBe("newpassword456");
        expect(await updated.comparePassword("newpassword456")).toBe(true);
        expect(updated.emailTokens).toHaveLength(0);
        expect(updated.sessionVersion).toBe(1);
        for (const cookie of cookies)
            await request(server).get("/api/users/me").set("Cookie", cookie).expect(401);
        await request(server)
            .post("/api/auth/login")
            .send({ identifier: dj.email, password: "password123" })
            .expect(401);
        const login = await request(server)
            .post("/api/auth/login")
            .send({ identifier: dj.email, password: "newpassword456" })
            .expect(200);
        await request(server)
            .get("/api/users/me")
            .set("Cookie", login.headers["set-cookie"]![0]!)
            .expect(200);
        await reset(token, "anotherpassword789").expect(400);
        expect(sent()).toHaveLength(2);
        expect(sent()[1]).toMatchObject({
            to: [dj.email],
            subject: "Your Sway password was changed",
        });
        expect(sent()[1]!.text).not.toContain("newpassword456");
        expect(sent()[1]!.text).not.toContain(token);
    });

    it("allows exactly one of two overlapping resets to consume a link", async () => {
        const dj = await createDj();
        await forgot();
        const { token } = tokenFromEmail();
        const passwords = ["firstpassword123", "secondpassword456"];
        const responses = await Promise.all(passwords.map((password) => reset(token, password)));
        await settleEmail();
        expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
        const updated = (await User.findById(dj._id))!;
        expect(updated.sessionVersion).toBe(1);
        expect(
            await updated.comparePassword(
                passwords[responses.findIndex((response) => response.status === 200)]!,
            ),
        ).toBe(true);
        expect(
            sent().filter((email) => email.subject === "Your Sway password was changed"),
        ).toHaveLength(1);
    });

    it("checks expiry before consumption without waiting for cleanup", async () => {
        const dj = await createDj();
        await forgot();
        const { token } = tokenFromEmail();
        await User.updateOne(
            { _id: dj._id },
            { $set: { "emailTokens.0.expiresAt": new Date(Date.now() - 1000) } },
        );
        const response = await reset(token).expect(400);
        expect(response.body.message).toBe(INVALID_RESET_MESSAGE);
        expect((await User.findById(dj._id))!.password).toBe(dj.password);
    });

    it.each([
        undefined,
        null,
        "",
        "bad",
        "g".repeat(64),
        "a".repeat(256),
        { $ne: null },
        ["a".repeat(64)],
    ])("rejects malformed tokens %j", async (token) => {
        const response = await reset(token).expect(400);
        expect(response.body.message).toBe(INVALID_RESET_MESSAGE);
    });

    it("rejects a well-formed unknown token with the same message as an expired token", async () => {
        expect((await reset("a".repeat(64)).expect(400)).body.message).toBe(INVALID_RESET_MESSAGE);
    });

    it("leaves the token usable after a password validation failure", async () => {
        await createDj();
        await forgot();
        const { token } = tokenFromEmail();
        for (const password of [undefined, null, "", "1234567", { $ne: null }, ["password123"]]) {
            const response = await reset(token, password === undefined ? null : password).expect(
                400,
            );
            expect(response.body.message).toBe("Password must be at least 8 characters.");
        }
        await reset(token).expect(200);
    });

    it.each(["email", "password", "active"])(
        "revokes outstanding links when %s changes through save hooks",
        async (field) => {
            const dj = await createDj();
            await forgot();
            const { token } = tokenFromEmail();
            if (field === "email") dj.email = "new@example.com";
            if (field === "password") dj.password = "changedpassword123";
            if (field === "active") dj.active = false;
            await dj.save();
            expect((await User.findById(dj._id).select("+emailTokens"))!.emailTokens).toHaveLength(
                0,
            );
            await reset(token).expect(400);
        },
    );

    it.each([
        { email: "other@example.com" },
        { sessionVersion: 1 },
        { active: false },
        { "emailTokens.0.purpose": "email-verification" },
    ])("rejects a token whose account or purpose changed: %j", async (changes) => {
        const dj = await createDj();
        await forgot();
        const { token } = tokenFromEmail();
        await User.updateOne({ _id: dj._id }, { $set: changes });
        await reset(token).expect(400);
        expect((await User.findById(dj._id))!.password).toBe(dj.password);
    });

    it("resets legacy accounts with no stored sessionVersion and revokes their unversioned cookies", async () => {
        const dj = await createDj();
        await User.collection.updateOne({ _id: dj._id }, { $unset: { sessionVersion: "" } });
        const legacy = `jwt=${jwt.sign({ userId: String(dj._id) }, config.jwt_secret!)}`;
        await forgot();
        await reset(tokenFromEmail().token).expect(200);
        expect((await User.findById(dj._id))!.sessionVersion).toBe(1);
        await request(server).get("/api/users/me").set("Cookie", legacy).expect(401);
    });

    it("keeps a reset successful when the notification email fails", async () => {
        const dj = await createDj();
        await forgot();
        resend.mockResolvedValueOnce(new Response("provider unavailable", { status: 503 }));
        await reset(tokenFromEmail().token).expect(200);
        await settleEmail();
        expect(await (await User.findById(dj._id))!.comparePassword("newpassword456")).toBe(true);
    });

    it("preserves the token when the credential write fails", async () => {
        await createDj();
        await forgot();
        const { token } = tokenFromEmail();
        const update = vi
            .spyOn(User, "updateOne")
            .mockRejectedValueOnce(new Error("database unavailable"));
        try {
            await reset(token).expect(500);
        } finally {
            update.mockRestore();
        }
        await reset(token).expect(200);
    });
});

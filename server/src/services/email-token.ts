import { createHash, randomBytes } from "node:crypto";

// Add a purpose here when its corresponding email flow is implemented.
export type EmailTokenPurpose = "password-reset";

export const isEmailToken = (value: unknown): value is string =>
    typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export const digestEmailToken = (purpose: EmailTokenPurpose, token: string) =>
    createHash("sha256").update(`${purpose}:${token}`).digest("hex");

export function createEmailToken(
    purpose: EmailTokenPurpose,
    email: string,
    sessionVersion: number,
    lifetimeMs: number,
) {
    const token = randomBytes(32).toString("hex");
    const createdAt = new Date();
    return {
        token,
        record: {
            purpose,
            digest: digestEmailToken(purpose, token),
            email,
            sessionVersion,
            createdAt,
            expiresAt: new Date(createdAt.getTime() + lifetimeMs),
        },
    };
}

export const emailTokenMatch = (purpose: EmailTokenPurpose, token: string) => ({
    purpose,
    digest: digestEmailToken(purpose, token),
    expiresAt: { $gt: new Date() },
});

// Old accounts may not have a stored version yet. Mongoose hydrates those as zero.
export const sessionVersionMatch = (version: number) =>
    version === 0
        ? { $or: [{ sessionVersion: 0 }, { sessionVersion: { $exists: false } }] }
        : { sessionVersion: version };

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { createHash } from "node:crypto";

const tooMany = (message: string) => ({ success: false, error: "Too Many Requests", message });

/**
 * Strict limit on login and signup, keyed on IP plus the account the route actually uses,
 * so guessing one account's password from one network is slow without locking out others.
 * Each route keys on its own field: extra body fields the controller ignores can't change the key.
 * 10 attempts per 15 minutes
 */
export const CREDENTIAL_LIMIT = 10;

const credentialLimiter = (field: "email" | "identifier") => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: CREDENTIAL_LIMIT,
    keyGenerator: (req: Request) => {
        const account = req.body?.[field];
        const normalized = typeof account === "string" ? account.trim().toLowerCase() : "";
        return `${ipKeyGenerator(req.ip ?? "")}:${normalized}`;
    },
    message: tooMany("Too many attempts for this account, please try again in 15 minutes."),
    standardHeaders: true,
    legacyHeaders: false,
});

export const signupLimiter = credentialLimiter("email");
export const loginLimiter = credentialLimiter("identifier");

/**
 * Per-IP ceiling across all accounts, so rotating emails can't bypass the credential limit.
 * 50 attempts per 15 minutes
 */
export const CREDENTIAL_IP_LIMIT = 50;

export const credentialIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: CREDENTIAL_IP_LIMIT,
    message: tooMany("Too many attempts from this network, please try again in 15 minutes."),
    standardHeaders: true,
    legacyHeaders: false,
});

export const PASSWORD_RESET_REQUEST_LIMIT = 3;
export const PASSWORD_RESET_IP_LIMIT = 20;

export const passwordResetRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: PASSWORD_RESET_REQUEST_LIMIT,
    keyGenerator: (req: Request) => {
        const email = req.body?.email;
        const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
        return createHash("sha256").update(normalized).digest("hex");
    },
    message: tooMany("Too many reset requests for this email. Please try again in 15 minutes."),
    standardHeaders: true,
    legacyHeaders: false,
});

const resetIpLimiter = () => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: PASSWORD_RESET_IP_LIMIT,
    message: tooMany("Too many password reset attempts from this network. Please try again in 15 minutes."),
    standardHeaders: true,
    legacyHeaders: false,
});

// Separate budgets so requesting links cannot exhaust the budget for using a delivered link.
export const passwordResetIpLimiter = resetIpLimiter();
export const passwordResetAttemptLimiter = resetIpLimiter();

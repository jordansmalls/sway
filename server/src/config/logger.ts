import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import pino from "pino";
import { pinoHttp } from "pino-http";
import config from "./config";

/**
 * JSON logs on stdout for Railway. Silent in tests unless LOG_LEVEL is set.
 * Written through process.stdout so tests can capture lines.
 */
export const logger = pino(
    {
        level: process.env.LOG_LEVEL ?? (config.node_env === "test" ? "silent" : "info"),
        base: { service: "sway-api" },
        // Session cookies and tokens must never reach the logs.
        redact: {
            paths: [
                "req.headers.cookie",
                "req.headers.authorization",
                'res.headers["set-cookie"]',
                "headers.cookie",
                "headers.authorization",
            ],
            censor: "[Redacted]",
        },
    },
    process.stdout,
);

const REQUEST_ID = /^[\w.-]{1,128}$/;
const MUTATIONS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type LoggedRequest = IncomingMessage & {
    user?: { _id: unknown };
    params?: Record<string, unknown>;
    body?: Record<string, unknown>;
};
type LoggedResponse = ServerResponse & { locals?: Record<string, unknown> };

/** roomId and userId on mutation paths, so "what happened in room X at 22:14?" is one query. */
export const mutationContext = (req: LoggedRequest, res: LoggedResponse) => {
    // Called at request start and on finish; protect and the controllers have only run by finish.
    if (!res.headersSent || !MUTATIONS.has(req.method ?? "")) return {};
    const roomId = res.locals?.roomId ?? req.params?.roomId ?? req.body?.roomId;
    const userId = req.user?._id;
    return {
        ...(userId ? { userId: String(userId) } : {}),
        // Body values are guest input: strings only, capped.
        ...(typeof roomId === "string" && roomId ? { roomId: roomId.slice(0, 64) } : {}),
    };
};

export const httpLogger = pinoHttp({
    logger,
    // Reuse a well-formed upstream ID (Railway's proxy, or a client retry); otherwise mint one.
    genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id = typeof incoming === "string" && REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
    },
    customLogLevel: (req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
    customProps: mutationContext,
    serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url, headers: req.headers, remoteAddress: req.remoteAddress }),
    },
});

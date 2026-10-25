import { STATUS_CODES } from "node:http";
import type { ErrorRequestHandler } from "express";

/**
 * Keep client error statuses and return the controllers' JSON error shape.
 * Unexpected errors return a generic 500 response without internal details.
 */

const isClientError = (status: unknown): status is number =>
    typeof status === "number" && Number.isInteger(status) && status >= 400 && status < 500;

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err?.name === "CastError" && err.kind === "ObjectId") {
        return res.status(404).json({
            success: false,
            error: "Resource not found",
            message: "Resource not found.",
        });
    }

    if (err?.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            error: "Bad Request - malformed JSON",
            message: "The request body is not valid JSON.",
        });
    }

    const status = err?.status ?? err?.statusCode;
    if (isClientError(status)) {
        // http-errors marks 4xx messages as safe to show; anything else gets a generic message.
        return res.status(status).json({
            success: false,
            error: STATUS_CODES[status] ?? "Client Error",
            message: err.expose && err.message ? err.message : "The request could not be processed.",
        });
    }

    console.error("Unhandled error:", err);
    return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "We're having trouble, please try again.",
    });
};

export { errorHandler };

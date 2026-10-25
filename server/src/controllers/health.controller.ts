import mongoose from "mongoose";
import type { Request, Response } from "express";
import User from "../models/user.model.js";
import config from "../config/config.js";
import formatUptime from "../utils/formatters/format.uptime.js";

/**
 * @desc    Fetch Root route
 * @route   GET /
 * @access  PUBLIC
 */

export const fetchRootRoute = (req, res) => {
    return res.status(200).json({
        success: true,
        message: "What are you doing here? This is Sway's API!",
        home: "https://www.sway.onl",
        service: "sway - a DJ's best friend",
        version: "1.0.2",
        development: "https://www.jsmalls.net",
        timestamp: new Date().toISOString(),
    });
};

let shuttingDown = false;

/** Readiness fails once shutdown starts, so the platform stops routing new traffic here. */
export const setShuttingDown = (value: boolean) => {
    shuttingDown = value;
};

/**
 * @desc    Readiness check for the platform healthcheck
 * @route   GET /health/ready
 * @access  PUBLIC
 */

export const fetchReadiness = (req: Request, res: Response) => {
    const database = mongoose.connection.readyState === 1;
    const ready = database && !shuttingDown;

    return res.status(ready ? 200 : 503).json({
        success: ready,
        status: ready ? "ready" : "unavailable",
        database: database ? "connected" : "disconnected",
        shuttingDown,
    });
};

/**
 * @desc    Fetch server health
 * @route   GET /server/health/admin
 * @access  PRIVATE
 */

export const fetchServerHealth = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "Unauthorized.",
        });
    }

    try {
        const user = await User.findById(req.user._id);

        if (!user || !user.admin) {
            return res.status(403).json({
                success: false,
                error: "Forbidden - Not authorized",
                message: "FORBIDDEN: Not Authorized.",
            });
        }

        const formattedUptime = formatUptime(process.uptime());

        return res.status(200).json({
            status: "OK",
            success: true,
            message: `Services are currently up and running.`,
            service: "sway - a DJ's best friend",
            version: "1.0.2",
            development: "https://www.jsmalls.net",
            documentation: "https://www.github.com/jordansmalls/sway",
            timestamp: new Date().toISOString(),
            environment: `${config.node_env}`,
            uptime_raw_seconds: process.uptime(),
            uptime_formatted: formattedUptime,
            memory: process.memoryUsage(),
            process_version: process.version,
        });
    } catch (err) {
        console.error("There was an error fetching server health:", err);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            message: "INTERNAL SERVER ERROR",
        });
    }
};

/**
 * @desc    404 Route Not Found
 * @route   ANY /*
 * @access  PUBLIC
 */

export const notFound = (req, res) => {
    console.error(`404 ERROR: CANNOT ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()}`);
    return res.status(404).json({
        success: false,
        error: "4O4 ROUTE NOT FOUND",
        message: `CANNOT ${req.method.toUpperCase()} ${req.originalUrl.toUpperCase()}`,
    });
};

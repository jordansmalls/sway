import jwt from "jsonwebtoken";
import type { CookieOptions, Response } from "express";
import config from "../config/config.js";

const JWT_COOKIE_AGE = 30 * 24 * 60 * 60 * 1000;

export const getAuthCookieOptions = (): CookieOptions => ({
    httpOnly: true,
    secure: config.node_env === "production",
    sameSite: "lax",
    path: "/",
    ...(config.cookie_domain ? { domain: config.cookie_domain } : {}),
});

export const clearAuthToken = (res: Response) => {
    res.clearCookie("jwt", getAuthCookieOptions());
};

/**
 * @description generates a JWT, signs it, and sets it as an HTTP only cookie in the response. this is the standard method for establishing a secure, persistent user session.
 * @param {object} res - express response object to attach the cookie to
 * @param {string} userId - the user's mongoDB ID or a unique identifier to be stored in the JWT payload
 * @returns {object} the express response object with the cookie set
 */

const generateToken = (res: Response, userId: string) => {
    if (!config.jwt_secret) throw new Error("JWT_SECRET is required");

    const token = jwt.sign({ userId }, config.jwt_secret, {
        expiresIn: "30d",
    });

    res.cookie("jwt", token, {
        ...getAuthCookieOptions(),
        maxAge: JWT_COOKIE_AGE,
    });
};

export default generateToken;

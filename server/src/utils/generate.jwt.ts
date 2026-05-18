import jwt from "jsonwebtoken";
import config from "../config/config.js";

/**
 * @description generates a JWT, signs it, and sets it as an HTTP only cookie in the response. this is the standard method for establishing a secure, persistent user session.
 * @param {object} res - express response object to attach the cookie to
 * @param {string} userId - the user's mongoDB ID or a unique identifier to be stored in the JWT payload
 * @returns {object} the express response object with the cookie set
 */

const generateToken = (res, userId) => {
    const token = jwt.sign({ userId }, config.jwt_secret, {
        expiresIn: "30d",
    });

    res.cookie("jwt", token, {
        httpOnly: true,
        secure: config.node_env !== "development",
        // TODO: UPDATE SAME SITE IN PROD
        // sameSite: "None",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
};

export default generateToken;

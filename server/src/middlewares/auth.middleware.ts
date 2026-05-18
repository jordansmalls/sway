import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import config from "../config/config.js";

const protect = async (req, res, next) => {
    let token;

    token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwt_secret);

            req.user = await User.findById(decoded.userId).select("-password");

            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error("Not authorized, token failed");
        }
    } else {
        res.status(401);
        throw new Error("Not authorized, no token");
    }
};

export { protect };

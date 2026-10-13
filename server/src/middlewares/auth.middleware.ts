import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import config from "../config/config.js";

const protect = async (req, res, next) => {
    const token = req.cookies?.jwt;
    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, config.jwt_secret);
    } catch {
        return res.status(401).json({ message: "Not authorized, token failed" });
    }

    if (
        typeof decoded === "string" ||
        typeof decoded.userId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(decoded.userId)
    ) {
        return res.status(401).json({ message: "Not authorized, token failed" });
    }

    const user = await User.findById(decoded.userId).select("-password");
    // Existing tokens without a version remain valid only until the first revocation.
    const sessionVersion = decoded.sessionVersion ?? 0;
    if (
        !user ||
        !user.active ||
        !Number.isSafeInteger(sessionVersion) ||
        sessionVersion !== user.sessionVersion
    ) {
        return res.status(401).json({ message: "Not authorized, session revoked" });
    }

    req.user = user;
    next();
};

export { protect };

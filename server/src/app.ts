import express from "express";
import config from "./config/config";
import { logger } from "./config/logger";
import cors from "cors";
import cookieParser from "cookie-parser"


import authRouter from "./routes/auth.routes"
import userRouter from "./routes/user.routes"
import roomRouter from "./routes/room.routes"


export const app = express();

app.use(express.json());
app.use(logger);
app.use(cookieParser())
app.use(cors(config.cors_options));


app.use("/api/auth", authRouter)
app.use("/api/users", userRouter)
app.use("/api/rooms", roomRouter)

app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Hello from Bun!",
    });
});

app.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
    });
});

import express from "express";
import config from "./config/config";
import { logger } from "./config/logger";
import cors from "cors";
import cookieParser from "cookie-parser"


import { notFound } from "./controllers/health.controller";
import { errorHandler } from "./middlewares/error.middleware";


import health from "./routes/health.routes"
import authRouter from "./routes/auth.routes"
import userRouter from "./routes/user.routes"
import roomRouter from "./routes/room.routes"
import spotifyRouter from "./routes/spotify.routes"


export const app = express();

app.use(express.json());
app.use(logger);
app.use(cookieParser())
app.use(cors(config.cors_options));


app.use("/", health);
app.use("/api/auth", authRouter)
app.use("/api/users", userRouter)
app.use("/api/rooms", roomRouter)
app.use("/api/spotify", spotifyRouter)
app.use(notFound)

app.use(errorHandler);
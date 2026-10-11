import config from "./config/config.js";
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { initSocketIO } from "./controllers/request.controller.js";

const allowedOrigins = [config.frontend_url];

export const initSocket = (httpServer: HttpServer): Server => {
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Attach to legacy controller if needed
    initSocketIO(io);

    // Connection Handler
    io.on("connection", (socket: Socket) => {
        const changeRoom = async (action: "join" | "leave", roomId: unknown) => {
            if (typeof roomId !== "string" || !/^[a-fA-F0-9]{24}$/.test(roomId)) {
                return;
            }

            try {
                await socket[action](`room-${roomId}`);
            } catch {
                socket.emit("room:error", { message: "Unable to change room subscription." });
            }
        };

        socket.on("join-room", (roomId: unknown) => changeRoom("join", roomId));
        socket.on("leave-room", (roomId: unknown) => changeRoom("leave", roomId));

        // Room updates are emitted only by server controllers.
        socket.on("disconnect", () => {
            console.log("❌ Client disconnected:", socket.id);
        });
    });

    return io;
};

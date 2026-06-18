import config from "./config/config.js";
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { initSocketIO } from "./controllers/request.controller.js";

const allowedOrigins = [
    config.frontend_url || "http://localhost:3000",
    "http://localhost:5173",
    "http://192.168.1.2:3000",
    "http://192.168.1.2:8000",
];



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
        // console.log("🔌 New client connected:", socket.id);

        socket.on("join-room", (roomId: string) => {
            socket.join(`room-${roomId}`);
            // console.log(`✅ Client ${socket.id} joined room-${roomId}`);
        });

        socket.on("leave-room", (roomId: string) => {
            socket.leave(`room-${roomId}`);
            // console.log(`👋 Client ${socket.id} left room-${roomId}`);
        });

        socket.on("room:update", (updatedRoom: { _id?: string }) => {
            if (!updatedRoom?._id) return;
            io.to(`room-${updatedRoom._id}`).emit("room:updated", updatedRoom);
            // console.log(`🛰️ Room ${updatedRoom._id} updated and broadcasted`);
        });

        socket.on("disconnect", () => {
            console.log("❌ Client disconnected:", socket.id);
        });
    });

    return io;
};

import http from "http";
import { app } from "./app";
import config, { validateRuntimeConfig } from "./config/config";
import connectDB from "./config/db";
import { initSocket } from "./socket";
import { startDemoCleanup } from "./demo/demo.model";
import Request from "./models/request.model";

const start = async () => {
    validateRuntimeConfig();
    await connectDB();
    // Do not accept writes until duplicate submissions are protected by the index.
    await Request.init();
    startDemoCleanup();

    // Start the Express server
    const server = app.listen(config.port, () => {
        console.log(`🚀 Server is live @ http://localhost:${config.port}`);
        console.log(`⚡ Runtime: Bun v${Bun.version}`);
    });

    // Wrap the running server instance with Socket.io
    initSocket(server);
};

start();

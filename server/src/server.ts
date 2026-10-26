import http from "http";
import { app } from "./app";
import config, { validateRuntimeConfig } from "./config/config";
import connectDB from "./config/db";
import { initSocket } from "./socket";
import { createShutdown } from "./shutdown";
import { logger } from "./config/logger";
import { startDemoCleanup } from "./demo/demo.model";
import Vote from "./models/vote.model";
import Request from "./models/request.model";
import Room from "./models/room.model";

const start = async () => {
    validateRuntimeConfig();
    await connectDB();
    // Do not accept writes until duplicate submissions and second active rooms are blocked by indexes.
    await Request.init();
    await Room.init();
    await Vote.init();
    startDemoCleanup();

    // Start the Express server
    const server = app.listen(config.port, () => {
        logger.info({ port: config.port, runtime: `Bun v${Bun.version}` }, "Server is live");
    });

    // Wrap the running server instance with Socket.io
    const io = initSocket(server);

    const shutdown = createShutdown({ server, io });
    // Stay subscribed: a repeated signal reuses the pending shutdown instead of killing the process.
    for (const signal of ["SIGTERM", "SIGINT"] as const) {
        process.on(signal, () => {
            shutdown(signal)
                .then(() => process.exit(0))
                .catch((err) => {
                    logger.error({ err }, "Shutdown failed");
                    process.exit(1);
                });
        });
    }
};

start();

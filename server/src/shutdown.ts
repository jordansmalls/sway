import type { Server as HttpServer } from "http";
import type { Server as SocketServer } from "socket.io";
import mongoose from "mongoose";
import { setShuttingDown } from "./controllers/health.controller";
import { logger } from "./config/logger";

type ShutdownOptions = {
    server: HttpServer;
    io?: SocketServer;
    // How long in-flight requests get to finish before their connections are closed.
    timeoutMs?: number;
    disconnect?: () => Promise<void>;
    log?: (message: string) => void;
};

/**
 * Railway sends SIGTERM on every deploy. Stop accepting connections, close sockets, let in-flight
 * requests finish (up to timeoutMs), then disconnect from MongoDB. Safe to call more than once.
 */
export const createShutdown = ({
    server,
    io,
    timeoutMs = 10_000,
    disconnect = () => mongoose.disconnect(),
    log = (message) => logger.info(message),
}: ShutdownOptions) => {
    let shutdown: Promise<{ timedOut: boolean }> | undefined;

    return (signal: string) => {
        shutdown ??= (async () => {
            log(`${signal} received, shutting down.`);
            setShuttingDown(true);

            // Stop accepting new connections; resolves once in-flight requests have finished.
            const drained = new Promise<void>((resolve) => server.close(() => resolve()));
            server.closeIdleConnections?.();

            // Disconnect sockets; clients reconnect to the new instance and refetch. Not awaited:
            // io.close() also waits on server.close(), which is bounded by the timeout below.
            void io?.close();

            let timer: ReturnType<typeof setTimeout> | undefined;
            const timedOut = await Promise.race([
                drained.then(() => false),
                new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(true), timeoutMs); }),
            ]);
            clearTimeout(timer);
            if (timedOut) {
                log(`In-flight requests did not finish within ${timeoutMs}ms; closing their connections.`);
                server.closeAllConnections?.();
            }

            await disconnect();
            log("Shutdown complete.");
            return { timedOut };
        })();
        return shutdown;
    };
};

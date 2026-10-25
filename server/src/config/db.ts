import mongoose from "mongoose";
import config from "./config";
import { logger } from "./logger";

/**
 * @description establishes a connection to mongoDB using the URI provided in the environment variable
 * @returns {Promise<void>} a promise that resolves when the connection is successful
 * @throws {Error} logs a connection error message and terminates the node process if the connection fails
 */

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongo_uri);
        logger.info({ host: conn.connection.host }, "MongoDB connected");
    } catch (err) {
        logger.fatal({ err }, "MongoDB connection failed");
        process.exit(1);
    }
};

export default connectDB;

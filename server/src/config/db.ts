import mongoose from "mongoose";
import config from "./config";

/**
 * @description establishes a connection to mongoDB using the URI provided in the environment variable
 * @returns {Promise<void>} a promise that resolves when the connection is successful
 * @throws {Error} logs a connection error message and terminates the node process if the connection fails
 */

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongo_uri);
        console.log(`✅ MongoDB Connection Success: ${conn.connection.host}`);
    } catch (err) {
        console.error(`🚨 MongoDB Connection Error: ${err.message}`);
        process.exit(1);
    }
};

export default connectDB;

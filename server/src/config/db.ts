import mongoose from "mongoose";
import config from "./config";

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

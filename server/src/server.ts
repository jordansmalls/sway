import { app } from "./app";
import config from "./config/config";
import connectDB from "./config/db";

const start = async () => {
    await connectDB();
    app.listen(config.port, () => {
        console.log(`🚀 Server is live @ http://localhost:${config.port}`);
        console.log(`⚡ Runtime: Bun v${Bun.version}`);
    });
};

start();

import { app } from "./app";

const PORT = 9999;

const start = async () => {
    app.listen(PORT, () => {
        console.log(`🚀 Server is live @ http://localhost:${PORT}`);
        console.log(`⚡ Runtime: Bun v${Bun.version}`);
    })
}

start();
import express from "express"


export const app = express();


app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Hello from Bun!"
    })
})


app.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
    });
})





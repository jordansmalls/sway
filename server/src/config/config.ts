import dotenv from "dotenv";
dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const frontendUrl = (process.env.FRONTEND_URL || (isProduction ? "https://app.sway.onl" : "http://localhost:3000"))
    .replace(/\/$/, "");

const corsOptions = {
    origin: frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Demo-Token"],
};

interface AppConfig {
    port: string | number;
    jwt_secret: string | undefined;
    mongo_uri: string | undefined;
    node_env: string;
    cors_options: object | undefined;
    spotify_client_id: string | undefined;
    spotify_client_secret: string | undefined;
    frontend_url: string;
    cookie_domain: string | undefined;
}

const config: AppConfig = {
    port: process.env.PORT || 9999,
    jwt_secret: process.env.JWT_SECRET,
    mongo_uri: process.env.MONGO_URI,
    node_env: nodeEnv,
    cors_options: corsOptions,
    spotify_client_id: process.env.SPOTIFY_CLIENT_ID,
    spotify_client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    frontend_url: frontendUrl,
    cookie_domain: process.env.COOKIE_DOMAIN || (isProduction ? ".sway.onl" : undefined),
};

export function validateRuntimeConfig() {
    const required = [
        ["MONGO_URI", config.mongo_uri],
        ["JWT_SECRET", config.jwt_secret],
        ["SPOTIFY_CLIENT_ID", config.spotify_client_id],
        ["SPOTIFY_CLIENT_SECRET", config.spotify_client_secret],
        ["FRONTEND_URL", process.env.FRONTEND_URL],
    ].filter(([, value]) => !value).map(([name]) => name);

    if (required.length) {
        throw new Error(`Missing required environment variables: ${required.join(", ")}`);
    }

    try {
        const frontend = new URL(config.frontend_url);
        if (!["http:", "https:"].includes(frontend.protocol) || frontend.origin !== config.frontend_url) {
            throw new Error();
        }
    } catch {
        throw new Error("FRONTEND_URL must be a valid HTTP(S) origin without a path or query.");
    }
}

export default config;

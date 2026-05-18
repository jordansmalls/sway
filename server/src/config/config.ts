import dotenv from "dotenv";
dotenv.config();

const corsOptions = {
    //TODO: update w/ frontend url when deploying production
    origin: process.env.NODE_ENV === "production" ? "https://sway.onl" : "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

interface AppConfig {
    port: string | number;
    jwt_secret: string | undefined;
    mongo_uri: string | undefined;
    node_env: string | undefined;
    cors_options: object | undefined;
}

const config: AppConfig = {
    port: process.env.PORT || 9999,
    jwt_secret: process.env.JWT_SECRET,
    mongo_uri: process.env.MONGO_URI,
    node_env: process.env.NODE_ENV,
    cors_options: corsOptions,
};

export default config;

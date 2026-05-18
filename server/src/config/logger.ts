import morgan from "morgan";
import config from "./config";

export const logger = config.node_env === "development" ? morgan("dev") : morgan("combined");
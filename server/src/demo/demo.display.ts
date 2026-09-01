import QRCode from "qrcode";
import config from "../config/config";

let qr: Promise<string> | undefined;

export function demoDisplayQr() {
    // No session token or private room ID is embedded in a scannable URL.
    // A scan starts the visitor's own guest demo, not access to this sandbox.
    const origin = config.frontend_url || (config.node_env === "production" ? "https://sway.onl" : "http://localhost:3000");
    const url = new URL("/demo/guest", origin).href;
    qr ??= QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M" })
        .catch((error: unknown) => { qr = undefined; throw error; });
    return qr;
}

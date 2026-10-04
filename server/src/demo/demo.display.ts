import QRCode from "qrcode";
import { PUBLIC_APP_ORIGIN } from "../utils/room.qr";

let qr: Promise<string> | undefined;

export function demoDisplayQr() {
    // No session token or private room ID is embedded in a scannable URL.
    // A scan starts the visitor's own guest demo, not access to this sandbox.
    const url = new URL("/demo/guest", PUBLIC_APP_ORIGIN).href;
    qr ??= QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M" })
        .catch((error: unknown) => { qr = undefined; throw error; });
    return qr;
}

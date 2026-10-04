import QRCode from "qrcode";

export const PUBLIC_APP_ORIGIN = "https://app.sway.onl";

export function generateRoomQr(roomCode: string) {
    return QRCode.toDataURL(`${PUBLIC_APP_ORIGIN}/room/${roomCode}`, {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 300,
        margin: 2,
    });
}

import { describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import QRCode from "qrcode";
import { app } from "../src/app";
import config from "../src/config/config";
import Room from "../src/models/room.model";

describe("Public room QR links", () => {
    it("uses the public app for new rooms and replaces stale images in room details", async () => {
        const previousOrigin = config.frontend_url;
        config.frontend_url = "http://localhost:3000";
        const qrSpy = vi.spyOn(QRCode, "toDataURL");

        try {
            const room = await Room.create({
                roomName: "QR regression",
                roomDescription: "A room created with local server configuration",
                roomCode: "ABCDE",
                roomCreator: new mongoose.Types.ObjectId(),
            });
            await Room.generateRoomQr(room._id);
            expect(qrSpy).toHaveBeenLastCalledWith("https://app.sway.onl/room/ABCDE", expect.any(Object));
            const generated = await Room.findById(room._id);
            expect(generated?.roomQr).toMatch(/^data:image\/png;base64,/);

            // Simulate a room created before the fix, with a stored local QR.
            const staleQr = await QRCode.toDataURL("http://localhost:3000/room/ABCDE");
            await Room.updateOne({ _id: room._id }, { roomQr: staleQr });
            const response = await request(app).get("/api/rooms/ABCDE");

            expect(response.status).toBe(200);
            expect(response.body.roomDetails.roomQr).toBe(generated?.roomQr);
            expect(response.body.roomDetails.roomQr).not.toBe(staleQr);
            expect(qrSpy).toHaveBeenLastCalledWith("https://app.sway.onl/room/ABCDE", expect.any(Object));
        } finally {
            config.frontend_url = previousOrigin;
            qrSpy.mockRestore();
        }
    });
});

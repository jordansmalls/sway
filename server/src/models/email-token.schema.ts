import mongoose from "mongoose";

// Embedded in User so consuming a token and changing credentials is one atomic write.
export const emailTokenSchema = new mongoose.Schema(
    {
        purpose: { type: String, required: true },
        digest: { type: String, required: true },
        email: { type: String, required: true },
        sessionVersion: { type: Number, required: true },
        createdAt: { type: Date, required: true },
        expiresAt: { type: Date, required: true },
    },
    { _id: false },
);

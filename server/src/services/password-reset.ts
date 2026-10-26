import bcrypt from "bcryptjs";
import User from "../models/user.model";
import {
    createEmailToken,
    emailTokenMatch,
    isEmailToken,
    sessionVersionMatch,
} from "./email-token";
import { requireEmailConfig, sendPasswordResetEmail } from "./email";

export const PASSWORD_RESET_LIFETIME_MS = 30 * 60 * 1000;
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
const purpose = "password-reset";

export async function requestPasswordReset(email: string) {
    requireEmailConfig();
    const user = await User.findOne({ email, active: true });
    if (!user) return;

    const { token, record } = createEmailToken(
        purpose,
        user.email,
        user.sessionVersion,
        PASSWORD_RESET_LIFETIME_MS,
    );
    const currentAccount = {
        _id: user._id,
        active: true,
        email: user.email,
        ...sessionVersionMatch(user.sessionVersion),
    };
    // Database-backed cooldown covers multiple processes and overlapping requests.
    const issued = await User.updateOne(
        {
            ...currentAccount,
            emailTokens: {
                $not: {
                    $elemMatch: {
                        purpose,
                        email: user.email,
                        sessionVersion: user.sessionVersion,
                        createdAt: { $gt: new Date(Date.now() - PASSWORD_RESET_COOLDOWN_MS) },
                    },
                },
            },
        },
        { $push: { emailTokens: record } },
    );
    if (!issued.modifiedCount) return;

    try {
        await sendPasswordResetEmail(user.email, token);
    } catch (error) {
        // Keep any previously delivered link usable when a resend fails.
        await User.updateOne(
            { _id: user._id },
            { $pull: { emailTokens: { digest: record.digest } } },
        );
        throw error;
    }
    // Only retire older links after Resend accepts the replacement. Never remove a newer request.
    await User.updateOne(
        { _id: user._id },
        {
            $pull: { emailTokens: { purpose, createdAt: { $lt: record.createdAt } } },
        },
    );
}

export async function resetPassword(token: string, newPassword: string) {
    if (!isEmailToken(token)) return null;
    const match = emailTokenMatch(purpose, token);
    const user = await User.findOne({ active: true, emailTokens: { $elemMatch: match } }).select(
        "+emailTokens",
    );
    if (!user) return null;
    const record = user.emailTokens.find(
        (entry) => entry.digest === match.digest && entry.purpose === purpose,
    );
    if (!record || record.email !== user.email || record.sessionVersion !== user.sessionVersion)
        return null;

    // Query updates bypass save hooks. Hash here and revoke sessions in the same atomic write.
    const password = await bcrypt.hash(newPassword, 10);
    const consumed = await User.updateOne(
        {
            _id: user._id,
            active: true,
            email: record.email,
            ...sessionVersionMatch(record.sessionVersion),
            emailTokens: {
                $elemMatch: {
                    ...emailTokenMatch(purpose, token),
                    email: record.email,
                    sessionVersion: record.sessionVersion,
                },
            },
        },
        {
            $set: { password, emailTokens: [] },
            $inc: { sessionVersion: 1 },
        },
    );
    return consumed.modifiedCount ? { email: user.email } : null;
}

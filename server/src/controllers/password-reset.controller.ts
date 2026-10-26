import type { Request, Response } from "express";
import validator from "validator";
import { logger } from "../config/logger";
import { EmailDeliveryError, sendPasswordChangedEmail } from "../services/email";
import { requestPasswordReset, resetPassword } from "../services/password-reset";
import { isEmailToken } from "../services/email-token";
import { clearAuthToken } from "../utils/generate.jwt";

export const PASSWORD_RESET_REQUEST_MESSAGE =
    "If an account uses that email, we'll send a password reset link. Check your inbox and spam folder.";
export const INVALID_RESET_MESSAGE =
    "This reset link is invalid or has expired. Request a new link to try again.";

const reportFailure = (error: unknown, requestId: string | undefined, message: string) => {
    logger.error(
        { requestId, code: error instanceof EmailDeliveryError ? error.code : "internal" },
        message,
    );
};

export async function forgotPassword(req: Request, res: Response) {
    const input: unknown = req.body?.email;
    if (typeof input !== "string" || input.length > 254 || !validator.isEmail(input.trim())) {
        return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }
    const email = input.trim().toLowerCase();
    res.setHeader("Cache-Control", "no-store");
    // Acknowledge before looking up the account or calling Resend, avoiding an existence timing signal.
    res.status(200).json({ success: true, message: PASSWORD_RESET_REQUEST_MESSAGE });
    try {
        await requestPasswordReset(email);
    } catch (error) {
        reportFailure(
            error,
            res.getHeader("X-Request-Id")?.toString(),
            "Password reset email could not be sent",
        );
    }
}

export async function completePasswordReset(req: Request, res: Response) {
    const token: unknown = req.body?.token;
    const newPassword: unknown = req.body?.newPassword;
    res.setHeader("Cache-Control", "no-store");
    if (!isEmailToken(token)) {
        return res.status(400).json({ success: false, message: INVALID_RESET_MESSAGE });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
        return res
            .status(400)
            .json({ success: false, message: "Password must be at least 8 characters." });
    }
    let result;
    try {
        result = await resetPassword(token, newPassword);
    } catch (error) {
        reportFailure(error, res.getHeader("X-Request-Id")?.toString(), "Password reset failed");
        return res
            .status(500)
            .json({ success: false, message: "Unable to reset your password. Please try again." });
    }
    if (!result) {
        return res.status(400).json({ success: false, message: INVALID_RESET_MESSAGE });
    }
    clearAuthToken(res);
    res.status(200).json({
        success: true,
        message: "Your password has been reset. Log in with your new password.",
    });
    try {
        await sendPasswordChangedEmail(result.email);
    } catch (error) {
        reportFailure(
            error,
            res.getHeader("X-Request-Id")?.toString(),
            "Password reset notification could not be sent",
        );
    }
}

import config from "../config/config";

export class EmailDeliveryError extends Error {
    constructor(public readonly code: "not-configured" | "rejected" | "unavailable") {
        super(`Email delivery ${code}`);
    }
}

export function requireEmailConfig() {
    if (!config.resend_api_key || !config.email_from) {
        throw new EmailDeliveryError("not-configured");
    }
}

export function frontendLink(path: string) {
    const frontend = new URL(config.frontend_url);
    if (
        !["http:", "https:"].includes(frontend.protocol) ||
        frontend.origin !== config.frontend_url ||
        (config.node_env === "production" && frontend.protocol !== "https:")
    ) {
        throw new Error(
            "Email links require a valid FRONTEND_URL origin, with HTTPS in production.",
        );
    }
    return new URL(path, frontend);
}

type EmailMessage = {
    to: string;
    subject: string;
    text: string;
    html: string;
};

export async function sendEmail(message: EmailMessage) {
    requireEmailConfig();
    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.resend_api_key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ...message, to: [message.to], from: config.email_from }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new EmailDeliveryError("rejected");
        const result: unknown = await response.json();
        if (
            !result ||
            typeof result !== "object" ||
            !("id" in result) ||
            typeof result.id !== "string" ||
            !result.id
        ) {
            throw new EmailDeliveryError("rejected");
        }
    } catch (error) {
        // Provider errors can echo credentials, recipients, and reset URLs. Never propagate them.
        if (error instanceof EmailDeliveryError) throw error;
        throw new EmailDeliveryError("unavailable");
    }
}

const escapeHtml = (value: string) =>
    value.replace(
        /[&<>"']/g,
        (char) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[char]!,
    );

export function sendPasswordResetEmail(email: string, token: string) {
    const url = frontendLink("/reset-password");
    // Fragments never reach the web server or appear in HTTP Referer headers.
    url.hash = new URLSearchParams({ token }).toString();
    const link = url.toString();
    return sendEmail({
        to: email,
        subject: "Reset your Sway password",
        text: `Reset your Sway password: ${link}\n\nThis link expires in 30 minutes and can be used once. If you didn't request this, you can ignore this email. Your password has not changed.`,
        html: `<h1>Reset your Sway password</h1><p><a href="${escapeHtml(link)}">Choose a new password</a></p><p>This link expires in 30 minutes and can be used once.</p><p>If you didn't request this, you can ignore this email. Your password has not changed.</p>`,
    });
}

export function sendPasswordChangedEmail(email: string) {
    return sendEmail({
        to: email,
        subject: "Your Sway password was changed",
        text: "Your Sway password was reset. All previous sessions have been signed out. If you didn't make this change, request another password reset from the Sway login page.",
        html: "<h1>Your Sway password was changed</h1><p>Your password was reset and all previous sessions have been signed out.</p><p>If you didn't make this change, request another password reset from the Sway login page.</p>",
    });
}

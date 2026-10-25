import { describe, expect, it } from "bun:test";
import { buildProfileUpdate, isEmailChange } from "../src/lib/profile-update";

describe("profile updates", () => {
    it("treats case and surrounding spaces as the same email", () => {
        expect(isEmailChange(" Owner@Example.com ", "owner@example.com")).toBe(false);
        expect(isEmailChange("new@example.com", "owner@example.com")).toBe(true);
    });

    it("sends the current password only when the email changes", () => {
        const values = { username: "dj", email: "owner@example.com", currentPassword: "secret" };
        expect(buildProfileUpdate(values, "owner@example.com")).toEqual({ username: "dj", email: "owner@example.com" });
        expect(buildProfileUpdate({ ...values, email: "new@example.com" }, "owner@example.com"))
            .toEqual({ username: "dj", email: "new@example.com", currentPassword: "secret" });
    });
});

import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import User from "../src/models/user.model";
import jwt from "jsonwebtoken";

const JWT_SECRET = "testsecretjwt_supersecure_32bytes_1234567";

describe("Health API Endpoints", () => {
    describe("GET /", () => {
        it("should return the service status details", async () => {
            const res = await request(app).get("/");

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("service", "sway - a DJ's best friend");
            expect(res.body).toHaveProperty("version");
        });
    });

    describe("GET /server/health/admin", () => {
        it("should return 401 Unauthorized if no JWT cookie is provided", async () => {
            const res = await request(app).get("/server/health/admin");

            expect(res.status).toBe(401);
            expect(res.body.message).toContain("Not authorized");
        });

        it("should return 401 Unauthorized if an invalid JWT cookie is provided", async () => {
            const res = await request(app)
                .get("/server/health/admin")
                .set("Cookie", ["jwt=invalid-token"]);

            expect(res.status).toBe(401);
            expect(res.body.message).toContain("Not authorized");
        });

        it("should return 403 Forbidden if the user is not an admin", async () => {
            // Create a non-admin user
            const user = await User.create({
                email: "user@example.com",
                password: "password123",
                admin: false,
            });

            // Sign token
            const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET);

            const res = await request(app)
                .get("/server/health/admin")
                .set("Cookie", [`jwt=${token}`]);

            expect(res.status).toBe(403);
            expect(res.body).toHaveProperty("success", false);
            expect(res.body.message).toContain("FORBIDDEN");
        });

        it("should return 200 OK with server stats if the user is an admin", async () => {
            // Create an admin user
            const adminUser = await User.create({
                email: "admin@example.com",
                password: "password123",
                admin: true,
            });

            // Sign token
            const token = jwt.sign({ userId: adminUser._id.toString() }, JWT_SECRET);

            const res = await request(app)
                .get("/server/health/admin")
                .set("Cookie", [`jwt=${token}`]);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("status", "OK");
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("environment", "test");
            expect(res.body).toHaveProperty("uptime_formatted");
            expect(res.body).toHaveProperty("memory");
        });
    });
});

import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import User from "../src/models/user.model";
import jwt from "jsonwebtoken";

const JWT_SECRET = "testsecretjwt_supersecure_32bytes_1234567";

describe("Auth API Endpoints", () => {
    describe("POST /api/auth - Create user account", () => {
        it("should return 400 if email or password is missing", async () => {
            const res = await request(app)
                .post("/api/auth")
                .send({ email: "test@example.com" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("Both email and password fields are required");
        });

        it("should return 400 if email is invalid", async () => {
            const res = await request(app)
                .post("/api/auth")
                .send({ email: "invalid-email", password: "password123" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("Please enter a valid email address");
        });

        it("should return 400 if password is too short", async () => {
            const res = await request(app)
                .post("/api/auth")
                .send({ email: "test@example.com", password: "short" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("Passwords must be at least 8 characters long");
        });

        it("should create user account successfully and set JWT cookie", async () => {
            const res = await request(app)
                .post("/api/auth")
                .send({ email: "newuser@example.com", password: "password123" });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toHaveProperty("email", "newuser@example.com");
            expect(res.body.user).not.toHaveProperty("password");
            
            // Check if cookie is set
            const cookies = res.headers["set-cookie"];
            expect(cookies).toBeDefined();
            const jwtCookie = cookies.find((cookie: string) => cookie.startsWith("jwt="));
            expect(jwtCookie).toBeDefined();
        });

        it("should return 400 if email is already in use", async () => {
            // Register once
            await request(app)
                .post("/api/auth")
                .send({ email: "duplicate@example.com", password: "password123" });

            // Register again
            const res = await request(app)
                .post("/api/auth")
                .send({ email: "duplicate@example.com", password: "password456" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("Email is already associated with another account");
        });
    });

    describe("GET /api/auth/username/:username - Check username availability", () => {
        it("should return 400 if username is invalid (too short)", async () => {
            const res = await request(app).get("/api/auth/username/ab");
            expect(res.status).toBe(400);
        });

        it("should return taken: false if username is available", async () => {
            const res = await request(app).get("/api/auth/username/available_user");
            expect(res.status).toBe(200);
            expect(res.body.taken).toBe(false);
        });

        it("should return taken: true if username is taken", async () => {
            // Create a user with username
            await User.create({
                email: "userwithusername@example.com",
                password: "password123",
                username: "taken_username",
                hasUsername: true,
            });

            const res = await request(app).get("/api/auth/username/taken_username");
            expect(res.status).toBe(200);
            expect(res.body.taken).toBe(true);
        });
    });

    describe("POST /api/auth/username - Create/Assign username", () => {
        it("should return 401 if user is not logged in", async () => {
            const res = await request(app)
                .post("/api/auth/username")
                .send({ username: "cool_user" });

            expect(res.status).toBe(401);
        });

        it("should successfully set username if user has no username", async () => {
            const user = await User.create({
                email: "no_username@example.com",
                password: "password123",
            });

            const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET);

            const res = await request(app)
                .post("/api/auth/username")
                .set("Cookie", [`jwt=${token}`])
                .send({ username: "cool_new_username" });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user.username).toBe("cool_new_username");

            const updatedUser = await User.findById(user._id);
            expect(updatedUser?.username).toBe("cool_new_username");
            expect(updatedUser?.hasUsername).toBe(true);
        });

        it("should return 400 if user already has a username", async () => {
            const user = await User.create({
                email: "has_username@example.com",
                password: "password123",
                username: "existing_username",
                hasUsername: true,
            });

            const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET);

            const res = await request(app)
                .post("/api/auth/username")
                .set("Cookie", [`jwt=${token}`])
                .send({ username: "another_username" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("You have already created a username");
        });

        it("should return 400 if username is already taken", async () => {
            // Existing user who already took the username
            await User.create({
                email: "owner@example.com",
                password: "password123",
                username: "taken_one",
                hasUsername: true,
            });

            // New user trying to claim the username
            const newUser = await User.create({
                email: "claimant@example.com",
                password: "password123",
            });

            const token = jwt.sign({ userId: newUser._id.toString() }, JWT_SECRET);

            const res = await request(app)
                .post("/api/auth/username")
                .set("Cookie", [`jwt=${token}`])
                .send({ username: "taken_one" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("This username is already in use");
        });
    });

    describe("POST /api/auth/login - Log in user account", () => {
        beforeEach(async () => {
            // Create a test user for login tests
            await User.create({
                email: "login_test@example.com",
                password: "password123",
                username: "login_test_user",
                hasUsername: true,
            });
        });

        it("should return 400 on missing credentials", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ identifier: "login_test@example.com" });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("All fields are required");
        });

        it("should return 401 on incorrect password", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ identifier: "login_test@example.com", password: "wrong_password" });

            expect(res.status).toBe(401);
            expect(res.body.message).toContain("trouble logging you in");
        });

        it("should log in successfully using email", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ identifier: "login_test@example.com", password: "password123" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.email).toBe("login_test@example.com");

            const cookies = res.headers["set-cookie"];
            expect(cookies).toBeDefined();
            const jwtCookie = cookies.find((cookie: string) => cookie.startsWith("jwt="));
            expect(jwtCookie).toBeDefined();
        });

        it("should log in successfully using username", async () => {
            const res = await request(app)
                .post("/api/auth/login")
                .send({ identifier: "login_test_user", password: "password123" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.username).toBe("login_test_user");
        });
    });

    describe("POST /api/auth/logout - Log out user account", () => {
        it("should return 200 and clear the jwt cookie", async () => {
            const res = await request(app).post("/api/auth/logout");

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("Logged out successfully");

            const cookies = res.headers["set-cookie"];
            expect(cookies).toBeDefined();
            const jwtCookie = cookies.find((cookie: string) => cookie.startsWith("jwt="));
            // Expires should be set to past date or empty value
            expect(jwtCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
        });
    });
});

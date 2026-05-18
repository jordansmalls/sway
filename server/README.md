# Sway: Server

A robust web server and API built with Bun, Express, and MongoDB.

---

# Stack

## Core Dependencies

- express
- mongoose
- cors
- morgan
- validator
- jsonwebtoken
- dotenv
- bcryptjs

## Development Dependencies

- prettier
- @types/bun

---

# Installation

```bash
git clone git@github.com:jordansmalls/sway.git

cd server

bun install

touch .env

bun run dev
```

## Environment Variables

Environment variables must be configured before starting the server.

Example:

```env
PORT=
MONGO_URI=
JWT_SECRET=
NODE_ENV=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
FRONTEND_URL=
DOMAIN=
```

---

# API Endpoints

---

# Auth Routes

## Create User Account

Creates a new user account and authenticates the user with a JWT cookie.

### Endpoint

```http
POST /api/auth
```

### Access

`PUBLIC`

### Request Body

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Validation Rules

- `email` must be a valid email address
- `password` must be at least 8 characters long

### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "message": "Account created successfully. Welcome to Sway!",
  "user": {
    "_id": "6828e5f7a2b4c91e1d9a1f32",
    "email": "user@example.com",
    "hasActiveRoom": false,
    "hasUsername": false,
    "createdAt": "2026-05-18T15:20:00.000Z",
    "updatedAt": "2026-05-18T15:20:00.000Z"
  }
}
```

### Additional Behavior

- Sets an HTTP-only JWT cookie for authentication

### Error Response

**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Sorry, we're having trouble creating your account. Please try again soon."
}
```

---

## Create Username

Creates a username for an authenticated user.

### Endpoint

```http
POST /api/auth/username
```

### Access

`PRIVATE`

### Request Body

```json
{
  "username": "john"
}
```

### Validation Rules

- Username must be between 3 and 20 characters long
- Username may only contain:
  - letters
  - numbers
  - underscores (`_`)

Regex:

```txt
a-zA-Z0-9_
```

### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "message": "john has a great ring to it, let's do this.",
  "user": {
    "_id": "6828e5f7a2b4c91e1d9a1f32",
    "username": "john",
    "email": "user@example.com",
    "hasActiveRoom": false,
    "hasUsername": true,
    "createdAt": "2026-05-18T15:20:00.000Z",
    "updatedAt": "2026-05-18T15:20:00.000Z"
  }
}
```

### Error Responses

#### Unauthorized

**Status:** `401 Unauthorized`

```json
{
  "success": false,
  "error": "Invalid Credentials: ID missing",
  "message": "You must be logged in."
}
```

#### User Not Found

**Status:** `404 Not Found`

```json
{
  "success": false,
  "error": "Resource Not Found",
  "message": "User not found."
}
```

#### User Already Has Username

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Invalid Credentials: user has username",
  "message": "You have already created a username."
}
```

#### Invalid Username Length

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Invalid Credentials: username length",
  "message": "Usernames must be between 3 and 20 characters long."
}
```

#### Invalid Username Characters

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Invalid Credentials: invalid username characters",
  "message": "Usernames can only contain letters, numbers, and underscores."
}
```

#### Username Taken

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Username taken",
  "message": "This username is already in use."
}
```

#### Internal Server Error

**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "We're having trouble, please try again."
}
```

---

## Check Username Availability

Checks whether a username is already in use.

### Endpoint

```http
GET /api/auth/username/:username
```

### Access

`PUBLIC`

### Route Parameters

```json
{
  "username": "john"
}
```

### Validation Rules

- Username must be between 3 and 20 characters long
- Username may only contain:
  - letters
  - numbers
  - underscores (`_`)

Regex:

```txt
a-zA-Z0-9_
```

### Success Responses

#### Username Taken

**Status:** `200 OK`

```json
{
  "success": true,
  "taken": true,
  "message": "Username is already in use."
}
```

#### Username Available

**Status:** `200 OK`

```json
{
  "success": true,
  "taken": false,
  "message": "Username is available."
}
```

### Error Responses

#### Invalid Username

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Invalid Credentials: invalid username characters or length",
  "message": "Usernames must be between 3 and 20 characters in length, and only contain no special characters."
}
```

#### Internal Server Error

**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "We're having trouble, please try again soon."
}
```

---

## Check Email Availability

Checks whether an email is already associated with an account.

### Endpoint

```http
GET /api/auth/email/:email
```

### Access

`PUBLIC`

### Route Parameters

```json
{
  "email": "user@example.com"
}
```

### Success Responses

#### Email Taken

**Status:** `200 OK`

```json
{
  "success": true,
  "taken": true,
  "message": "Email is already in use."
}
```

#### Email Available

**Status:** `200 OK`

```json
{
  "success": true,
  "taken": false,
  "message": "Email is available!"
}
```

### Error Responses

#### Invalid Email

**Status:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Invalid Credentials: invalid email",
  "message": "Oops! Please enter a valid email address."
}
```

#### Internal Server Error

**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "We're having trouble, please try again soon."
}
```

---

## Log In User

Authenticates a user and sets a JWT cookie.

### Endpoint

```http
POST /api/auth/login
```

### Access

`PUBLIC`

### Request Body

```json
{
  "identifier": "john",
  "password": "password123"
}
```

### Notes

- `identifier` can be either:
  - email
  - username

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "You've been successfully logged in.",
  "user": {
    "_id": "6828e5f7a2b4c91e1d9a1f32",
    "username": "john",
    "email": "user@example.com",
    "hasActiveRoom": false,
    "hasUsername": true,
    "createdAt": "2026-05-18T15:20:00.000Z",
    "updatedAt": "2026-05-18T15:20:00.000Z"
  }
}
```

### Additional Behavior

- Sets an HTTP-only JWT cookie for authentication

### Error Responses

#### Invalid Credentials

**Status:** `401 Unauthorized`

```json
{
  "success": false,
  "error": "Invalid Credentials: invalid username/email or password",
  "message": "We're having trouble logging you in, please try again soon."
}
```

#### Internal Server Error

**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "We're having trouble logging you in, please try again soon."
}
```

---

## Log Out User

Logs out the authenticated user and clears the JWT cookie.

### Endpoint

```http
POST /api/auth/logout
```

### Access

`PUBLIC`

### Request Body

None

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully. Please come back soon."
}
```

### Additional Behavior

- Clears the JWT authentication cookie

### Error Response

**Status:** `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "We're having trouble logging you out, please try again."
}
```
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
- axios
- cookie-parser
- express-rate-limit
- qrcode

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

<!-- TODO: === UPDATE README ROOM AND USER ENDPOINTS === -->

# User Endpoints

```js
/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  PRIVATE
 */

/**
 * @desc    Update user password
 * @route   POST /api/users/password
 * @access  PRIVATE
 */

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  PRIVATE
 */

/**
 * @desc    Delete user account (toggle active prop)
 * @route   DELETE /api/users/profile
 * @access
 */
```

```js
/**
 * @desc    Fetch User's active room
 * @route   GET /api/users/:userId/rooms/active
 * @access  PUBLIC
 */

/**
 * @desc    Fetch a User's hasActiveRoom value
 * @route   GET /api/users/:userId/has-active-room
 * @access  PRIVATE
 */

/**
 * @desc    Fetch User Inactive Rooms
 * @route   GET /api/users/:userId/inactive
 * @access  PRIVATE
 */
```

# Room Endpoints

Create Room

```js
/**
 * @desc    Create a Room
 * @route   POST /api/rooms
 * @access  PRIVATE
 */
```

input

```json
{
    "roomName": "testing room",
    "roomDescription": "this is a test."
}
```

note: only can be accessed while authorized.

output

```json
{
    "success": true,
    "message": "Success! testing room has been created and is now active.",
    "newRoom": {
        "roomName": "testing room",
        "roomDescription": "this is a test.",
        "roomCode": "3LBW9",
        "roomCreator": "6a0b88f356dcc29585f08be0",
        "active": true,
        "_id": "6a0b892556dcc29585f08be1",
        "createdAt": "2026-05-18T21:48:21.283Z",
        "updatedAt": "2026-05-18T21:48:21.283Z",
        "__v": 0
    }
}
```

Delete Room

input

_DELETE - http://localhost:9999/api/rooms/6a0b892556dcc29585f08be1_

request body

```json
{
    "userId": "6a0b88f356dcc29585f08be0"
}
```

output

```json
{
    "success": true,
    "message": "The testing room room has been successfully deleted.",
    "room": {
        "_id": "6a0b892556dcc29585f08be1",
        "roomName": "testing room",
        "roomDescription": "this is a test.",
        "roomCode": "3LBW9",
        "roomCreator": "6a0b88f356dcc29585f08be0",
        "active": true,
        "createdAt": "2026-05-18T21:48:21.283Z",
        "updatedAt": "2026-05-18T21:48:21.337Z",
        "__v": 0,
        "roomQr": "data:image/png;base64,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"
    }
}
```

on error:

```js
res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: "We're currently having trouble deleting this room, please try again soon.",
});
```

or

```js

```

## Fetch Room Details

```js
/**
 * @desc    Fetch Room Details
 * @route   GET /api/rooms/:roomCode
 * @access  PUBLIC
 * @feats   Finds and returns a room's details based on roomCode
 */
```

on success returns

```js
const roomDetails = {
    _id: room._id,
    roomName: room.roomName,
    roomDescription: room.roomDescription,
    roomCode: room.roomCode,
    roomQr: room.roomQr,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    active: room.active,
};

return res.status(200).json({
    success: true,
    message: `Success! Here's ${room.roomName}'s details.`,
    roomDetails,
});
```

on error returns

```js
res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: "We're having trouble, please try again.",
});
```

# Spotify Endpoints

Search Spotify for Tracks

```js
/**
 * @desc    Search Spotify for Tracks
 * @route   GET /api/spotify/search
 * @access  PUBLIC
 */
```

on success:

```js
const tracks = response.data.tracks.items.map((track) => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    duration_ms: track.duration_ms,
    albumImage: track.album.images[track.album.images.length - 1]?.url,
    uri: track.uri,
}));

return res.status(200).json({
    success: true,
    tracks,
});
```

on error:

```js
res.status(400).json({
    success: false,
    error: "Invalid Credentials: search query missing",
    message: "Search Query is required.",
});
```

OR

```js
res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: "We're having trouble, please try again.",
});
```

Fetch Track Details

```js
/**
 * @desc    Fetch Track Details
 * @route   GET /api/spotify/tracks/:id
 * @access  PUBLIC
 */
```

on success:

```js
const track = {
    id: response.data.id,
    name: response.data.name,
    artist: response.data.artists.map((artist) => artist.name).join(", "),
    album: response.data.album.name,
    duration_ms: response.data.duration_ms,
    popularity: response.data.popularity,
    albumImage: response.data.album.images[0]?.url,
    previewUrl: response.data.preview_url,
    uri: response.data.uri,
};
return res.status(200).json({
    success: true,
    track,
});
```

on error:

```js
res.status(400).json({
    success: false,
    error: "Invalid Credentials: track id missing",
    message: "Track ID is required.",
});
```

or

```js
res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: "We're having trouble, please try again.",
});
```

Fetch an Artist's Top Tracks

```js
/**
 * @desc    Fetch Artist's Top Tracks
 * @route   GET /api/spotify/artists/:id/top-tracks
 * @access  PUBLIC
 */
```

on success:

```js
const tracks = response.data.tracks.map((track) => ({
    id: track.id,
    name: track.name,
    album: track.album.name,
    duration_ms: track.duration_ms,
    albumImage: track.album.images[track.album.images.length - 1]?.url,
    uri: track.uri,
}));

return res.status(200).json({
    success: true,
    tracks,
});
```

on error:

```js
res.status(400).json({
    success: false,
    error: "Invalid Credentials: artist ID missing",
    message: "Oops! Artist ID is required.",
});
```

OR

```js
res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: "We're having trouble, please try again.",
});
```

# Sway Server

A robust web API built with Bun, Express, and MongoDB.

---

## Table of Contents

- [Core Dependencies](#core-dependencies)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Errors](#errors)
- [Database Models](#database-models)
- [Authentication](#authentication)
- [Users](#users)
- [Rooms](#rooms)
- [Spotify](#spotify)
- [Requests](#requests)
- [Analytics](#analytics)
- [Global](#global)
- [Exports](#exports)
- [Server Health](#server-health)
- [Contact](#contact)

---

## Core Dependencies

**Production**

- express
- mongoose
- cors
- morgan
- validator
- jsonwebtoken
- bcryptjs
- dotenv
- axios
- cookie-parser
- express-rate-limit
- qrcode
- csv-writer
- socket.io

**Development**

- prettier
- @types/bun

---

## Installation

```bash
git clone git@github.com:jordansmalls/sway.git
cd server
bun install
touch .env
bun run dev
```

---

## Project Structure

```
./
├── src/
│   ├── config/
│   │   ├── config.ts
│   │   ├── db.ts
│   │   └── logger.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── export.controller.ts
│   │   ├── health.controller.ts
│   │   ├── request.controller.ts
│   │   ├── room.controller.ts
│   │   ├── spotify.controller.ts
│   │   └── user.controller.ts
│   ├── middlewares/
│   │   ├── rate-limiters/
│   │   │   ├── general.limiter.ts
│   │   │   └── vote.limiter.ts
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── models/
│   │   ├── request.model.ts
│   │   ├── room.model.ts
│   │   └── user.model.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── export.routes.ts
│   │   ├── health.routes.ts
│   │   ├── request.routes.ts
│   │   ├── room.routes.ts
│   │   ├── spotify.routes.ts
│   │   └── user.routes.ts
│   ├── utils/
│   │   ├── formatters/
│   │   │   ├── format.spotify.ts
│   │   │   ├── format.times.ts
│   │   │   ├── format.uptime.ts
│   │   │   └── plaintext-helpers.ts
│   │   ├── generate.jwt.ts
│   │   ├── generate.room.code.ts
│   │   ├── set.room.inactive.ts
│   │   └── set.user.active.room.ts
│   ├── app.ts
│   ├── server.ts
│   └── socket.ts
├── bun.lock
├── package.json
├── README.md
└── tsconfig.json
```


---

## Environment Variables

Configure these before starting the server:

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

## Errors

Standard error response format:

```js
res.status(500).json({
  success: false,
  error: "Internal Server Error",
  message: "We're having trouble, please try again.",
});
```

- `success` and `error` values assist with debugging
- `message` is displayed in Sonner toast notifications
- Used consistently across 400, 401, 403, 404, etc. (text varies per endpoint)

---

## Database Models

### User

| Field | Type | Constraints |
|-------|------|-------------|
| `username` | String | 3-20 chars, alphanumeric + underscore, unique, sparse |
| `email` | String | Required, unique, lowercase |
| `password` | String | Required, min 8 chars |
| `active` | Boolean | Default: `true` |
| `hasActiveRoom` | Boolean | Default: `false` |
| `hasUsername` | Boolean | Default: `false` |
| `admin` | Boolean | Default: `false` |

```js
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      sparse: true,
      minLength: 3,
      maxLength: 20,
      unique: true,
      lowercase: true,
      index: 1,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const isValidLength = v.length >= 3 && v.length <= 20;
          const isValidFormat = /^[a-zA-Z0-9_]+$/.test(v);
          return isValidLength && isValidFormat;
        },
        message:
          "Username must be 3-20 characters and contain only letters, numbers, and underscores",
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: 1,
    },
    password: {
      type: String,
      required: true,
      minLength: 8,
    },
    active: { type: Boolean, default: true },
    hasActiveRoom: { type: Boolean, default: false },
    hasUsername: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
  },
  { timestamps: true }
);
```

### Room

| Field | Type | Constraints |
|-------|------|-------------|
| `roomName` | String | Required, max 100 chars |
| `roomDescription` | String | Required, max 450 chars |
| `roomCode` | String | Required, unique, max 5 chars |
| `roomQr` | String | Optional |
| `roomCreator` | ObjectId | Required, ref: `User` |
| `active` | Boolean | Default: `true` |

```js
const roomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: [true, "A room name is required"],
      trim: true,
      maxLength: [100, "Room names cannot exceed 100 characters"],
    },
    roomDescription: {
      type: String,
      required: [true, "Room descriptions are required"],
      trim: true,
      maxLength: [450, "Room descriptions cannot exceed 450 characters"],
    },
    roomCode: {
      type: String,
      unique: true,
      required: [true, "A room code is required"],
      maxLength: 5,
      trim: true,
      index: 1,
    },
    roomQr: { type: String, required: false },
    roomCreator: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: 1,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
```

### Request

| Field | Type | Constraints |
|-------|------|-------------|
| `roomId` | ObjectId | Required, ref: `Room` |
| `status` | String | Enum: `pending`, `playing`, `played`, `rejected` |
| `votes` | Number | Default: `1`, min: `1` |
| `playedAt` | Date | Nullable |
| `requestedBy` | String | Optional |
| `completedAt` | Date | Nullable |
| `track.spotifyTrackId` | String | Required |
| `track.title` | String | Required |
| `track.artist` | String | Required |
| `track.albumArtUrl` | String | Optional |
| `track.spotifyLink` | String | Required |
| `track.spotifyURI` | String | Required |

```js
const requestSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    status: {
      type: String,
      enum: ["pending", "playing", "played", "rejected"],
      default: "pending",
    },
    votes: { type: Number, default: 1, min: 1 },
    playedAt: { type: Date, default: null },
    requestedBy: { type: String, required: false },
    completedAt: { type: Date, default: null },
    track: {
      spotifyTrackId: { type: String, required: true },
      title: { type: String, required: true, trim: true },
      artist: { type: String, required: true, trim: true },
      albumArtUrl: { type: String, required: false },
      spotifyLink: { type: String, required: true },
      spotifyURI: { type: String, required: true },
    },
  },
  { timestamps: true }
);
```

---

## Authentication

### Create Account

```
POST /api/auth
```

**Access:** Public
**Body:** `{ email, password }`

| Field | Constraints |
|-------|-------------|
| `email` | Valid email format |
| `password` | Min 8 characters |

**Success Response:**

```js
res.status(201).json({
  success: true,
  message: "Account created successfully. Welcome to Sway!",
  user: {
    _id: user._id,
    email: user.email,
    hasActiveRoom: user.hasActiveRoom,
    hasUsername: user.hasUsername,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  },
});
```

> Sets JWT cookie on success.

---

### Create Username

```
POST /api/auth/username
```

**Access:** Private
**Body:** `{ username }`

| Field | Constraints |
|-------|-------------|
| `username` | 3-20 chars, `/^[a-zA-Z0-9_]+$/` |

**Success Response:**

```js
res.status(201).json({
  success: true,
  message: `${username} has a great ring to it, let's do this.`,
  user: {
    _id: user._id,
    username: updatedUser.username,
    email: updatedUser.email,
    hasActiveRoom: updatedUser.hasActiveRoom,
    hasUsername: updatedUser.hasUsername,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  },
});
```

---

### Check Username Availability

```
GET /api/auth/username/:username
```

**Access:** Public

**Success Responses:**

```js
// Taken
{ success: true, taken: true, message: "Username is already in use." }

// Available
{ success: true, taken: false, message: "Username is available." }
```

---

### Check Email Availability

```
GET /api/auth/email/:email
```

**Access:** Public

**Success Responses:**

```js
// Taken
{ success: true, taken: true, message: "Email is already in use." }

// Available
{ success: true, taken: false, message: "Email is available!" }
```

---

### Log In

```
POST /api/auth/login
```

**Access:** Public
**Body:** `{ identifier, password }`

> `identifier` can be username or email.

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "You've been successfully logged in.",
  user: {
    _id: user._id,
    username: user.username,
    email: user.email,
    hasActiveRoom: user.hasActiveRoom,
    hasUsername: user.hasUsername,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  },
});
```

> Sets JWT cookie on success.

---

### Log Out

```
POST /api/auth/logout
```

**Access:** Public

Clears JWT cookie and returns:

```js
res.status(200).json({
  success: true,
  message: "Logged out successfully. Please come back soon.",
});
```

---

## Users

### Update Profile

```
PUT /api/users/profile
```

**Access:** Private
**Body:** `{ username?, email? }` (at least one required)

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Success! Your account has been updated.",
  user: { /* updated user object */ },
});
```

---

### Update Password

```
POST /api/users/password
```

**Access:** Private
**Body:** `{ currentPassword, newPassword }`

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Password updated successfully.",
});
```

---

### Get Current User

```
GET /api/users/me
```

**Access:** Private

**Success Response:**

```js
res.status(200).json({
  success: true,
  user: { /* user object */ },
});
```

---

### Delete Account

```
DELETE /api/users/profile
```

**Access:** Private
**Effect:** Toggles `active` to `false`, clears JWT cookie

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Account deactivated successfully.",
});
```

---

### Fetch Active Room

```
GET /api/users/:userId/rooms/active
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  activeRoom,
});
```

---

### Check Active Room Status

```
GET /api/users/:userId/has-active-room
```

**Access:** Private

**Success Response:**

```js
res.status(200).json({
  success: true,
  hasActiveRoom,
});
```

---

### Fetch Inactive Rooms

```
GET /api/users/:userId/inactive
```

**Access:** Private

**Success Response:**

```js
res.status(200).json({
  success: true,
  inactiveRooms: [], // or array of rooms
});
```

---

### Fetch User ID

```
GET /api/users/:username/id
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  userId: user._id,
})
```

---

## Rooms

### Create Room

```
POST /api/rooms
```

**Access:** Private
**Body:** `{ roomName, roomDescription }`

| Field | Constraints |
|-------|-------------|
| `roomName` | Max 100 chars |
| `roomDescription` | Max 450 chars |

**Success Response:**

```js
res.status(201).json({
  success: true,
  message: `Success! ${newRoom.roomName} has been created and is now active.`,
  newRoom,
});
```

---

### Update Room

```
PUT /api/rooms/:roomId
```

**Access:** Private
**Body:** `{ roomName?, roomDescription? }`
**Socket Event:** `room:updated` → `roomId, payload`

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Room updated successfully.",
  updatedRoom,
});
```

---

### Join Room

```
POST /api/rooms/join
```

**Access:** Public
**Body:** `{ roomCode }`

**Success Response:**

```js
res.status(200).json({
  success: true,
  roomDetails: {
    _id: room._id,
    roomName: room.roomName,
    roomDescription: room.roomDescription,
    roomCode: room.roomCode,
    createdAt: room.createdAt,
  },
});
```

---

### End Room

```
PUT /api/rooms/end
```

**Access:** Private
**Body:** `{ roomId }`
**Socket Event:** `room:ended` → `roomId, { roomId }`

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "The room is now over.",
});
```

---

### Delete Room

```
DELETE /api/rooms/:roomId
```

**Access:** Private
**Body:** `{ userId }`

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: `The ${room.roomName} room has been successfully deleted.`,
  room,
});
```

---

### Fetch Room Details

```
GET /api/rooms/:roomCode
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: `Success! Here's ${room.roomName}'s details.`,
  roomDetails: {
    _id: room._id,
    roomName: room.roomName,
    roomDescription: room.roomDescription,
    roomCode: room.roomCode,
    roomQr: room.roomQr,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    active: room.active,
  },
});
```

---

### Fetch Room Requests

```
GET /api/rooms/:roomCode/fetch/requests
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Requests loaded.",
  data: [
    {
      id: req._id,
      title: req.track.title,
      artist: req.track.artist,
      albumArtUrl: req.track.albumArtUrl,
      spotifyUri: "spotify:track:{id}",
      spotifyLink: "https://open.spotify.com/track/{id}",
      status: req.status,
      votes: req.votes,
      requestedAt: req.createdAt,
      requestedBy: req.requestedBy,
      playedAt: req.playedAt,
    },
  ],
});
```

---

### Fetch Played Requests (Spotify Format)

```
GET /api/rooms/:roomCode/fetch/spotify/played
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  data: [
    {
      id: req._id,
      title: req.track.title,
      artist: req.track.artist,
      albumArtUrl: req.track.albumArtUrl,
      spotifyUri: "spotify:track:{id}",
      spotifyLink: "https://open.spotify.com/track/{id}",
      status: req.status,
      votes: req.votes,
      requestedAt: "12:34 PM", // formatted
      requestedBy: req.requestedBy,
      playedAt: "1:05 PM", // formatted or empty string
    },
  ],
});
```

---

## Spotify

### Search Tracks

```
GET /api/spotify/search?q={query}
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  tracks: [
    {
      id: track.id,
      name: track.name,
      artist: "Artist 1, Artist 2",
      duration_ms: track.duration_ms,
      albumImage: "https://...",
      uri: track.uri,
    },
  ],
});
```

---

### Fetch Track Details

```
GET /api/spotify/tracks/:id
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  track: {
    id: track.id,
    name: track.name,
    artist: "Artist 1, Artist 2",
    album: track.album.name,
    duration_ms: track.duration_ms,
    popularity: track.popularity,
    albumImage: "https://...",
    previewUrl: track.preview_url,
    uri: track.uri,
  },
});
```

---

### Fetch Artist's Top Tracks

```
GET /api/spotify/artists/:id/top-tracks
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  tracks: [
    {
      id: track.id,
      name: track.name,
      album: track.album.name,
      duration_ms: track.duration_ms,
      albumImage: "https://...",
      uri: track.uri,
    },
  ],
});
```

---

## Requests

### Create Request

```
POST /api/requests
```

**Access:** Public
**Body:** `{ track, roomId, requestedBy? }`
**Socket Event:** `request:created` → `roomId, request`

**Success Response:**

```js
res.status(201).json({
  success: true,
  message: `Success! ${request.track.title} has been added to the queue.`,
  request,
});
```

---

### Upvote Request

```
PUT /api/requests/vote
```

**Access:** Public
**Body:** `{ requestId }`
**Socket Event:** `request:updated` → `request.roomId, request`

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: `Your upvote on ${request.track.title} has been counted!`,
  request,
});
```

---

### Mark as Playing

```
PUT /api/requests/:requestId/mark-playing
```

**Access:** Private
**Body:** `{ requestId }`
**Socket Event:** `request:playing` → `request.roomId, request`

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Request marked as playing.",
  request,
});
```

---

### Mark as Played

```
PUT /api/requests/:requestId/mark-played
```

**Access:** Private
**Body:** `{ requestId }`
**Socket Event:** `request:played` → `request.roomId, request`

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Request marked as played.",
  request,
});
```

---

### Remove Request

```
DELETE /api/requests/:requestId/delete
```

**Access:** Private
**Body:** `{ requestId }`
**Socket Event:** `request:deleted` → `roomId, { requestId }`

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Request has been removed.",
});
```

---

### Fetch Room Requests

```
GET /api/requests/:roomId/requests
```

**Access:** Public

> Returns requests sorted by votes (descending).

**Success Response:**

```js
res.status(200).json({
  success: true,
  requests, // array of Request documents
});
```

---

### Fetch Request Details

```
GET /api/requests/:requestId
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  request,
});
```

---

### Filter Requests

```
GET /api/requests/:roomId/filter?status={status}
```

**Access:** Public
**Query:** `status` (optional) — `pending`, `playing`, `played`, `rejected`

> Returns requests sorted by votes (descending).

**Success Response:**

```js
res.status(200).json({
  success: true,
  requests,
});
```

---

## Analytics

### Total Rooms Hosted

```
GET /api/analytics/:userId/total-rooms-hosted
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  roomsHosted,
});
```

---

### Total Requests Received

```
GET /api/analytics/:userId/total-requests-received
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  requestsReceived,
});
```

---

### Total Requests Played

```
GET /api/analytics/:userId/total-requests-played
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  requestsPlayed,
});
```

---

### Most Played Artists

```
GET /api/analytics/:userId/most-played-artists
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  artists: [
    {
      artist: "Artist Name",
      playCount: 12,
    },
  ],
});
```

---

### Most Requested Songs

```
GET /api/analytics/:userId/most-requested-songs
```

**Access:** Private

> Returns up to 10 songs grouped by Spotify track ID and sorted by request count.

**Success Response:**

```js
res.status(200).json({
  success: true,
  songs: [
    {
      spotifyTrackId: "spotify-track-id",
      title: "Song Title",
      artist: "Artist Name",
      albumArtUrl: "https://...",
      spotifyLink: "https://open.spotify.com/track/{id}",
      spotifyURI: "spotify:track:{id}",
      requestCount: 8,
      totalVotes: 21,
      latestRequestedAt: "2024-01-15T10:30:00.000Z",
      latestPlayedAt: null,
    },
  ],
});
```

---

### Most Played Songs

```
GET /api/analytics/:userId/most-played-songs
```

**Access:** Private

> Returns up to 10 played songs grouped by Spotify track ID and sorted by play count.

**Success Response:**

```js
res.status(200).json({
  success: true,
  songs: [
    {
      spotifyTrackId: "spotify-track-id",
      title: "Song Title",
      artist: "Artist Name",
      albumArtUrl: "https://...",
      spotifyLink: "https://open.spotify.com/track/{id}",
      spotifyURI: "spotify:track:{id}",
      requestCount: 5,
      totalVotes: 14,
      latestRequestedAt: "2024-01-15T10:30:00.000Z",
      latestPlayedAt: "2024-01-15T11:05:00.000Z",
    },
  ],
});
```

---

### Most Upvoted Songs

```
GET /api/analytics/:userId/most-upvoted-songs
```

**Access:** Private

> Returns up to 10 songs grouped by Spotify track ID and sorted by total votes.

**Success Response:**

```js
res.status(200).json({
  success: true,
  songs: [
    {
      spotifyTrackId: "spotify-track-id",
      title: "Song Title",
      artist: "Artist Name",
      albumArtUrl: "https://...",
      spotifyLink: "https://open.spotify.com/track/{id}",
      spotifyURI: "spotify:track:{id}",
      requestCount: 4,
      totalVotes: 32,
      latestRequestedAt: "2024-01-15T10:30:00.000Z",
      latestPlayedAt: "2024-01-15T11:05:00.000Z",
    },
  ],
});
```

---

## Global

### Top 10 Most Requested Tracks on Sway

```
GET /api/global/tracks
```

**Access:** Public

***Success Response:**

```js
return res.status(200).json({
            success: true,
            cached: false,
            data: topTracks,
        });
```
---

### Top 10 Most Requested Artists on Sway

```
GET /api/global/artists
```

**Access:** Public

***Success Response:**

```js
return res.status(200).json({
            success: true,
            cached: false,
            data: topArtists,
        });
```
---



### Total Number of Requests Given on Sway

```
GET /api/global/requests
```

**Access:** Public

***Success Response:**

```js
 return res.status(200).json({
                success: true,
                message: `There have been ${totalRequests} songs requested on Sway.`,
                totalRequests: totalRequests,
            });
```
---


### Total Number of Rooms Created on Sway

```
GET /api/global/rooms
```

**Access:** Public

***Success Response:**

```js
return res.status(200).json({
            success: true,
            message: `There have been ${totalRooms} created on Sway.`,
            totalRooms: totalRooms,
        })
```
---

## Exports

### Export Tracklist — JSON

```
GET /api/exports/:roomId/tracklist/json
```

**Access:** Private (played songs only)

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Tracklist exported successfully.",
  tracklist: [
    {
      title: request.track.title,
      artist: request.track.artist,
      playedAt: "12:34 PM",
    },
  ],
});
```

---

### Export Tracklist — CSV

```
GET /api/exports/:roomId/tracklist/csv
```

**Access:** Private (played songs only)
**Response:** CSV file download

---

### Export Tracklist — Plain Text

```
GET /api/exports/:roomId/tracklist/txt
```

**Access:** Private (played songs only)
**Response:** Text file download

---

### Export Requests — JSON

```
GET /api/exports/:roomCode/export/json
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "Requests exported successfully.",
  data: [
    {
      title: req.track.title,
      artist: req.track.artist,
      votes: req.votes,
      status: req.status,
      playedAt: "12:34 PM", // or ""
      requestedAt: "Jan 15, 2024 at 10:30 AM",
      requestedBy: req.requestedBy,
    },
  ],
});
```

---

### Export Requests — CSV

```
GET /api/exports/:roomCode/export/csv
```

**Access:** Public
**Response:** CSV file download

---

### Export Requests — Plain Text

```
GET /api/exports/:roomCode/export/plaintext
```

**Access:** Public
**Response:** Text file download

---

## Server Health

### Root Route

```
GET /
```

**Access:** Public

**Success Response:**

```js
res.status(200).json({
  success: true,
  message: "What are you doing here? This is Sway's API!",
  home: "https://www.sway.onl",
  service: "sway - a DJ's best friend",
  version: "1.0.2",
  development: "https://www.jsmalls.net",
  timestamp: "2024-01-15T10:30:00.000Z",
});
```

---

### Health Check

```
GET /server/health/admin
```

**Access:** Private (admin only)

**Success Response:**

```js
res.status(200).json({
  status: "OK",
  success: true,
  message: "Services are currently up and running.",
  service: "sway - a DJ's best friend",
  version: "1.0.2",
  development: "https://www.jsmalls.net",
  documentation: "https://www.github.com/jordansmalls/sway",
  timestamp: "2024-01-15T10:30:00.000Z",
  environment: "production",
  uptime_raw_seconds: 12345.67,
  uptime_formatted: "3h 25m 45s",
  memory: { rss: 49352704, heapTotal: 18268160, /* ... */ },
  process_version: "v20.10.0",
});
```

---

### 404 Handler

```
ANY /*
```

**Access:** Public

**Response:**

```js
res.status(404).json({
  success: false,
  error: "404 ROUTE NOT FOUND",
  message: "CANNOT GET /unknown-route",
});
```

---

## Socket.IO Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `room:updated` | Server → Client | `{ roomId, ...roomData }` | Room details changed |
| `room:ended` | Server → Client | `{ roomId }` | Room was closed |
| `request:created` | Server → Client | `Request` | New song added to queue |
| `request:updated` | Server → Client | `Request` | Request upvoted |
| `request:playing` | Server → Client | `Request` | Song now playing |
| `request:played` | Server → Client | `Request` | Song finished |
| `request:deleted` | Server → Client | `{ requestId }` | Song removed from queue |


---

# Contact

I'd love to talk about Sway. Feel free to message me on [twitter](https://www.x.com/@jsmallsdev), or send me an [email](mailto:hi@jsmalls.net).

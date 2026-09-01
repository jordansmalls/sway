# Sway Server

The API for Sway. Accounts, rooms, requests, Spotify search, analytics, exports, and isolated public demo.

See the [project overview](../README.md) and [client README](../client/README.md). The complete demo implementation and operational guide is included in [Public demo API](#public-demo-api).

## Installation

Prerequisites: Bun, Node.js 22.12+ on the 22.x line or Node.js 24+ for the test tooling, MongoDB 5.0+ for analytics using `$dateTrunc`, and Spotify app client credentials for live search.

From the repository root:

```bash
cd server
bun install --frozen-lockfile
cp .env.example .env
# Fill in .env using the values described below.
bun run dev
```

Run commands from `server/` so dotenv can load the intended `.env`. The server connects to MongoDB, starts demo cleanup, then listens on port 9999 by default and attaches Socket.IO to the same HTTP server.

| Command | Purpose |
| --- | --- |
| `bun run dev` | Run the TypeScript entry point with Bun's file watcher |
| `bun run start` | Run the server without watch mode |
| `bun run test` | Run Vitest in watch mode |
| `bun run test:run` | Run the API tests once |
| `bun run format` | Run Prettier with writes across the server directory |

There is no server build script. Production startup runs [src/server.ts](src/server.ts) directly with Bun.

## Environment variables

Copy [.env.example](.env.example) to `.env`. Example local values:

```dotenv
PORT=9999
MONGO_URI=mongodb://127.0.0.1:27017/sway
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=development
SPOTIFY_CLIENT_ID=your-spotify-app-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-app-client-secret
FRONTEND_URL=http://localhost:3000
COOKIE_DOMAIN=
```

| Variable | Use |
| --- | --- |
| `PORT` | HTTP and Socket.IO port; defaults to 9999 |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign and verify real-account login tokens |
| `NODE_ENV` | Controls cookie security, proxy handling, and error details; use `development` for local HTTP |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Server-side Spotify app credentials; required for live catalog requests in real and demo rooms |
| `FRONTEND_URL` | Exact frontend origin used by Express CORS, Socket.IO CORS, and real/demo QR codes; omit a trailing slash |
| `COOKIE_DOMAIN` | Optional cookie domain override; omit locally. Production defaults to `.sway.onl` for the `app.sway.onl`/`api.sway.onl` deployment |

There are no additional demo environment variables or shared demo credentials. Seeded demo tracks require no upstream Spotify calls, searching or submitting a new track requires valid Spotify credentials.


### Origins and cookies

The local client runs on port 3000 and proxies `/api` and `/socket.io` to port 9999.

Express and Socket.IO CORS both use the normalized `FRONTEND_URL`. The server defaults to `http://localhost:3000` in development and `https://app.sway.onl` in production, but startup validation requires an explicit value. CORS permits credentials and the demo-specific `X-Demo-Token` header.

Real account auth uses a shared cookie policy for creation and removal: `HttpOnly`, `SameSite=Lax`, path `/`, and a 30 day lifetime. It is `Secure` in production and uses `.sway.onl` by default there; development cookies are insecure and host-only. This supports the same-site `app.sway.onl` and `api.sway.onl` deployment while preserving the existing production cookie scope. Cross-origin requests must include credentials.

Demo requests use `X-Demo-Token`, which is included in the API's allowed headers, instead of login cookies.

## Structure

| Location | Responsibility |
| --- | --- |
| [src/server.ts](src/server.ts) | Database connection, cleanup startup, HTTP listener, and sockets |
| [src/app.ts](src/app.ts) | Express middleware, router registration, demo-token guard, and errors |
| [src/config](src/config/) | Environment configuration, MongoDB, and logging |
| [src/models](src/models/) | User, Room, and Request schemas |
| [src/routes](src/routes/) | Normal API route registration |
| [src/controllers](src/controllers/) | Account, room, request, catalog, analytics, export, and health handlers |
| [src/middlewares](src/middlewares/) | Cookie authentication, error handling, and normal rate limiters |
| [src/demo](src/demo/) | Demo model, seed data, restricted routes, display QR, Spotify cache, and limits |
| [src/socket.ts](src/socket.ts) | Real-room Socket.IO subscriptions and broadcasts |
| [tests](tests/) | Vitest/Supertest integration tests and temporary MongoDB setup |

## Database models

| Model | Important fields and behavior |
| --- | --- |
| [User](src/models/user.model.ts) | Unique email, optional unique username, bcrypt-hashed password, `active`, `hasActiveRoom`, `hasUsername`, `admin`, timestamps |
| [Room](src/models/room.model.ts) | `roomName` (100 characters), `roomDescription` (450), unique room code (up to 5), QR data URL, creator reference, active state, nullable `scheduledAt`, timestamps |
| [Request](src/models/request.model.ts) | Room reference, status, votes, optional requester, `playedAt`, `completedAt`, Spotify metadata, timestamps |
| [DemoSession](src/demo/demo.model.ts) | Separate `demosessions` document containing a synthetic host, room, requests, vote history, token hashes, and fixed expiry |

Usernames accept 3–20 letters, digits, or underscores. Passwords have an 8 character minimum and are hashed before saving. Account “deletion” sets `active=false` and clears the login cookie, it does not purge the user or their room history.

Requests have `pending`, `playing`, `played`, or `rejected` status. Votes start at one. Track metadata includes `spotifyTrackId`, `title`, `artist`, `albumArtUrl`, `spotifyLink`, and `spotifyURI`. Playback transitions maintain timestamps for history and analytics.

Room creation enforces one active room per DJ. Deleting a room removes its requests. The `scheduledAt` field exists, but room creation and automatic scheduled activation are not implemented as a complete scheduling workflow. (coming soon)

## API conventions

Normal endpoints are prefixed with `/api`, health routes are outside that prefix. Send JSON for request bodies.

“Private” below means the route uses the real account JWT middleware. Additional authorization depends on the controller, it does not imply every legacy route performs the same ownership checks. Demo tokens cannot authorize normal routes: [app.ts](src/app.ts) rejects `X-Demo-Token` on non-demo `/api` requests.

Most JSON responses include `success` plus the result key listed below. Common errors use `{ success: false, message }`, sometimes with an additional `error` field. File exports return downloads, and the general rate limiter returns a plain-text error, so clients should not assume every response is JSON.

### Authentication

Prefix: `/api/auth`.

| Method | Path | Access | Input / result |
| --- | --- | --- | --- |
| POST | `/` | Public | `email`, `password`; create an account and set the login cookie |
| POST | `/username` | Private | `username`; finish username onboarding |
| GET | `/username/:username` | Public | Username availability in `taken` |
| GET | `/email/:email` | Public | Email availability in `taken` |
| POST | `/login` | Public | `identifier` (username or email), `password`; set the login cookie |
| POST | `/logout` | Public | Clear the login cookie |

### Users

Prefix: `/api/users`.

| Method | Path | Access | Input / result |
| --- | --- | --- | --- |
| GET | `/me` | Private | Current `user` |
| PUT | `/profile` | Private | Update `username` and/or `email` |
| POST | `/password` | Private | `currentPassword`, `newPassword` |
| DELETE | `/profile` | Private | Deactivate the account and clear its cookie |
| GET | `/:userId/rooms/active` | Public | `activeRoom` |
| GET | `/:userId/has-active-room` | Private | `hasActiveRoom` |
| GET | `/:userId/inactive` | Private | `inactiveRooms`, including `requestsTotal` and `requestsPlayed` for play-rate display |
| GET | `/:username/id` | Public | Resolve a public profile's `userId` |

### Rooms

Prefix: `/api/rooms`.

| Method | Path | Access | Input / result |
| --- | --- | --- | --- |
| POST | `/` | Private | `roomName`, `roomDescription`; returns `newRoom` |
| POST | `/join` | Public | `roomCode`; returns `roomDetails` for an active room |
| PUT | `/end` | Private | `roomId`; end the room |
| GET | `/recent` | Private | `latestRooms`: up to five rooms, active first, then newest |
| GET | `/active/summary` | Private | `activeRoom` with summary metrics, or `null` |
| PUT | `/:roomId` | Private | `roomName` and/or `roomDescription`; returns `updatedRoom` |
| DELETE | `/:roomId` | Private | Requires `userId` in the body; removes the room and its requests |
| GET | `/:roomCode` | Public | `roomDetails` |
| GET | `/:roomCode/fetch/requests` | Public | Normalized queue in `data`, including Spotify links and status |
| GET | `/:roomCode/fetch/spotify/played` | Public | Played tracklist in `data` with formatted request/play times |

The active summary includes `requestsReceived`, `requestsPlayed`, `requestsWaiting`, `totalVotes`, and up to four `recentRequests` inside `activeRoom`. Waiting includes both pending and currently playing requests. These endpoints power the new dashboard experience and recent room sidebar quick glance functionality.

The room display reuses room details and the generated QR code, it does not need a separate normal API endpoint.

### Song requests

Prefix: `/api/requests`.

| Method | Path | Access | Input / result |
| --- | --- | --- | --- |
| POST | `/` | Public | `roomId`, optional `requestedBy`, and `track`; returns `request` |
| PUT | `/vote` | Public | `requestId`; upvote a request |
| PUT | `/:requestId/mark-playing` | Private | Also send `requestId` in the body |
| PUT | `/:requestId/mark-played` | Private | Also send `requestId` in the body |
| DELETE | `/:requestId/delete` | Private | Also send `requestId` in the body |
| GET | `/:roomId/requests` | Public | `requests` ordered by votes |
| GET | `/:requestId` | Public | One `request` |
| GET | `/:roomId/filter?status=pending` | Public | `requests` matching the status |

The normal create handler accepts Spotify search fields `track.id`, `track.name`, `track.artist`, and optional `track.albumImage`. It stores normalized track fields and derived Spotify links. Use the shared client track mapper rather than assuming search and stored track shapes are identical.

Demo submissions instead require `track.spotifyTrackId` and resolve canonical metadata server side. The client mapper supplies the aliases needed by both contracts. This server verification is specific to the demo path, not a guarantee of the legacy normal request handler.

### Spotify

Prefix: `/api/spotify`. These normal routes are public.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/search?q=track+or+artist` | Up to eight normalized `tracks` |
| GET | `/tracks/:id` | One `track` with additional metadata |
| GET | `/artists/:id/top-tracks` | Artist's top `tracks` |

Search results include `id`, `name`, `artist`, `duration_ms`, `albumImage`, and `uri`. The server uses a cached Spotify client credentials access token. No visitor Spotify login, external account connection, or audio playback is involved.

Demo search and track lookup have separate authenticated routes, metadata caching, and additional limits described below.

### User analytics

Prefix: `/api/analytics/:userId`.

| Method | Path | Access | Result |
| --- | --- | --- | --- |
| GET | `/total-rooms-hosted` | Public | `roomsHosted` |
| GET | `/total-requests-received` | Public | `requestsReceived` |
| GET | `/total-requests-played` | Public | `requestsPlayed` |
| GET | `/most-played-artists` | Public | Up to five `artists` |
| GET | `/most-requested-songs` | Public | Up to ten `songs` |
| GET | `/most-played-songs` | Public | Up to ten `songs` |
| GET | `/most-upvoted-songs` | Public | Up to ten `songs` |
| GET | `/request-activity?range=7d` | Private, owner or admin | `range`, `interval`, and activity `data` |

Song rankings include Spotify metadata, `requestCount`, `playCount`, `totalVotes`, `latestRequestedAt`, and `latestPlayedAt`. These support profile/dashboard tables and room recommendations.

Request activity defaults to `30d`; accepted ranges are `7d`, `30d`, `90d`, `6m`, `1y`, and `all`. Daily buckets serve the first three ranges, weekly buckets serve `6m`, monthly buckets serve `1y`, and `all` chooses a granularity based on history length. Buckets use UTC and include zero-count periods. Each item contains `date`, `requestsReceived`, and `requestsPlayed`; received counts use creation time, while played counts use played status and `playedAt`. The dashboard currently requests `7d`.

The other analytics routes are public in the current router, including song rankings. Do not treat them as private account data.

### Global analytics

Prefix: `/api/global`. All routes are public.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/tracks` | Top ten requested tracks in `data` |
| GET | `/tracks/played` | Top five played tracks in `data`, including `playCount` |
| GET | `/artists` | Top ten requested artists in `data` |
| GET | `/requests` | `totalRequests` |
| GET | `/rooms` | `totalRooms` |

Ranking endpoints use a five-day in-process cache and expose a `cached` flag. These are not live rankings. Demo documents do not contribute to real global statistics.

### Exporting data

Prefix: `/api/exports`.

| Method | Registered path | Access | Result |
| --- | --- | --- | --- |
| GET | `/:roomId/tracklist/json` | Private | Played songs in `tracklist` |
| GET | `/:roomId/tracklist/csv` | Private | Played-track CSV download |
| GET | `/:roomId/tracklist/txt` | Private | Played-track text download |
| GET | `/:roomCode/export/json` | Public | Room requests in `data` |
| GET | `/:roomCode/export/txt` | Public | Room-request text download |

Exports require an ended room, and demo exports are unavailable.

Known wiring limitation: [export.routes.ts](src/routes/export.routes.ts) registers the request CSV controller under a second `/export/json` route, so the first JSON handler wins and `/export/csv` is not available. The text route is `/export/txt`, not `/export/plaintext`. The client's generic request file helpers still use the CSV/plaintext paths. The current room history UI exposes request JSON export instead. Played tracklist JSON/CSV/TXT routes are registered separately.

### Server health

| Method | Path | Access | Result |
| --- | --- | --- | --- |
| GET | `/` | Public | Service metadata; not a complete database readiness check |
| GET | `/server/health/admin` | Private, admin | Runtime health statistics |

Unknown routes return 404.

## Public demo API

Visitors start at the client's `/demo` page and choose DJ or Guest. The client creates or resumes a private, 30 minute session and renders the same `RoomAdmin`, `Room`, display, and tracklist components used by real rooms. The visitor can switch roles in the same tab, edit the room, search and request real Spotify songs, vote, manage playback state, end the room, inspect its tracklist, and reset it. Resetting restores the seed without extending expiration.

The API stores the entire sandbox as one document in `demosessions`: a synthetic host, room, requests, vote history, and fixed expiry. It never creates permanent User, Room, or Request documents and therefore does not affect real accounts or global statistics. There is no permanent shared username or password.

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| POST | `/api/demo/session` | None; creation limit applies | Create a session; return `djToken`, `guestToken`, `expiresAt`, `room`, and `user` |
| GET | `/api/demo/session` | `X-Demo-Token` | Fetch current session details |
| POST | `/api/demo/reset` | Either role token | Restore seeds while preserving room identity, tokens, and expiry |
| Various | `/api/demo/api/*` | `X-Demo-Token` | Allowlisted room, request, catalog, and recommendation contracts |

Both random role tokens are intentionally returned to the visitor so they can switch perspectives. Only SHA-256 token hashes are stored. The browser keeps the tokens in session storage with an in-memory fallback, independently of the real login cookie and auth store. It sends the active role token in `X-Demo-Token`; tokens never appear in URLs. A guest token alone cannot edit/end the room or manage playback, but it can request tracks and vote. Both roles can reset their own session.

The allowlist supports room details and recent rooms, request lists/details/filtering, tracklists, room editing/ending, request creation/voting/playback/removal, Spotify search/details, and the recommendation data needed by the shared UI. It does not expose every normal endpoint. Credential changes, signup, external account connections, extra rooms, exports, and public sharing fail closed. A demo token sent to a normal API route is rejected even when the browser also has a valid real-account cookie.

Every request validates fixed expiry and scopes resource lookups to the session. Document version checks reject concurrent lost updates with 409. Missing or malformed tokens return 401; expired or unknown sessions return 410; cross-session resource lookups return 404. Unsupported operations return 403.

### Seeded data and live music

[demo.tracks.ts](src/demo/demo.tracks.ts) holds checked in snapshots of real Spotify tracks with artwork, IDs, and links plus their verification dates. [demo.seed.ts](src/demo/demo.seed.ts) assembles synthetic requests, history, votes, and recommendations. Spotify links work throughout the queue, recommendations, and tracklist. Sway changes request state but does not play audio or connect a visitor's Spotify account.

Recommendations use 19 separately curated tracks across rows of 10 and 9, with sample historical counts such as 203, 331, 98, and 121. For their respective artists. Recommendation counts, initial votes, requesters, and play history are simulated rather than Spotify listening statistics. Queue defaults are maintained separately from recommendations. Existing sessions load changed defaults when reset, not by automatic overwrites.

Live searches reuse the app's shared Spotify search component and the server's client credentials integration, visitors never log into Spotify. Demo submissions validate a 22-character Spotify track ID and resolve titles, artists, and artwork server-side rather than trusting browser metadata. Search queries must contain 2–100 characters.

Demo Spotify results and canonical track metadata have a bounded 500-entry, five-minute server cache with duplicate in-flight requests coalesced. Upstream requests have eight-second timeouts; Spotify 429 responses preserve `Retry-After` and pause new upstream calls for that period. Seed rendering needs no live Spotify access, while search and newly submitted tracks require the existing `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. No demo-specific environment variables are required.

### Demo display and synchronization

The associated display opens at `/demo/room/:roomCode/display` in the same tab to retain its private session. It reuses the real display layout and current room details. Its QR links to `FRONTEND_URL/demo/guest`, where a scanning visitor starts or resumes their own demo rather than gaining access to the displayed room. No token or private room ID is embedded in the QR. The display explains the distinction and provides a path back to the DJ view through the demo controls.

Demo room data refreshes through an isolated React Query cache every five seconds. Catalog queries never poll and use a 1 minute client cache. Demo rooms never join production Socket.IO channels.

Demo URLs are private to the browser session. Sharing a URL or opening it in an unrelated tab does not grant access, that visitor is directed to start their own demo. Closing the tab discards its session-storage access, and expired server data is removed later.

### Expiry, cleanup, and rate limits

| Scope | Limit |
| --- | --- |
| Session lifetime | 30 minutes, including resets |
| Creation | 10 sessions/hour/IP |
| All demo traffic | 240 requests/minute/IP |
| Authenticated traffic | 180 requests/minute/session across both roles |
| Writes and resets | 40 requests/minute/session |
| Search, track details, and song submissions combined | 20 requests/minute/session and 60/minute/IP |
| Upstream Spotify calls | 30 per rolling 30 seconds/server process |
| Stored requests | 60 per demo |
| Voting | One vote per queued request per session |

Endpoint quotas still count cache hits; the upstream quota counts only provider calls. Song submissions cannot bypass the music-endpoint limits.

Expired documents are removed on server startup and every minute. A MongoDB TTL index on `expiresAt` is a backup cleanup mechanism. Authorization checks expiry immediately, regardless of when cleanup runs. Reset never extends the deadline.

Cross-origin deployments must allow `X-Demo-Token`. Do not cache personalized demo responses or log demo-token headers. The rate-limit memory stores, upstream quota guard, and Spotify caches are process-local; multi-replica deployments need shared limits and correctly configured trusted proxy addresses. Do not blindly enable `trust proxy` for arbitrary forwarded addresses.

## Normal API rate limits

The shared general limiter allows 100 requests per two hours per IP. It is mounted on authentication, users, global analytics, exports, and room creation, not every API route. Normal votes have a separate limit of five per 30 seconds per IP.

The normal Spotify router has no dedicated limiter mounted, and the general limiter in the user analytics router is currently commented out. Demo limits are separate and do not harden those normal routes. Review normal endpoint exposure before a public rollout.

## Socket.IO

The server supports WebSocket and polling transports. A client emits `join-room` or `leave-room` with the MongoDB room ID, not the short room code. The channel name is `room-${roomId}`.

| Server event | Payload |
| --- | --- |
| `room:updated` | Room ID and updated name/description |
| `room:ended` | `{ roomId }` |
| `request:created`, `request:updated`, `request:playing`, `request:played` | Request document |
| `request:deleted` | `{ requestId }` |

The client normalizes request events into its query cache. A legacy client `room:update` event is also rebroadcast as `room:updated`. Socket handlers currently have no dedicated authentication/room-authorization layer; do not treat channel membership as private access control.

## Tests

```bash
bun run test:run
```

[vitest.config.ts](vitest.config.ts) runs [tests](tests/) with Supertest and temporary MongoDB instances. Tests cover auth and health behavior, plus demo isolation, role permissions, fixed expiry, cleanup, reset, real-login preservation, voting, playback, room editing/ending, display behavior, Spotify metadata, caching, endpoint/upstream quotas, and provider errors.

Spotify responses are mocked in the demo tests. The normal general/vote limiters are mocked in shared test setup and demo limits have dedicated coverage. A first run may require network access to download a MongoDB binary. Live catalog verification requires working app credentials and is separate from this suite.

For UI verification, run `pnpm build` from `client/` and follow its [build and deployment guidance](../client/README.md#build-and-deployment).

## Deployment notes

The production client is served from `https://app.sway.onl`, and the Railway API and Socket.IO server use `https://api.sway.onl`. They are separate origins, so the client sends credentials and the server allows the exact frontend origin through both CORS configurations.

Connect Railway to the monorepo with `/server` as the root directory, `/server/**` as its watch path, and `bun run start` as its start command. Railway supplies `PORT`; configure `/` as the initial health-check path. The server validates its required variables before connecting to MongoDB.

Configure these production variables in Railway rather than committing an environment file:

```dotenv
NODE_ENV=production
MONGO_URI=your-production-mongodb-uri
JWT_SECRET=your-existing-production-signing-secret
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
FRONTEND_URL=https://app.sway.onl
```

`COOKIE_DOMAIN` is optional in this deployment because production defaults to `.sway.onl`. Preserve the existing `JWT_SECRET` and `MONGO_URI` during migration if existing sessions and data should remain valid. The server trusts exactly one production proxy hop for Railway's forwarded client IPs; do not broaden this to arbitrary proxy chains.

Keep one Railway replica until Socket.IO has a multi-instance adapter and the process-local rate limits and caches have shared backing stores. Preserve the `X-Demo-Token` request header through any additional proxy or CDN layer.

## Contact

Message [@jsmallsdev](https://www.x.com/jsmallsdev) or email [hi@jsmalls.net](mailto:hi@jsmalls.net).

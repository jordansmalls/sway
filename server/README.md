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
| `bun run typecheck` | Run the full TypeScript check, which still reports existing errors |
| `bun run typecheck:check` | Fail if the TypeScript error count exceeds the checked-in baseline |
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
| `FRONTEND_URL` | Exact frontend origin used by Express CORS and Socket.IO CORS; omit a trailing slash. QR codes always use `https://app.sway.onl`. |
| `LOG_LEVEL` | Optional pino level (`debug`, `info`, `warn`, `error`). Defaults to `info`, and to `silent` under tests |
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
| [src/server.ts](src/server.ts) | Database connection, index builds, cleanup startup, HTTP listener, sockets, and signal handling |
| [src/shutdown.ts](src/shutdown.ts) | Graceful shutdown on `SIGTERM`/`SIGINT` |
| [src/app.ts](src/app.ts) | Express middleware, router registration, demo-token guard, and errors |
| [src/config](src/config/) | Environment configuration, MongoDB, and logging |
| [src/models](src/models/) | User, Room, and Request schemas |
| [src/routes](src/routes/) | Normal API route registration |
| [src/controllers](src/controllers/) | Account, room, request, catalog, analytics, export, and health handlers |
| [src/middlewares](src/middlewares/) | Cookie authentication, error handling, and normal rate limiters |
| [src/demo](src/demo/) | Demo model, seed data, restricted routes, display QR, Spotify cache, and limits |
| [src/socket.ts](src/socket.ts) | Real-room Socket.IO subscriptions and broadcasts |
| [tests](tests/) | Vitest/Supertest integration tests and temporary MongoDB setup |
| [scripts](scripts/) | Data repairs and index migrations, plus the TypeScript error guard |
| [load](load/) | Artillery load test and a post-run consistency check |

## Database models

| Model | Important fields and behavior |
| --- | --- |
| [User](src/models/user.model.ts) | Unique email, optional unique username, bcrypt-hashed password, `active`, `hasActiveRoom`, `hasUsername`, `admin`, timestamps |
| [Room](src/models/room.model.ts) | `roomName` (100 characters), `roomDescription` (450), unique room code (up to 5), QR data URL, creator reference, active state, nullable `scheduledAt`, timestamps |
| [Request](src/models/request.model.ts) | Room reference, status, votes, optional requester, `playedAt`, `completedAt`, Spotify metadata, timestamps |
| [DemoSession](src/demo/demo.model.ts) | Separate `demosessions` document containing a synthetic host, room, requests, vote history, token hashes, and fixed expiry |

Usernames accept 3–20 letters, digits, or underscores. Passwords have an 8 character minimum and are hashed before saving. Account “deletion” sets `active=false` and clears the login cookie, it does not purge the user or their room history.

Requests have `pending`, `playing`, `played`, or `rejected` status. Votes start at one. Track metadata includes `spotifyTrackId`, `title`, `artist`, `albumArtUrl`, `spotifyLink`, and `spotifyURI`. Playback transitions maintain timestamps for history and analytics.

The partial unique index `one_active_room_per_creator` enforces one active room per DJ, so concurrent creates get a `409` instead of a second room. Ending a room is a single conditional update. `hasActiveRoom` in API responses is computed from the rooms collection; the stored `User.hasActiveRoom` field is no longer written. Deleting a room removes its requests. The `scheduledAt` field exists, but room creation and automatic scheduled activation are not implemented as a complete scheduling workflow. (coming soon)

## API conventions

Normal endpoints are prefixed with `/api`, health routes are outside that prefix. Send JSON for request bodies.

“Private” below means the route uses the real account JWT middleware. Additional authorization depends on the controller, it does not imply every legacy route performs the same ownership checks. Demo tokens cannot authorize normal routes: [app.ts](src/app.ts) rejects `X-Demo-Token` on non-demo `/api` requests.

Most JSON responses include `success` plus the result key listed below. Common errors use `{ success: false, message }`, sometimes with an additional `error` field. File exports return downloads, and the vote limiter returns a plain-text error, so clients should not assume every response is JSON. The other limiters return the JSON error shape with status `429`.

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
| PUT | `/profile` | Private | Update `username` and/or `email`. Changing the email also requires `currentPassword` |
| POST | `/password` | Private | `currentPassword`, `newPassword` |
| DELETE | `/profile` | Private | Deactivate the account and clear its cookie |
| GET | `/:userId/rooms/active` | Public | `activeRoom` |
| GET | `/:userId/has-active-room` | Private | `hasActiveRoom` |
| GET | `/:userId/inactive` | Private, owner only | `inactiveRooms`, including `requestsTotal` and `requestsPlayed` for play-rate display |
| GET | `/:username/id` | Public | Resolve a public profile's `userId` |

### Rooms

Prefix: `/api/rooms`.

| Method | Path | Access | Input / result |
| --- | --- | --- | --- |
| POST | `/` | Private | `roomName`, `roomDescription`; returns `newRoom`, or `409` if the DJ already has an active room |
| POST | `/join` | Public | `roomCode`; returns `roomDetails` for an active room |
| PUT | `/end` | Private, owner only | `roomId`; end the room. `400` malformed ID, `403` another DJ's room, `404` missing, `409` already ended |
| GET | `/recent` | Private | `latestRooms`: up to five rooms, active first, then newest |
| GET | `/active/summary` | Private | `activeRoom` with summary metrics, or `null` |
| PUT | `/:roomId` | Private | `roomName` and/or `roomDescription`; returns `updatedRoom` |
| DELETE | `/:roomId` | Private, owner only | Removes the room and its requests; no body required |
| GET | `/:roomCode` | Public | `roomDetails` |
| GET | `/:roomCode/fetch/requests` | Public | Normalized queue in `data`, including Spotify links and status |
| GET | `/:roomCode/fetch/spotify/played` | Public | Played tracklist in `data` with formatted request/play times |

The active summary includes `requestsReceived`, `requestsPlayed`, `requestsWaiting`, `totalVotes`, and up to four `recentRequests` inside `activeRoom`. Waiting includes both pending and currently playing requests. These endpoints power the new dashboard experience and recent room sidebar quick glance functionality.

The room display reuses room details and the generated QR code, it does not need a separate normal API endpoint. Room details generate a fresh QR linking to `https://app.sway.onl/room/{roomCode}`, including for rooms with old stored localhost QR images.

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

The normal create handler accepts Spotify search fields `track.id`, `track.name`, `track.artist`, and optional `track.albumImage`. It stores normalized track fields and derived Spotify links. Use the shared client track mapper rather than assuming search and stored track shapes are identical. New requests, duplicate submissions, and votes return 409 after the room has ended. A room holds at most 200 pending requests, and each guest at most 5. The 5-request cap and the guest rate limits don't apply when the signed-in DJ adds to their own room, for example from the recommendations panel.

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
| GET | `/:roomId/tracklist/json` | Private, room owner | Played songs in `tracklist` |
| GET | `/:roomId/tracklist/csv` | Private, room owner | Played-track CSV download |
| GET | `/:roomId/tracklist/txt` | Private, room owner | Played-track text download |
| GET | `/:roomCode/export/json` | Private, room owner | Room requests in `data` |
| GET | `/:roomCode/export/csv` | Private, room owner | Room-request CSV download |
| GET | `/:roomCode/export/txt` | Private, room owner | Room-request text download |

Exports require an ended room, and demo exports are unavailable.

Guests receive 401 and other DJs receive 403. CSV exports quote every field and prefix formula-like or leading control-character text with an apostrophe. JSON and text exports preserve the original text. The current room history UI exposes request JSON export; the file helpers also support CSV and TXT.

### Server health

| Method | Path | Access | Result |
| --- | --- | --- | --- |
| GET | `/` | Public | Service metadata; not a complete database readiness check |
| GET | `/health/ready` | Public | `200` when MongoDB is connected (`readyState === 1`), `503` otherwise or once shutdown has started |
| GET | `/server/health/admin` | Private, admin | Runtime health statistics |

Unknown routes return 404.

On `SIGTERM` (Railway sends one on every deploy) or `SIGINT`, the server shuts down gracefully ([shutdown.ts](src/shutdown.ts)). Readiness switches to `503` first. Then the server stops accepting connections and closes Socket.IO connections; clients reconnect and refetch. In-flight requests get up to 10 seconds to finish, and any still open after that are closed. Finally the server disconnects from MongoDB and exits.

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

The associated display opens at `/demo/room/:roomCode/display` in the same tab to retain its private session. It reuses the real display layout and current room details. Its QR links to `https://app.sway.onl/demo/guest`, where a scanning visitor starts or resumes their own demo rather than gaining access to the displayed room. No token or private room ID is embedded in the QR. The display explains the distinction and provides a path back to the DJ view through the demo controls.

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

## Password reset

The login page links to `/forgot-password`. A DJ enters their account email, opens the emailed `/reset-password#token=...` link, chooses and confirms a new password, then logs in normally. Reset pages remain accessible when a browser already has a session.

`POST /api/auth/forgot-password` accepts `{ "email": "dj@example.com" }`. For any valid email address it immediately returns the same `200` response before account lookup or email delivery. Unknown and disabled accounts receive no email. Delivery failures are logged with a request ID and a safe error code, without provider payloads, email addresses, or tokens.

`POST /api/auth/reset-password` accepts `{ "token": "<emailed token>", "newPassword": "<at least 8 characters>" }`. A successful reset hashes the password, consumes all outstanding email tokens, increments the account's session version, and clears the browser's auth cookie. Existing login cookies stop working. It sends a separate password-change notification and does not log the DJ in automatically. A notification failure does not undo the reset.

Reset tokens contain 32 random bytes. Only a SHA-256 digest is stored, bound to the action, account email, and session version. Links expire after 30 minutes, with expiry checked on use. Tokens are embedded in the user document so password replacement, token consumption, and session revocation share one atomic write, including under concurrent reset requests. Password, email, and account-state changes also clear pending tokens. The token field is excluded from normal user queries.

The shared [token helpers](src/services/email-token.ts), [token schema](src/models/email-token.schema.ts), and [email transport](src/services/email.ts) can support signup and email-change verification later. Only password reset is implemented here.

Links use the configured `FRONTEND_URL`, never a request's Host or Origin header. The token is in the URL fragment, so it does not reach the client host or appear in HTTP referrers. The client submits it in a JSON request body to the API. Request bodies and provider responses must stay out of logs.

A database-backed one-minute send cooldown prevents overlapping requests from flooding one inbox. A replacement link retires older links only after Resend accepts the email. If sending fails, its token is removed and any previously delivered link remains usable. Limiters also allow three requests per normalized email per 15 minutes across IPs, and 20 requests per network per 15 minutes across accounts. Reset completion has its own 20-attempt network budget, separate from link requests and normal login.

### Resend configuration

The code and tests work without a Resend account. To enable actual delivery later, verify `sway.onl` or a sending subdomain in Resend and configure these Railway variables:

```dotenv
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL="Sway <no-reply@sway.onl>"
FRONTEND_URL=https://app.sway.onl
```

The sender defaults to `Sway <no-reply@sway.onl>`. Override it if you verify a subdomain instead. `FRONTEND_URL` must be an HTTP(S) origin without a path or query, with HTTPS required for production email links. Sending uses the [Resend Email API](https://resend.com/docs/api-reference/emails/send-email) with a ten-second timeout.

Resend settings are optional at server startup so account and domain setup can follow the implementation. Without an API key, ordinary login still works; reset requests keep the generic response and log `not-configured`. Request acknowledgement does not guarantee inbox delivery. Email work runs in the API process after the response; a process shutdown can interrupt it, and the DJ can request a new link.

[password-reset.test.ts](tests/password-reset.test.ts) mocks Resend's HTTP boundary and covers delivery, validation, expiry, single use, simultaneous consumption, resend failures, legacy accounts, session revocation, and safe error handling. The real reset rate limiters are covered in [rate-limits.test.ts](tests/rate-limits.test.ts).

## Normal API rate limits

Limits are split by audience ([rate-limiters](src/middlewares/rate-limiters/)). All of them use process-local memory, which resets on deploy. That is fine for a single instance.

| Limiter | Routes | Key | Limit |
| --- | --- | --- | --- |
| Credentials | `POST /api/auth` (signup), `POST /api/auth/login` | IP plus the lowercased account the route uses (`email` for signup, `identifier` for login), with a separate budget per route | 10 per 15 minutes |
| Credential IP ceiling | The same two routes | IP | 50 per 15 minutes, so rotating emails can't get around the first limit |
| Reset email requests | `POST /api/auth/forgot-password` | Normalized email across IPs, plus IP across accounts | 3 per email and 20 per IP per 15 minutes, plus a database-backed one-minute send cooldown |
| Reset completion | `POST /api/auth/reset-password` | IP | 20 per 15 minutes, with a separate budget from email requests and login |
| DJ | Every authenticated route under `/api/auth`, `/api/users`, `/api/rooms`, `/api/exports`, and `/api/analytics/:userId/request-activity`, plus `POST /api/requests` when the signed-in DJ adds to their own room | User ID (mounted after `protect`) | 600 per 15 minutes per DJ, so a long set with focus refetches never locks a DJ out, and DJs sharing a venue IP don't share a budget |
| Public reads | Global analytics, public profile analytics, public user lookups, username/email availability | IP | 300 per 15 minutes, shared across those routes |
| Guest writes | `POST /api/requests` and `PUT /api/requests/vote`, one shared budget | `sway_guest` cookie | 30 per minute per guest. Skipped for the room's own DJ, who gets the DJ budget instead |
| Guest write IP ceiling | The same two routes | IP | 300 per minute, high enough for venue Wi-Fi, so clearing cookies can't get around the first limit |
| Spotify catalog | Every route under `/api/spotify` (search, track, artist top tracks), one shared budget | `sway_guest` cookie | 60 per minute per guest. Search is also debounced on the client and cached on the server for five minutes |
| Spotify IP ceiling | The same routes | IP | 1,200 per minute |

Guest room reads (`/api/rooms/join`, `/api/rooms/:roomCode/...`, request lists) have no limiter: a venue's Wi-Fi can put every guest behind one IP. Demo limits are separate and do not cover these normal routes.

## Logging

[logger.ts](src/config/logger.ts) writes one JSON line per event to stdout with [pino](https://getpino.io). Railway's log explorer can filter on any field.

- **Requests:** [pino-http](https://github.com/pinojs/pino-http) logs one line per response, with method, URL, status, and `responseTime`. 5xx responses log at `error`, 4xx at `warn`, and everything else at `info`.
- **Request IDs:** every response carries `X-Request-Id`. A well-formed incoming `X-Request-Id` is reused; otherwise the server generates a UUID. The ID appears as `req.id`, and controller logs written with `req.log` carry it too.
- **Room and user context:** mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`) add `userId` for authenticated DJs and `roomId` from the route, the body, or the room the controller resolved (new rooms, and votes and DJ request actions whose URL only carries a request ID). To answer "what happened in room X at 22:14?", filter on `roomId` and the time.
- **Redaction:** `cookie`, `authorization`, and `Set-Cookie` headers are replaced with `[Redacted]`.
- **Errors:** controllers log caught errors with `req.log.error({ err }, ...)`. Unhandled errors reach the error middleware, which attaches them to the request's completion line, so each one is logged once with its stack. Spotify failures log only the endpoint, upstream status and error code, never Axios request headers. Code outside a request, such as the Spotify token fetch and demo cleanup, uses the shared `logger`. Nothing in `src/` uses `console.*`.

## Socket.IO

The server supports WebSocket and polling transports. A client emits `join-room` or `leave-room` with the MongoDB room ID, not the short room code. The channel name is `room-${roomId}`.

| Server event | Payload |
| --- | --- |
| `room:updated` | Room ID and updated name/description |
| `room:ended` | `{ roomId }` |
| `request:created`, `request:updated`, `request:playing`, `request:played` | Request document |
| `request:deleted` | `{ requestId }` |

The client normalizes request events into its query cache. Client-sent events other than `join-room` and `leave-room` are ignored. [socket.test.ts](tests/socket.test.ts) checks that a forged `room:update` broadcasts nothing.

### Threat model: `join-room` is public on purpose

Any client can join any room's channel by its ID without logging in. That is deliberate. Guests join without accounts, and every event broadcast to a room carries data that is already public through REST (`GET /api/requests/:roomId/requests`, `GET /api/rooms/:roomCode`). Joining a channel grants read access to that public data and nothing else:

- Clients cannot broadcast. Every state change goes through an authorized REST endpoint, and only server controllers emit room events.
- `join-room` and `leave-room` accept only a 24-character hex ID, so a client cannot subscribe to arbitrary channel names.
- Room IDs are not secrets. Do not put private data, such as guest contact details or DJ-only state, into room broadcasts.

Revisit this before adding a DJ-only realtime event. That event needs socket authentication, using the `jwt` cookie at handshake, and a separate owner-only channel.

## Load testing

[load/guests.yml](load/guests.yml) is an [Artillery](https://www.artillery.io/) scenario for one live room. Each virtual user is a guest's phone: it holds a Socket.IO subscription to the room, joins over HTTP, and loads the queue. It then searches, submits and votes five times, about 8 seconds apart. It only votes after a successful submission (`200` or `201`). A `409` or `429` rejection skips that round's vote ([load/processor.cjs](load/processor.cjs)). The run has three phases:

1. 150 guests arrive over two minutes.
2. A 10 second burst adds 150 more, like a room reacting to a drop.
3. Two minutes of steady traffic.

The run fails if HTTP p95 exceeds 500 ms, p99 exceeds 1.5 s, or more than 1% of requests error. Expected policy responses don't count as errors: `409` (ended room, queue caps) and `429` (limits).

Run it against **staging only, never production**. It creates real requests and votes in the target room. Every search also calls Spotify with the target's credentials (about 1,500 searches per run), so use a staging Spotify app.

1. On staging, create a DJ account and an active room. Note its room code and its ID (the `_id` from `GET /api/rooms/:roomCode`).
2. Run the scenario from `server/`:
   ```bash
   TARGET=https://<staging-api> ROOM_CODE=<code> ROOM_ID=<id> \
     npx artillery@latest run load/guests.yml --output load/report.json
   npx artillery@latest report load/report.json   # HTML report
   ```
3. While it runs, play the DJ in the staging dashboard: mark tracks playing and played, so broadcasts fan out to every socket. Watch the Railway CPU and memory graphs and the `error`-level logs.
4. Afterwards, check the database state (read-only):
   ```bash
   MONGO_URI=<staging uri> bun run load/check-consistency.ts <roomId>
   ```
   It fails if the room doesn't exist in that database, more than one request is playing, a track is queued twice, any vote count is negative, any DJ has two active rooms, or (once the `votes` collection exists) vote counts differ from their `Vote` documents.

Check these in the Artillery summary:
- `http.response_time` p95 and p99 per endpoint (`metrics-by-endpoint`).
- `vusers.failed` and `errors.*`.
- `socketio.emit` and `engine.socketio` counters, to confirm every virtual user kept its socket.

Each virtual user keeps its own `sway_guest` cookie, so the per-guest limits behave as they would at a venue. All virtual users share the load generator's IP, though, so the per-IP ceilings (300 guest writes and 1,200 Spotify calls per minute) apply to the whole run. The resulting `429`s are expected, and their volume shows how close a busy venue on one Wi-Fi network would come to those ceilings.

## Tests

```bash
bun run test:run
```

[vitest.config.ts](vitest.config.ts) runs [tests](tests/) with Supertest and temporary MongoDB instances. Tests cover auth and health behavior, plus demo isolation, role permissions, fixed expiry, cleanup, reset, real-login preservation, voting, playback, room editing/ending, display behavior, Spotify metadata, caching, endpoint/upstream quotas, and provider errors.

Spotify responses are mocked in the demo tests. The normal limiters are mocked in shared test setup. [rate-limits.test.ts](tests/rate-limits.test.ts) and [authz-sweep.test.ts](tests/authz-sweep.test.ts) run the real credential, DJ, and public-read limiters, and [guest-write-limits.test.ts](tests/guest-write-limits.test.ts) enables the real guest-write limiters on the real app. It checks the shared per-guest budget across votes and submissions, the network ceiling, database effects, and broadcasts. [spotify-limits.test.ts](tests/spotify-limits.test.ts) does the same for the Spotify catalog limiters. [guest-votes.test.ts](tests/guest-votes.test.ts) covers one vote per guest per request under concurrent calls. Demo limits have separate coverage. A first run may require network access to download a MongoDB binary. Live catalog verification requires working app credentials and is separate from this suite.

For UI verification, run `pnpm build` from `client/` and follow its [build and deployment guidance](../client/README.md#build-and-deployment).

### CI and TypeScript debt

[CI](../.github/workflows/ci.yml) installs frozen lockfiles and runs the server tests and `bun run typecheck:check`, plus client lint, build, and unit tests. Dependency audits report findings without blocking these checks.

The server's full typecheck still reports existing semantic errors. The guard in [scripts/check-typecheck.ts](scripts/check-typecheck.ts) counts TypeScript diagnostic objects and compares the count with [typecheck-baseline.json](typecheck-baseline.json). Compiler, configuration, syntax, and global failures always fail the guard. It forces semantic checking even if `noCheck` is enabled. Twelve CLI integration tests verify the guard against isolated project fixtures. Fix new diagnostics instead of increasing `maxErrors`. When a change reduces the count, lower the baseline to preserve that improvement. At zero, any TypeScript error fails CI.

## Deployment notes

The production client is served from `https://app.sway.onl`, and the Railway API and Socket.IO server use `https://api.sway.onl`. They are separate origins, so the client sends credentials and the server allows the exact frontend origin through both CORS configurations.

Connect Railway to the monorepo with `/server` as the root directory, `/server/**` as its watch path, and `bun run start` as its start command. Railway supplies `PORT`. Set the service's healthcheck path to `/health/ready` (Settings → Deploy → Healthcheck Path), so a new deployment only receives traffic once MongoDB is connected. The server validates its required variables before connecting to MongoDB.

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

Before deploying the one-active-room index, end duplicate active rooms. The server runs `Room.init()` at boot and will not start while a DJ has two active rooms:

```bash
bun run scripts/repair-active-rooms.ts          # dry run: counts the rooms it would end
bun run scripts/repair-active-rooms.ts --apply  # ends all but each DJ's newest active room, then builds the index
```

Stop the old server, for example by scaling the service to zero, before running `--apply`, and only resume traffic when the new server starts. While the old code is still serving, a create can add a duplicate after the repair reads its snapshot, and then the index build fails. If that happens, run `--apply` again. It is safe to repeat.

### Deploy checklist

1. **Environment.** `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (keep the existing one so sessions stay valid), `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `FRONTEND_URL=https://app.sway.onl`. Optional: `COOKIE_DOMAIN` (defaults to `.sway.onl`) and `LOG_LEVEL` (defaults to `info`). The server refuses to start if a required variable is missing.
2. **Railway settings.** Set the healthcheck path to `/health/ready`, run one replica, set the start command to `bun run start`, and set the root directory to `/server`.
3. **Index repairs, before deploying code that adds the indexes.** Each script is a dry run by default and changes data only with `--apply`. Run the dry run, read the output, then stop the old server (scale the service to zero) and apply, so no write races the repair. The server calls `Request.init()` and `Room.init()` at boot and won't start while duplicates block an index. Run them in this order:
   1. `bun run scripts/repair-playing.ts` (from the Phase 1.1 work) demotes all but the newest `playing` request per room, for `one_playing_per_room`.
   2. `bun run scripts/repair-active-rooms.ts` ends all but each DJ's newest active room, for `one_active_room_per_creator`.
   3. `bun run scripts/recount-votes.ts --since <guest-vote rollout ISO time>` (from the Phase 1.3 work) recalculates `votes` from the `Vote` collection for requests created after that time. Older requests have no `Vote` rows and keep their totals. Run it when a crash between a vote insert and its counter update could have left counts off by one. It's a dry run unless you add `--apply`, and guest writes must be stopped first.

   `scripts/merge-duplicate-requests.ts` is the older repair for `unique_active_track_per_room`. You only need it if `Request.init()` reports duplicate active tracks.
4. **Deploy**, then confirm `GET /health/ready` returns `200` and the logs show `Server is live`.
5. **Smoke test** on production with a throwaway room:
   1. As a DJ, create a room. Only one active room is allowed, so end any open one first.
   2. Open the room link on a phone (not logged in) and join it.
   3. Submit a track from the phone, then vote on another request. The DJ dashboard should update live without a refresh.
   4. As the DJ, mark a request playing, then played. The phone should show the change live.
   5. End the room, then export its requests (JSON, CSV, TXT) and tracklist from room history. Each should download, and the guest's submission should be in it.
   6. Delete the throwaway room.

Keep one Railway replica until Socket.IO has a multi-instance adapter and the process-local rate limits and caches have shared backing stores. Preserve the `X-Demo-Token` request header through any additional proxy or CDN layer.

## Contact

Message [@jsmallsdev](https://www.x.com/jsmallsdev) or email [hi@jsmalls.net](mailto:hi@jsmalls.net).

# Sway Client

The frontend for Sway. Dashboard, live rooms, public profiles, and a signup free demo. The real and demo experiences share room components so their layout and interactions stay consistent.

See the [project overview](../README.md), [server API documentation](../server/README.md), and [server demo documentation](../server/README.md#public-demo-api).

## Installation

Use Node.js 22.12+ on the 22.x line or Node.js 24+ and pnpm. The client has its own `pnpm-lock.yaml`.

From the repository root:

```bash
cd client
pnpm install --frozen-lockfile
pnpm dev
```

Start the [server](../server/README.md#installation) in a separate terminal. The client runs at [localhost:3000](http://localhost:3000). In development, [vite.config.ts](vite.config.ts) proxies `/api` and `/socket.io` to `http://localhost:9999`, including WebSocket connections.

No client environment file is required for the default local setup. If you change the API port, update the Vite proxy targets or configure explicit origins. Copy [.env.example](.env.example) to an ignored mode-specific file only when you need overrides.

### Optional environment variables

These variables are public, build-time configuration. They can be set in an uncommitted `client/.env.local` or in Netlify's environment settings.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Empty string, using the current origin | API origin, for example `http://localhost:9999`; omit the `/api` suffix |
| `VITE_SOCKET_URL` | `VITE_API_URL`, then the browser origin | Socket.IO server origin |

Never put Spotify credentials, JWT secrets, or demo tokens in `VITE_*` variables. The server holds Spotify app credentials.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start Vite on port 3000 |
| `pnpm build` | Run `tsc -b` and create a production build in `dist/` |
| `pnpm lint` | Run ESLint |
| `pnpm preview` | Preview the production build; configure API/socket access separately |

There is no client test script currently. Demo API integration tests live in [server/tests](../server/tests/).

## Current interface

- **Dashboard:** account totals, an active room summary, recent requests, a 7 day received/played activity chart, play conversion, and personal/global song statistics.
- **Insights:** additional request, play, vote, and artist analytics.
- **Navigation:** a responsive sidebar with recent rooms, account controls, and a shared app layout.
- **Room admin:** edit details, request songs, manage the queue, view recommendations, open the room display, share a real room, and end the event.
- **Guest room:** Spotify search, requests, votes, Now Playing, and access to the played tracklist without signup.
- **Room display:** room information and a large join QR code, with a corresponding private demo display.
- **Room history:** search, pagination, status, request/play counts, play-rate progress, room editing/deletion, played-tracklist exports, and request JSON export.
- **Profile and settings:** public music statistics, username/email/password management, account deactivation, light/dark/system theme, and six toast-position options.


Recommended tracks use personal insights and global play history data. Real rooms display up to five tracks per row and demos show a full curated set of 19 tracks with fake play counts.

## Routes

Routes and guards are defined in [src/routes/index.tsx](src/routes/index.tsx).

| Route | View and access |
| --- | --- |
| `/`, `/login`, `/signup` | Onboarding. public-only guard |
| `/username` | Authenticated username onboarding |
| `/dashboard` | Current authenticated dashboard |
| `/dashboard-test` | Redirect to `/dashboard` |
| `/insights` | Authenticated analytics view |
| `/create-room`, `/past-rooms`, `/settings` | Authenticated room/account pages |
| `/room/admin/:roomCode` | Authenticated DJ room |
| `/join-room`, `/room/:roomCode` | Public join and guest room |
| `/room/:roomCode/display` | Public real-room display |
| `/:roomCode/tracklist` | Public played tracklist |
| `/:username` | Public profile |
| `/demo` | Demo landing page |
| `/demo/dj`, `/demo/guest` | Create or resume a private demo in the selected role |
| `/demo/room/admin/:roomCode` | Demo DJ view |
| `/demo/room/:roomCode` | Demo guest view |
| `/demo/room/:roomCode/display` | Associated demo display |
| `/demo/:roomCode/tracklist` | Demo played tracklist |
| `/not-room-owner`, `/room-ended` | Room access/end states |
| `/terms-and-conditions`, `/privacy-policy` | Legal pages |

[Dashboard.tsx](src/pages/Dashboard.tsx) implements `/dashboard`, and [Insights.tsx](src/pages/Insights.tsx) implements the analytics view at `/insights`.

## Demo experience

[DemoExperience.tsx](src/pages/DemoExperience.tsx) wraps the shared room pages with role switching, reset/exit controls, sample data labeling, and expiration handling.

- Sessions last 30 minutes. Reset restores the seed without extending the deadline.
- DJ and guest tokens live in browser session storage with a memory fallback. They are separate from the real auth cookie and Zustand auth state.
- On demo paths, [the API client](src/api/client.ts) rewrites `/api/...` to `/api/demo/api/...` and authenticates with `X-Demo-Token` rather than real login state. Cross-origin cookie credentials are disabled, any same-origin login cookie is not used to authorize demo access. Missing or expired sessions do not fall through to real APIs.
- Demo pages use a separate TanStack Query client, refreshing room data every five seconds. They do not join real room Socket.IO channels.
- Spotify search uses the same component as real rooms. Demo searches are debounced for 500ms, require at least two characters, and use server limited live catalog endpoints. Catalog queries cache for one minute without polling or automatic retries.
- The Display button opens the associated demo display in the same tab. Its QR code goes to `/demo/guest`, starting or resuming the scanning browser's own demo rather than sharing the displayed session.
- Settings, credential changes, external connections, extra room creation, exports, and public sharing are unavailable. Demo links alone do not grant another visitor access.

Seeded tracks use real Spotify metadata. Votes, requesters, play history, and recommendation counts are simulated. The default queue and curated recommendations are maintained separately in [demo.tracks.ts](../server/src/demo/demo.tracks.ts); [demo.seed.ts](../server/src/demo/demo.seed.ts) assembles the room state. Reset an existing demo after queue seed changes.

Read the [server demo documentation](../server/README.md#public-demo-api) before changing demo routing, authentication, search, or session behavior.

## Source structure and data flow

| Location | Responsibility |
| --- | --- |
| [src/api](src/api/) | Typed API wrappers, query hooks, and mutation invalidation |
| [src/routes](src/routes/) | Page routing and authentication guards |
| [src/pages](src/pages/) | Dashboard, room, profile, auth, and demo pages |
| [src/components/rooms](src/components/rooms/) | Shared queues, Now Playing, search, recommendations, and room controls |
| [src/components/demo](src/components/demo/) | Demo specific controls and notices |
| [src/components/sidebar](src/components/sidebar/) | Shared app layout and navigation |
| [src/components/ui](src/components/ui/) | Local shadcn/ui components |
| [src/registry/magicui](src/registry/magicui/) | Text animation, highlighter, marquee, and other visual primitives |
| [src/lib/demo-session.ts](src/lib/demo-session.ts) | Temporary demo storage, roles, and scoped URLs |
| [src/lib/query-client.ts](src/lib/query-client.ts) | Normal app query defaults |
| [src/lib/socket.ts](src/lib/socket.ts) | Room subscriptions and live cache synchronization |

Normal requests use cookie credentials. Real room Socket.IO events update or invalidate query data, while auth state is managed with Zustand. Keep demo navigation and API calls behind the existing helpers to preserve isolation.

The interface uses React 19, TypeScript, Vite 8, React Router 7, TanStack Query, Zustand, Axios, Tailwind CSS 4, shadcn/ui/Radix UI, Recharts, Socket.IO, Sonner, and DM Sans. Motion and local Magic UI components provide entry, hover, and accent animations. Theme and toast-position preferences persist locally.

## Build and deployment

1. Set any public API/socket origins before running `pnpm build`.
2. Serve `dist/` as static files. The checked-in [public/_redirects](public/_redirects) supplies Netlify's `index.html` fallback for browser routes, including deep room and demo links.
3. Route `/api` and `/socket.io` to the server if using the same origin; support WebSocket upgrades. Vite's development proxy does not configure your production host.
4. If using separate origins, set the server's `FRONTEND_URL` to the exact client origin. Express and Socket.IO use that value for credentialed CORS.
5. Keep demo responses private and uncached, and preserve the `X-Demo-Token` header through proxies.

For the current Netlify deployment, use `client` as the base directory, `pnpm build` as the build command, and `dist` as the publish directory. Set `VITE_API_URL=https://api.sway.onl`; `VITE_SOCKET_URL` may use the same value or be omitted because it falls back to the API origin.

Use the [server deployment notes](../server/README.md#deployment-notes) for HTTPS, authentication cookies, rate-limit stores, and trusted proxy configuration.

Sway does not play audio. Marking a song as playing changes queue state only. The current request CSV/plaintext export helpers also do not match the registered server routes. See [export limitations](../server/README.md#exporting-data) before exposing those formats in the UI.


## Contact

Message [@jsmallsdev](https://www.x.com/jsmallsdev) or email [hi@jsmalls.net](mailto:hi@jsmalls.net).

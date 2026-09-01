![Sway: live song requests for DJs and event organizers](readme-assets/sway.gif)

# Sway

Sway is a real-time platform that allows guests to submit song requests during live events while giving DJs complete control over what gets played. Guests can join rooms via QR code, search Spotify, submit requests, and vote on songs, all without creating an account. DJs manage the queue, and keep the dancefloors hot with what their audience actually want to hear. Now, DJs can rely on tangible insights from their sets to level up the next wedding, party, or club night they have booked.

## Why Sway?

Before becoming a developer, I was a professional DJ, so I know all too well the headaches of managing song requests. You could be playing a house track that's 128 BPM and get a request for a 71 BPM song, so then you have ~1 minute to figure out if the crowd really wants to hear it, and if so, how you're going to seamlessly mix it in.

Sway exists because I had finally reached my breaking point: an individual stumbling into the DJ booth attempting to put in a song request, resulting in spilled cocktails and broken equipment. Now, Sway is one of the single most impactful pieces of software DJs and event organizers can use to level up their next set. Guests get a better experience. DJs get a cleaner workflow. Everyone wins.

## Features

### Guests

- Join live rooms via QR code or room code, all without an account.
- Search and request tracks via Spotify's 570 million song catalog, in seconds.
- Cast votes on songs already queued, telling the DJ what they want to hear.
- View a room's played tracklist and open the songs directly in Spotify.
- Export a room's tracklist as a Spotify playlist for future listening. (coming soon!)

### DJs and event organizers

- Create rooms with a name and description, and automatically receive a custom generated room code, and QR code.
- Manage one active room at a time: mark tracks as playing or played, remove requests, edit room details, manually add requests, and end the event.
- Dedicated room display, showcasing room details and providing an easy way for guests to join live rooms.
- A custom song recommendation engine, based on personal insights and global play history.
- Access to custom insights and analytics: request totals, play totals, play conversion, personal/global track statistics, weekly or monthly history and more.
- Search through past rooms to review play rates, tracklists, and export tracklists and request lists as JSON, CSV, or TXT files.
- A public profile with event and music statistics.

Sway ships with an isolated demo experience, that refresh through their own polling cache, so new users can try the experience with zero friction.


## How it works

1. A DJ signs up, chooses a username, and creates a room.
2. Guests join via QR or room code.
3. Guests then search Spotify, submit requests, and cast votes on songs they really want to hear.
4. The DJ manages the queue while live updates keep the room views in sync for everyone.
5. After the event, played tracks and analytics remain available for review.

The demo follows the same room workflow using temporary, isolated data.

## Run locally

Prerequisites: Node.js 22.12+ on the 22.x line or Node.js 24+, pnpm for the client, Bun for the server, MongoDB 5.0+ for the analytics aggregations, and Spotify API credentials for live search.

The client and server have separate package manifests and lockfiles, there is no root install or start command.

```bash
git clone https://github.com/jordansmalls/sway.git
cd sway
```

In one terminal:

```bash
cd server
bun install --frozen-lockfile
cp .env.example .env
# Fill in .env using the server README before starting.
bun run dev
```

In another terminal, from the repository root:

```bash
cd client
pnpm install --frozen-lockfile
pnpm dev
```

The client runs at [localhost:3000](http://localhost:3000), and the API defaults to [localhost:9999](http://localhost:9999). Vite proxies `/api` and `/socket.io` to the API during development, so no client environment variables are required for this setup.

Set `NODE_ENV=development`, `FRONTEND_URL=http://localhost:3000`, a `MONGO_URI`, a private `JWT_SECRET`, and your server-side Spotify client ID and secret in `server/.env`.

See [server configuration](server/README.md#environment-variables) and [client deployment](client/README.md#build-and-deployment) before changing ports or deploying. Production hosting needs SPA route fallback and API/WebSocket routing, the development proxy is not a production proxy.

## Development checks

Run these from their respective directories:

| Directory | Command | Purpose |
| --- | --- | --- |
| `client` | `pnpm build` | Type-check and build the frontend into `dist/` |
| `client` | `pnpm lint` | Run ESLint |
| `server` | `bun run test:run` | Run the Vitest API suite once |
| `server` | `bun run test` | Watch the API tests |

Server tests use temporary MongoDB instances and mocked Spotify responses. A first test run may need to download a MongoDB binary. Live Spotify behavior needs a separate smoke test with working app credentials.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Client | React 19, TypeScript, Vite, React Router, TanStack Query, Zustand, Axios |
| Interface | Tailwind CSS, shadcn/ui and Radix UI, Motion, Recharts |
| Server | Bun, Express, Mongoose, JWT cookies, bcrypt, express-rate-limit |
| Data and realtime | MongoDB, Spotify API, Socket.IO |
| Testing | Vitest, Supertest, mongodb-memory-server |

## Repository and documentation

- [Client README](client/README.md): routes, shared components, data flow, setup, and frontend deployment.
- [Server README](server/README.md): configuration, API routes, models, Socket.IO events, tests, and operational caveats.
- [Server demo documentation](server/README.md#public-demo-api): private session design, seeded data, live Spotify requests, isolation, expiry, and quotas.
- [Screenshot assets](readme-assets/): existing product images.

Normal room data lives in the User, Room, and Request collections. Temporary demo data lives in a separate DemoSession collection, behind its own API namespace. Spotify credentials stay entirely on the server.

## Screenshots

Updated application view coming soon.

<details>
<summary>View screenshots</summary>

### Onboarding
### Dashboard and profile
### Room history and settings
### Room views

</details>

## Try the demo

Visit [app.sway.onl/demo](https://app.sway.onl/demo) to try Sway without signing up or running anything locally.

Each visitor gets a private, 30 minute demo room with the same admin, guest, display, and tracklist layouts as a real room. No signup or shared login is needed. You can switch roles, edit the room, search for real Spotify songs, make requests, vote, manage the queue, end the room, and reset it.

The demo uses real track names, artwork, Spotify IDs, and links. Requests, votes, play history, and recommendation counts are sample data, not real audience activity or Spotify listening statistics.

Three additional played requests populate the sample tracklist. Recommendations use a separate, curated set of songs with varied sample play counts. Reset an existing demo to load the latest default queue.

Demo sessions are isolated from real accounts, rooms, requests, and global statistics. They cannot change credentials, connect external accounts, create extra rooms, export data, or share access to their private room. Resetting does not extend expiry. The demo display's QR code takes another visitor to their own guest demo.

See [the server demo documentation](server/README.md#public-demo-api) for authentication, cleanup, Spotify caching, rate limits, and deployment details.

## License

MIT

## Contact

Questions or ideas? Message [@jsmallsdev](https://www.x.com/jsmallsdev) or email [hi@jsmalls.net](mailto:hi@jsmalls.net).

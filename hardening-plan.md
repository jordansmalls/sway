# Sway hardening plan

Built from two senior-engineer reviews (called **R1** and **R2** below) plus the older `server/review.md` (**S#n**) and `client/review.md` (**C#n**). Each item was checked against `main` at `2be06f2` on 2026-10-25. Anything already fixed has been left out.

**How items are ranked:** by how likely each one is to break a live event and how bad that would be, divided by the effort to fix. Cheap fixes for live bugs come first. Infrastructure that only matters at a scale Sway hasn't reached comes last.

## Implementation progress

2026-10-25: the first batch is implemented locally. All Phase 0 items, 0.1 through 0.9, have landed in the working tree with regression tests. The Phase 2 CI workflow covers frozen installs, server tests, the TypeScript error guard, and client lint, build, and unit tests. The mobile-hook lint error is fixed. The first hosted CI run is pending a push or pull request.

First-batch validation passed: 139 server tests, 11 client tests, client lint and build, frozen installs, workflow validation with actionlint, and the server TypeScript error guard. Client lint still reports four existing Fast Refresh warnings.

The server TypeScript baseline dropped from 232 diagnostics at `2be06f2` to 225 in the first batch, then to 223 after the room-ending fix. New tests add no diagnostics. Lower `server/typecheck-baseline.json` as errors are fixed; do not increase it to accept new errors.

Dependency audits remain non-blocking as planned. The initial reports found 52 server advisories, including one critical, and two high client production advisories. Review and update the affected dependencies in a separate batch. No dependencies or lockfiles changed in this batch.

This Phase 2 batch is complete. Cross-account mutation regressions and the full end-room lifecycle test now pass. The lifecycle test ends a room through its authenticated API, then sends 18 overlapping requests and votes and verifies unchanged exports and no broadcasts. The tests exposed incorrect 500 responses from room ending. Those now use the shared error handler: malformed IDs return 400, non-owners 403, missing rooms 404, and already-ended rooms 409, without side effects.

The real production vote-limiter tests verify that five of ten overlapping votes succeed under the current IP policy, and that blocked votes do not access the controller's database methods or broadcast events. Other test files retain their mocked limiters. This does not implement Phase 1.3's guest-based policy or submission limiter.

Final validation passes all 164 server tests across 18 files, including 12 isolated CLI integration tests for the TypeScript guard. The guard counts diagnostic objects, forces semantic checking even if `noCheck` is enabled, and rejects configuration, syntax, global, and compiler failures regardless of the allowed semantic error count. Its current count matches raw `tsc` at 223, and actionlint passes. No skipped or expected-failure tests stand in for missing Phase 1 behavior. The first hosted CI run remains pending.

Phase 1 implementation remains open, starting with 1.1 playback transitions, replay history, the repair script, and concurrency tests. The Phase 0 ended-room checks reject writes after an event ends but do not make concurrent room-ending and guest writes atomic.

---

## Where the reviews agree, disagree, or are already covered

| Topic | R1 | R2 | Verdict |
|---|---|---|---|
| Non-atomic mark-playing | #1 priority | P0 | **Do first.** Both rank it highest. |
| One-active-room invariant | #2 priority | P0 (invariants) | **Do first.** It's also a reproducible sequential bug (S#7), not just a race. |
| Server-side Spotify metadata | Yes | Yes | **Do.** It also fixes CSV injection at the source. |
| Vote semantics | Rate limits only | Pick a model explicitly | **Decided:** one vote per guest per track (1.3). |
| Redis for rate limits and the socket adapter | Recommends | Says not needed at 150 guests | **Defer.** Sway runs as a single instance. Revisit before adding a second one. |
| Socket room authorization | Flags it | P0 audit | **Low value right now.** Every socket event carries data that is already public through `GET /api/requests/:roomId/requests`. Write down the threat model and move on. |
| Reconnect recovery | — | P1 | **Already done.** `client/src/lib/socket.ts:92` re-joins rooms and `client/src/hooks/use-room-realtime.ts:57` refetches on reconnect. |
| Structured logging and readiness checks | Yes | Yes | **Do** in Phase 3. |
| Rewrites, microservices, a metrics stack | No | No | **Don't.** |

---

## Phase 0: quick fixes (about 1 day)

Small, low-risk changes that fix live bugs or leaks. Ship them as one PR.

| # | Problem (verified) | Where | Fix | Source |
|---|---|---|---|---|
| 0.1 | **Room-request exports are public, and two of the three formats return 404.** `GET /exports/:roomCode/export/*` has no `protect` and no ownership check, so anyone with a room code can download every request, including guests' names. The CSV handler is registered on `/export/json`, and the client's `plaintext` path doesn't match the server's `txt`. Today only the JSON export has a UI caller (`inactive-rooms-table.tsx`, used by the logged-in DJ), so the 404s aren't visible to users yet. | `export.routes.ts:45-59`, `export.controller.ts:270,346,441`, `client/src/api/exports.ts` | Add `protect` and the same owner check the tracklist exports already do (`export.controller.ts:46`). Register `/export/csv` and use `txt` on both sides. No client change needed for auth. Test every format, plus a 403 for another DJ and a 401 for a guest. | S#13, R2 §7, decision 2 |
| 0.2 | **Ended rooms still accept requests and votes**, so the history keeps changing after the event. | `request.controller.ts:71` (create), `:155` (vote) | Return `409` when `!room.active`. The vote path has to load the room, or filter with `$lookup`/a pre-check on `roomId`. | S#6, R2 §2A |
| 0.3 | **The Spotify error log can leak credentials.** It logs the whole Axios error, which carries request headers. | `spotify.controller.ts:92` (and the other catch blocks there) | Log only `status`, `code` and the endpoint. Copy the pattern from line 40. | S#10 |
| 0.4 | **Debug logging and an extra query in production.** `setActiveRoomStatus` makes 9 `console.log` calls and re-fetches the user just to verify the write. | `server/src/utils/set.user.active.room.ts` | Delete the logs and the re-fetch. Phase 1.2 replaces this helper anyway. | R1 #2, R1 #6 |
| 0.5 | **Malformed JSON returns 500.** The error handler ignores `err.status`. | `server/src/middlewares/error.middleware.ts:10` | Use `err.status ?? err.statusCode` when it's a 4xx. Return the same `{ success, error, message }` shape as the controllers. | S#14 |
| 0.6 | **CSV formula injection.** Guest-supplied titles go into exports as written, so a title of `=1+1` runs as a formula. | `export.controller.ts:136,391` | Prefix cells that start with `= + - @ \t \r` with `'`. Phase 1.4 removes the source of the problem. | S#11 |
| 0.7 | **Any logged-in user can read any other user's room history.** | `user.routes.ts:66` → `user.controller.ts:378` | Ignore `:userId` and scope the query to `req.user._id`, or return 403 when they don't match. | S#12, R2 §3A |
| 0.8 | **The client still sends `userId` when deleting a room.** The server ignores it now, but it's a trap for future changes. | `client/src/components/dialogs/delete-room-dialog.tsx:68`, `sidebar/app-sidebar.tsx:122` | Remove the field. | C#3 |
| 0.9 | **`markRequestPlayed` and `deleteRequest` crash with a TypeError if the room is gone.** | `request.controller.ts:320,375` | Add a null guard. Phase 1.1 folds this into the transition service. | new |

---

## Phase 1: make invalid queue and room states impossible (3–4 days)

This is the core of both reviews. Have the database enforce each rule, so the app logic doesn't need to be perfect.

### 1.1 Atomic playback transitions

**Problem (S#8, R1 #1, R2 §2A):** `markRequestPlaying` (`request.controller.ts:246-278`) runs a find, then an `updateMany`, then a separate `save()`. Two overlapping calls, such as a double-click on a slow connection, can leave two tracks marked `playing`.

**Approach:** use a partial unique index plus conditional writes. **Avoid transactions here.** No code uses them yet, they need a replica set in production, and the tests would have to switch to `MongoMemoryReplSet`.

1. Add the index to `request.model.ts`:
   ```ts
   // At most one playing track per room, enforced by Mongo.
   requestSchema.index({ roomId: 1 }, {
       name: "one_playing_per_room",
       unique: true,
       partialFilterExpression: { status: "playing" },
   });
   ```
   Drop the plain `{ roomId: 1 }` index first. It's redundant because `{ roomId: 1, status: 1 }` covers it as a prefix, and reusing the key pattern avoids an index conflict.
2. Move the transition into a `transitionRequestStatus(requestId, ownerId, to)` service:
   - Check ownership inside the query. Resolve the owner's room, then filter the request with `{ _id, roomId: ownedRoomId }`. This replaces the separate `Room.findById` and creator comparison.
   - Use an explicit transition table and reject anything else with a 409:

     | From → to | Behavior |
     |---|---|
     | `pending → playing` | Promote the row |
     | `playing → played` | Set `completedAt` |
     | `pending → rejected` | Remove it from the queue |
     | `played → playing` (**replay**) | See below |
     | Same state → same state | Return 200 with no side effects (double-click safe) |

   - For any change to `playing`, demote the current `playing` track with `updateMany`, then promote the target with a conditional `findOneAndUpdate`. On an `E11000` from `one_playing_per_room` (another call won the race), retry up to 2 times, so the latest click wins.
   - **Replay stores each play as its own row.** Don't flip the old `played` row back. That would overwrite the first `playedAt`, and it would collide with `unique_active_track_per_room` if guests had re-requested the track. Instead:
     1. If a `pending` request for the same track is already in the room (guests asked for it again), promote that row so their votes count.
     2. Otherwise, insert a new row that copies `track`, with `status: "playing"`, `votes: 0`, `requestedBy: null` and `replayOf: <original _id>`. `replayOf` is a new optional field.
     3. If that insert hits `E11000` because a guest submitted the same track at the same moment, go back to step 1.

     The tracklist export and the "most played" analytics then count every play, which is what you want. The client needs no cache changes, because `syncRequest` already inserts rows it hasn't seen (`use-room-realtime.ts:46`). Add a "Replay" action to played rows in the DJ request list if it doesn't have one yet.
3. Fix the route/body mismatch. The routes declare `:requestId`, but the handlers read `req.body.requestId`. Read from the route param.

**Migration:** `server.ts:14` awaits `Request.init()` at boot. **If production already has a room with 2 or more `playing` rows, the index build fails and the server won't start.** Before deploying, add `server/scripts/repair-playing.ts` to find those rooms and demote all but the most recent row.

### 1.2 The one-active-room rule

**Problems (S#7, R1 #2):**
- `deleteRoom` sets `hasActiveRoom = false` unconditionally (`room.controller.ts:445`). If a DJ deletes an *old* room while another room is live, they can then create a second active room. This reproduces with ordinary sequential requests.
- `createRoom` reads the flag, then writes the room, then writes the flag (`room.controller.ts:129-168`). Two quick creates can both pass the check.

**Approach:**
1. Add the index to `room.model.ts`:
   ```ts
   roomSchema.index({ roomCreator: 1, active: 1 }, {
       name: "one_active_room_per_creator",
       unique: true,
       partialFilterExpression: { active: true },
   });
   ```
   Add `await Room.init()` next to `Request.init()` in `server.ts`.
2. In `createRoom`, drop the pre-check and map `E11000` to a 409 ("You already have an active room").
3. Compute `hasActiveRoom` from `Room.exists({ roomCreator, active: true })` everywhere the API returns it: `user.controller.ts:109,229,355` and `auth.controller.ts:74,178,317`. The client's "Create room" button reads it (`app-sidebar.tsx:70`). Use one `userHasActiveRoom(userId)` helper. Stop writing the flag. You can leave the field in the schema to avoid a data migration.
4. Make `endRoom` a single conditional update: `findOneAndUpdate({ _id, roomCreator, active: true }, { active: false })`. That replaces `setRoomInactive` plus `setActiveRoomStatus`.

**Migration:** as in 1.1, add a script that finds creators with 2 or more active rooms and ends the older ones before the index ships.

### 1.3 Abuse limits and vote semantics on guest writes

**Problems (S#5, R1 #4, R2 §2B):**
- `POST /api/requests` has no limiter (`request.routes.ts:46`). Because submitting a duplicate counts as an upvote, anyone can bypass the vote limiter by resubmitting.
- The vote limiter allows 5 votes per 30 seconds **per IP**. A venue's Wi-Fi and mobile carrier NAT both put many guests behind one IP, so at a busy event real guests get throttled and abusers aren't stopped.

**Decided: one vote per guest per track.**

1. **Guest ID.** Add an `ensureGuestId` middleware on the `/api/requests` write routes. It sets a `sway_guest` httpOnly cookie containing a random UUID if one isn't already there. Reuse the cookie domain and SameSite settings the auth cookie already uses, so it works across the app and API domains.
2. **`Vote` model.** Fields `{ requestId, roomId, guestId, createdAt }`, with a unique index on `(requestId, guestId)` and a plain index on `roomId`. Call `await Vote.init()` at boot, next to the other models.
3. **A single `castVote(requestId, guestId)` function** that both routes use:
   - `POST /requests` upserts the request with `$setOnInsert` and `votes: 0`, dropping today's `$inc`, then calls `castVote`. Submitting a track counts as the submitter's vote, so a new request still starts at 1, as it does today.
   - `PUT /requests/vote` calls `castVote` directly.
   - `castVote` inserts the `Vote`. On `E11000` it returns 200 `{ alreadyVoted: true }` and emits nothing. Otherwise it applies `$inc: { votes: 1 }` and emits `request:updated` (or `request:created` for a new request).
   - If the process dies between the insert and the `$inc`, the count is off by one. Add `server/scripts/recount-votes.ts` to recalculate `votes` from the `Vote` collection. That's simpler than a transaction and the error can only be small.
4. **"Per track" means per request row.** Once a track has been played and guests request it again (or the DJ replays it, 1.1), it's a new row and everyone can vote again. That matches how the queue works.
5. **Rate limits are now a backstop** against scripts that clear cookies. Key them on `guestId` with `express-rate-limit`'s `keyGenerator`, for example 30 writes per minute. Keep a per-IP ceiling high enough for venue NAT, for example 300 per minute. Apply the same policy to both routes.
6. **Cap the queue:** at most 200 pending requests per room and 5 pending submissions per guest.
7. **Voted state for the client (C#6).** Add `hasVoted` to each request in the guest request-list responses, using one `Vote.find({ roomId, guestId })` per response. Disable the vote button once a guest has voted.
8. **Cleanup.** Delete a request's votes in `deleteRequest`, and a room's votes in `deleteRoom` and account deletion.
9. **Demo:** leave it alone. Its submit and vote path is separate.

### 1.4 Look up track metadata on the server

**Problem (S#11, R1 #5, R2 §3C, R2 §7):** `createRequest` trusts the title, artist and artwork the client sends (`request.controller.ts:59`). The demo path already looks tracks up on the server (`server/src/demo/demo.spotify.ts`).

**Approach:**
- Only when the track isn't already queued (the upvote path needs no lookup), resolve it by ID through a shared Spotify client: cached, with an 8-second timeout and `Retry-After` handling. Extract that client from `demo.spotify.ts` and reuse it in 3.4.
- **If Spotify is down**, accept the client's metadata with strict length caps rather than rejecting the request. A Spotify outage shouldn't stop requests in the middle of a set. Keep 0.6 in place as defense in depth.

### 1.5 Authorization sweep

Both reviews ask for "check ownership on every mutation". Here is the current state of each endpoint:

| Endpoint | Current state | Action |
|---|---|---|
| `PUT /requests/:id/mark-playing`, `mark-played`, `DELETE /requests/:id/delete` | Checks the owner through a separate room lookup | Move the check into the query (1.1) |
| `PUT /rooms/:roomId`, `PUT /rooms/end`, `DELETE /rooms/:roomId` | Checks the owner | Fold `endRoom` into 1.2. Nothing else needed. |
| `GET /users/:userId/inactive` | Protected, but not scoped to the caller | Fix in 0.7 |
| `PUT /users/profile` (email change) | Session cookie only | **Require `currentPassword` to change the email.** A stolen session could otherwise take over the account through password reset. Needs server and client changes. (C#2) |
| `GET /analytics/:userId/*` (except `request-activity`) | Public, and the limiter is commented out (`analytics.routes.ts:23`) | The public profile page uses these, so they're public on purpose. Re-enable a limiter. |
| `GET /exports/:roomCode/export/*` | Public, includes `requestedBy` names | Restrict to the room's DJ (0.1) |
| `GET /exports/:roomId/tracklist/*` | Protected, owner check in place | Nothing needed |
| Socket `join-room` | Any valid room ID | Public on purpose. Write it down. Only needs auth if you add DJ-only events. |

---

## Phase 2: tests and a CI gate (about 2 days, overlapping Phase 1)

The CI workflow, authorization/lifecycle regressions, export regressions, and tests using the real current vote limiter are implemented. The remaining acceptance tests depend on unimplemented Phase 1 features. Write those tests alongside the corresponding changes, not afterwards.

**CI (GitHub Actions, on every PR):**
- Server: `bun install --frozen-lockfile` and `vitest run`.
- Client: `pnpm lint`, `pnpm build` (which type-checks), and the tests. The existing lint error in `hooks/use-mobile.ts` is fixed.
- Server typecheck: `bun run typecheck` reports 223 existing semantic errors. `bun run typecheck:check` rejects increases and compiler/configuration/syntax failures. At a zero baseline it becomes a hard gate (Phase 4).
- `bun audit` / `pnpm audit --prod` as a non-blocking report.

**Tests to add (check rules, not just endpoints), each running real concurrent requests with `Promise.all`:**

| Test | Acceptance criterion | Status |
|---|---|---|
| Concurrent mark-playing | 20 overlapping calls on different tracks leave exactly 1 `playing` | Pending 1.1 |
| Replay | Replaying a played track creates a new `playing` row with `replayOf` set and leaves the original's `playedAt` alone. If a guest has re-requested the track, that pending row is promoted instead. | Pending 1.1 |
| Concurrent room create | 5 parallel creates give 1 success and 4 × 409 | Pending 1.2 |
| Delete an old room while one is live | Can't create a second active room | Pending 1.2 |
| Lifecycle | Requests and votes after `endRoom` get 409. Exported history is unchanged. | Covered in `hardening-lifecycle.test.ts`, after the end call completes |
| One vote per guest | One guest sending 10 overlapping votes and resubmits adds exactly 1 vote. 10 guests add 10. A replayed or re-requested track accepts votes again. | Pending 1.3 |
| Cross-account | DJ B can't mark, delete or end DJ A's requests and rooms, or read A's inactive rooms | Covered in `hardening-authorization.test.ts` and `hardening-lifecycle.test.ts` |
| Exports | Every advertised format returns 200 with the right content type for the room's DJ. Another DJ gets 403 and a guest gets 401. Formula cells are neutralized. | Covered in `exports.test.ts` |
| Spotify failure | Timeouts and 429s from upstream return a clean error, and metadata falls back as in 1.4 | Production resilience/fallback pending 1.4 and 3.4; logging and demo behavior have separate coverage |
| Index migration | A seeded duplicate-`playing` database is repaired by the script, and then the index builds | Pending the 1.1 repair script |

`guest-write-limits.test.ts` enables the real production vote limiter against the app. Other files retain the general/vote limiter mocks from `tests/setup.ts`. Its current IP-policy coverage will need updating when 1.3 adds guest IDs and submission limits.

---

## Phase 3: live-event operations (2–3 days)

Deploys, restarts and Spotify problems during a set should have no visible effect.

1. **Graceful shutdown.** `server.ts` has no `SIGTERM` handler, and Railway sends `SIGTERM` on every deploy. Stop accepting connections, call `io.close()` and `server.close()`, wait up to about 10 seconds for in-flight requests, then `mongoose.disconnect()`.
2. **Readiness endpoint.** The only health route is admin-only. Add a public `GET /health/ready` that returns 200 or 503 based on `mongoose.connection.readyState === 1`, and point Railway's healthcheck at it so traffic only arrives once Mongo is connected.
3. **Split the rate limits by audience.** The single limiter of 100 requests per 2 hours per IP (`general.limiter.ts`) covers `/api/auth`, `/api/users` (including `/users/me`, which React Query refetches when the window regains focus), `/api/global` and exports. **A DJ actively using the dashboard through a long set can lock themselves out.** Replace it with:
   - Login/signup: strict, keyed on IP plus email.
   - DJ routes (authenticated): keyed on user ID, generous.
   - Guest reads: generous, per IP.
   - Spotify search: per guest/IP, plus a short server-side cache of query results.
4. **Make the production Spotify routes as resilient as the demo's.** Catalog calls have no timeout; only token fetches do. Use the shared client from 1.4 for timeouts, `Retry-After` and caching (S#10).
5. **Structured logging.** Replace `morgan` with `pino` and `pino-http`. Add a request ID, plus `roomId` and `userId` on mutation paths, and redact `cookie` and `authorization`. Convert the roughly 75 `console.*` calls in controllers, starting with `request.controller` and `room.controller`. This lets you answer "what happened in room X at 22:14?" (R1 #3)
6. **Load test before the next large event.** Use k6 or Artillery with Socket.IO to simulate 150 guests joining, searching, submitting and voting, with bursts, against staging. Check p95 latency, error rate, socket fan-out, and that the final database state is consistent (R2 §9).
7. **Deploy checklist** in `server/README.md`: required environment variables, the index-repair scripts, a smoke test (join room → submit → vote → mark playing → export).

---

## Phase 4: maintainability, done as you touch code

None of this blocks a release. Do each item when you're already working in that area. Don't schedule a rewrite.

- **Validate at the route boundary with Zod.** Start with the public write endpoints (`POST /requests`, `/vote`, `/rooms/join`), then auth and profile. Share the username rule between signup, settings and the server (C#14).
- **One error shape and an `AppError` class.** Stop using "Invalid Credentials" for validation errors (R1 #3, S#14).
- **Pay down type errors** from about 230 to 0, then make the typecheck a hard gate. Type `req.user` with a typed authenticated request.
- **Share contracts between client and server.** Define the API response types and Socket.IO event payloads once (for example in a shared `types` package or file) and delete the client's shape-guessing (`requestCount ?? totalSongRequests ?? …`, `$oid` checks) (C#21, R2 §4).
- **Services only where they isolate a rule.** `transitionRequestStatus` (1.1) and room lifecycle (1.2) are the two that justify one. Leave simple CRUD controllers as they are.
- **Client fixes:**
  - `ProtectedRoute`: redirect only on 401 and remember the original page with `state.from` (C#16).
  - Move profiles to `/u/:username`, or reserve route names on the server (C#15).
  - Replace the "disable the query while mutating" logic with `cancelQueries` in `onMutate` and one invalidate in `onSettled` (C#18).
  - Give demo mode its own axios instance through context (C#20).
- **Cleanup:** merge `request-dialog` and `request-dialog-admin`, add Prettier and an import-path rule, move hardcoded URLs into config, remove the placeholder "Verified profile" badge and bio, pick one package manager for the client.
- **Indexes:** `{ status: 1 }` and the plain `{ "track.spotifyTrackId": 1 }` on requests may be unused. Check with `explain()` against the global analytics queries before removing them.

---

## Deferred on purpose

| Item | Why not now | Revisit when |
|---|---|---|
| Redis store for rate limits and the Socket.IO adapter | Sway runs as one instance. In-memory state resetting on deploy is acceptable. | Before running a second instance. Both have to change together. |
| Socket room authorization | Every event is already public through REST | You add DJ-only realtime events |
| Metrics or a tracing stack | Structured logs (3.5) answer the questions that matter now | Logs stop being enough to debug incidents |
| Storing the QR as a data URL on the room | Works fine at this scale | You need to regenerate or restyle QR codes |
| Controller rewrite or microservices | Both reviews advise against it | — |

---

## Release gate before a wider pilot

- [ ] No unauthorized room or request changes (1.5, with Phase 2 cross-account tests)
- [ ] At most one `playing` track and one active room, enforced by an index (1.1, 1.2)
- [ ] Ended rooms can't be changed (0.2)
- [ ] One vote per guest per track, tested under concurrent requests (1.3)
- [ ] Replays keep the play history correct (1.1)
- [x] Every advertised export works and only the room's DJ can read it (0.1)
- [ ] CI runs server tests and client lint/build on every PR (Phase 2)
- [ ] Deploys don't drop in-flight requests, and the readiness check gates traffic (3.1, 3.2)
- [ ] A 150-guest load test passes with acceptable p95 latency and no inconsistent state (3.6)

---

## Decisions (made 2026-10-25)

1. **Votes:** one vote per guest per track, using a guest cookie and a `Vote` collection (1.3). Guests can't change or remove a vote.
2. **Room-request exports:** only the room's DJ can read them (0.1).
3. **Replays:** allowed. Each replay is a new request row linked to the original with `replayOf`, so the play history stays accurate (1.1).

---

## Suggested order and PRs

| PR | Contents | Rough effort |
|---|---|---|
| 1 | Phase 0 (all of it, including restricting exports to the DJ) and the CI workflow from Phase 2 | 1 day |
| 2 | 1.1 playback transitions, replay, repair script, concurrency tests | 1.5 days |
| 3 | 1.2 one active room, repair script, tests | 1 day |
| 4a | 1.3 guest ID, `Vote` model, `castVote`, `hasVoted`, voted state in the client, recount script | 1–1.5 days |
| 4b | 1.4 shared Spotify client, server-side metadata lookup | 1 day |
| 5 | 1.5 remaining authorization items (email change requires password, analytics limiter) | 0.5 day |
| 6 | 3.1–3.4 shutdown, readiness, split limiters, Spotify resilience | 1.5 days |
| 7 | 3.5 structured logging | 1 day |
| — | 3.6 load test, then Phase 4 ongoing | — |

PRs 1–3 give the most value for the effort: they fix every live bug both reviews found and add database-enforced guarantees for the queue and rooms.

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Music, ThumbsUp } from "lucide-react";

/**
 * Copy this file into a React project with lucide-react installed.
 * Usage: <RequestListDemo />
 * Includes demo data, scoped CSS, and the app's staggered list entrance.
 * No app providers, API, Tailwind configuration, or Magic UI files required.
 * Inherits the host font and shadcn color variables, with standalone fallbacks.
 * Album art loads from Spotify's CDN. Requests and votes are demo activity.
 * Plays once on entering the viewport. Change the React key to replay.
 */
export type RequestListDemoItem = {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  requestedBy?: string;
  votes: number;
  status: "playing" | "pending";
};

export type RequestListDemoProps = {
  className?: string;
  style?: CSSProperties;
  /** Display order is preserved. Use unique, stable IDs. */
  requests?: readonly RequestListDemoItem[];
  animated?: boolean;
  /** Milliseconds between entrances; 60 matches the app demo. */
  staggerMs?: number;
  /** Accessible label; no visible heading is added. */
  label?: string;
};

// Snapshot of the five active requests from server/src/demo/demo.seed.ts.
const sampleRequests: readonly RequestListDemoItem[] = [
  {
    "id": "3sK8wGT43QFpWrvNQsrQya",
    "title": "DtMF",
    "artist": "Bad Bunny",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b273bbd45c8d36e0e045ef640411",
    "requestedBy": "Alex",
    "votes": 12,
    "status": "playing"
  },
  {
    "id": "3azJifCSqg9fRij2yKIbWz",
    "title": "The Color Violet",
    "artist": "Tory Lanez",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b2730c5f23cbf0b1ab7e37d0dc67",
    "requestedBy": "Sam",
    "votes": 9,
    "status": "pending"
  },
  {
    "id": "6TWbY1dq8eYtFiMiGdBlOa",
    "title": "Free Your Mind",
    "artist": "Prospa, Cloonee, Sybil",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27338974737cba5770d9dba1cd6",
    "requestedBy": "Taylor",
    "votes": 7,
    "status": "pending"
  },
  {
    "id": "2mzM4Y0Rnx2BDZqRnhQ5Q6",
    "title": "Free Mind",
    "artist": "Tems",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b2730ab4d3e1c0b5c5e453287a4c",
    "requestedBy": "Jordan",
    "votes": 5,
    "status": "pending"
  },
  {
    "id": "0GjEhVFGZW8afUYGChu3Rr",
    "title": "Dancing Queen",
    "artist": "ABBA",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27370f7a1b35d5165c85b95a0e0",
    "requestedBy": "Alex",
    "votes": 4,
    "status": "pending"
  }
];

const styles = `
.sway-request-demo { box-sizing: border-box; container-type: inline-size; width: 100%; min-width: 0; overflow: hidden; border: 1px solid var(--border, #e5e5e5); border-radius: 12px; background: var(--background, #fff); color: var(--foreground, #171717); font-family: inherit; }
.sway-request-demo * { box-sizing: border-box; }
.sway-request-demo .sway-request-list { list-style: none; margin: 0; padding: 0; }
.sway-request-demo .sway-request-row { display: grid; grid-template-columns: 44px minmax(0, 1fr); align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid var(--border, #e5e5e5); }
.sway-request-demo .sway-request-row:last-child { border-bottom: 0; }
.sway-request-demo .sway-request-number { display: none; width: 16px; flex: none; font-size: 14px; color: var(--muted-foreground, #737373); }
.sway-request-demo .sway-request-art { display: grid; place-items: center; position: relative; overflow: hidden; width: 44px; height: 44px; flex: none; border-radius: 6px; background: var(--muted, #f5f5f5); color: var(--muted-foreground, #737373); }
.sway-request-demo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.sway-request-demo .sway-request-details { min-width: 0; flex: 1; }
.sway-request-demo .sway-request-title, .sway-request-demo .sway-request-artist, .sway-request-demo .sway-request-by { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sway-request-demo .sway-request-title { font-size: 14px; font-weight: 600; line-height: 20px; }
.sway-request-demo .sway-request-artist { font-size: 14px; line-height: 20px; color: var(--muted-foreground, #737373); }
.sway-request-demo .sway-request-by { font-size: 12px; line-height: 16px; color: var(--muted-foreground, #737373); opacity: .8; }
.sway-request-demo .sway-request-meta { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; flex: none; }
.sway-request-demo .sway-request-status { border: 1px solid var(--border, #e5e5e5); border-radius: 999px; padding: 2px 10px; background: var(--muted, #f5f5f5); color: var(--muted-foreground, #737373); font-size: 12px; font-weight: 500; line-height: 16px; white-space: nowrap; }
.sway-request-demo .sway-request-status[data-status="playing"] { background: #fffbeb; color: #b45309; border-color: #fde68a; }
.sway-request-demo .sway-request-status[data-status="next"] { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.sway-request-demo .sway-request-votes { display: flex; align-items: center; gap: 4px; border-radius: 999px; padding: 4px 10px; background: #f0fdf4; color: #15803d; font-size: 14px; font-weight: 500; line-height: 20px; font-variant-numeric: tabular-nums; }
.dark .sway-request-demo .sway-request-status[data-status="playing"] { background: #451a03; color: #fcd34d; border-color: #78350f; }
.dark .sway-request-demo .sway-request-status[data-status="next"] { background: #172554; color: #93c5fd; border-color: #1e3a8a; }
.dark .sway-request-demo .sway-request-votes { background: #052e16; color: #86efac; }
.sway-request-demo[data-animated="true"] .sway-request-row { animation: sway-request-enter 300ms var(--ease-out, cubic-bezier(0.23, 1, 0.32, 1)) both; animation-play-state: paused; }
.sway-request-demo[data-entered="true"] .sway-request-row { animation-play-state: running; }
@keyframes sway-request-enter { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sway-request-fade { from { opacity: 0; } to { opacity: 1; } }
@container (min-width: 480px) {
  .sway-request-demo .sway-request-row { display: flex; padding: 12px 16px; }
  .sway-request-demo .sway-request-number { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  .sway-request-demo[data-animated="true"] .sway-request-row { animation-name: sway-request-fade; animation-duration: 200ms; animation-delay: 0ms !important; }
}
`;

export function RequestListDemo({
  className = "",
  style,
  requests = sampleRequests,
  animated = true,
  staggerMs = 60,
  label = "Song requests",
}: RequestListDemoProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const firstPendingId = requests.find((request) => request.status === "pending")?.id;
  const delay = Number.isFinite(staggerMs) ? Math.max(0, staggerMs) : 60;

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    // Keep content visible in environments without IntersectionObserver.
    if (typeof IntersectionObserver === "undefined") {
      element.dataset.entered = "true";
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setEntered(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={`sway-request-demo ${className}`} style={style} data-animated={animated} data-entered={entered}>
      <style>{styles}</style>
      <ol className="sway-request-list" aria-label={label}>
        {requests.map((request, index) => {
          const status = request.status === "playing" ? "playing" : request.id === firstPendingId ? "next" : "queued";
          const statusLabel = status === "playing" ? "Now Playing" : status === "next" ? "Up Next" : "Queued";
          return (
            <li className="sway-request-row" key={request.id} style={{ animationDelay: `${Math.min(index * delay, 2000)}ms` }}>
              <span className="sway-request-number" aria-hidden="true">{index + 1}</span>
              <div className="sway-request-art">
                <Music size={20} aria-hidden="true" />
                {request.albumArtUrl && <img key={request.albumArtUrl} src={request.albumArtUrl} alt="" loading="lazy" decoding="async" draggable={false} onError={(event) => { event.currentTarget.style.display = "none"; }} />}
              </div>
              <div className="sway-request-details">
                <div className="sway-request-title" title={request.title}>{request.title}</div>
                <div className="sway-request-artist" title={request.artist}>{request.artist}</div>
                {request.requestedBy && <div className="sway-request-by">Requested by {request.requestedBy}</div>}
              </div>
              <div className="sway-request-meta">
                <span className="sway-request-status" data-status={status}>{statusLabel}</span>
                <span className="sway-request-votes" aria-label={`${request.votes} votes`} title={`${request.votes} votes`}>
                  <ThumbsUp size={16} aria-hidden="true" />{request.votes}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {requests.length === 0 && <p style={{ margin: 0, padding: 16, fontSize: 14 }}>No requests yet.</p>}
    </div>
  );
}

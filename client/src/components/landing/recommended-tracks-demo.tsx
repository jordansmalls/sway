"use client";

import { useId, useState, type CSSProperties } from "react";
import { Music2, Pause, Play, TrendingUp } from "lucide-react";

/**
 * Copy this file into a React project with lucide-react installed.
 * Usage: <RecommendedTracksDemo className="w-full" />
 * All styles and demo data are included. No Tailwind config or app providers needed.
 * Inherits the host font and shadcn CSS color variables, with standalone fallbacks.
 * Artwork loads from Spotify's CDN. Play counts are synthetic demo activity.
 */
export type RecommendedTracksDemoTrack = {
  id: string;
  title: string;
  artist: string;
  albumArtUrl?: string;
  playCount: number;
};

export type RecommendedTracksDemoProps = {
  className?: string;
  style?: CSSProperties;
  title?: string;
  description?: string;
  /** Alternating tracks populate the two rows, matching the app demo. */
  tracks?: readonly RecommendedTracksDemoTrack[];
  /** Disable scrolling for a static bento illustration. */
  animated?: boolean;
};

// Snapshot of server/src/demo/demo.seed.ts and demo.tracks.ts.
const sampleTracks: readonly RecommendedTracksDemoTrack[] = [
  {
    "id": "0DiWol3AO6WpXZgp0goxAV",
    "title": "One More Time",
    "artist": "Daft Punk",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b2731e81bff9807a9e629fce5ade",
    "playCount": 203
  },
  {
    "id": "39LLxExYz6ewLAcYrzQQyP",
    "title": "Levitating",
    "artist": "Dua Lipa",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b273c88bae7846e62a8ba59ee0bd",
    "playCount": 331
  },
  {
    "id": "73mlvsfJM2qwlDUJxeaatI",
    "title": "Daft Punk Is Playing at My House",
    "artist": "LCD Soundsystem",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b273a0ceab8776e20d715e6b9fd2",
    "playCount": 146
  },
  {
    "id": "3sK8wGT43QFpWrvNQsrQya",
    "title": "DtMF",
    "artist": "Bad Bunny",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b273bbd45c8d36e0e045ef640411",
    "playCount": 387
  },
  {
    "id": "4RvWPyQ5RL0ao9LPZeSouE",
    "title": "Everybody Wants To Rule The World",
    "artist": "Tears For Fears",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27322463d6939fec9e17b2a6235",
    "playCount": 248
  },
  {
    "id": "1IHWl5LamUGEuP4ozKQSXZ",
    "title": "Tití Me Preguntó",
    "artist": "Bad Bunny",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27349d694203245f241a1bcaa72",
    "playCount": 319
  },
  {
    "id": "4Dvkj6JhhA12EX05fT7y2e",
    "title": "As It Was",
    "artist": "Harry Styles",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27382ce362511fb3d9dda6578ee",
    "playCount": 271
  },
  {
    "id": "1vLqigPHwiFnXsfrLMehV1",
    "title": "Espresso",
    "artist": "Sabrina Carpenter",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b273255ec9ddd8af81fd9aba2ced",
    "playCount": 456
  },
  {
    "id": "6dOtVTDdiauQNBQEDOtlAB",
    "title": "BIRDS OF A FEATHER",
    "artist": "Billie Eilish",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27371d62ea7ea8a5be92d3c1f62",
    "playCount": 402
  },
  {
    "id": "6eDApnV9Jdb1nYahOlbbUh",
    "title": "One Time",
    "artist": "Justin Bieber",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b2737c3bb9f74a98f60bdda6c9a7",
    "playCount": 168
  },
  {
    "id": "6QewNVIDKdSl8Y3ycuHIei",
    "title": "Even Flow",
    "artist": "Pearl Jam",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b2732d0e5ab5bd2e234fbcffa3e0",
    "playCount": 235
  },
  {
    "id": "7J1uxwnxfQLu4APicE5Rnj",
    "title": "Billie Jean",
    "artist": "Michael Jackson",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27332a7d87248d1b75463483df5",
    "playCount": 524
  },
  {
    "id": "2xLMifQCjDGFmkHkpNLD9h",
    "title": "SICKO MODE",
    "artist": "Travis Scott",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b273daec894c14c0ca42d76eeb32",
    "playCount": 428
  },
  {
    "id": "42VsgItocQwOQC3XWZ8JNA",
    "title": "FE!N (feat. Playboi Carti)",
    "artist": "Travis Scott, Playboi Carti",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27304481c826dd292e5e4983b3f",
    "playCount": 312
  },
  {
    "id": "1p80LdxRV74UKvL8gnD7ky",
    "title": "Blank Space",
    "artist": "Taylor Swift",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b2739abdf14e6058bd3903686148",
    "playCount": 98
  },
  {
    "id": "3e9HZxeyfWwjeyPAMmWSSQ",
    "title": "thank u, next",
    "artist": "Ariana Grande",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27356ac7b86e090f307e218e9c8",
    "playCount": 361
  },
  {
    "id": "0sSRLXxknVTQDStgU1NqpY",
    "title": "Hours In Silence",
    "artist": "Drake, 21 Savage",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b27302854a7060fccc1a66a4b5ad",
    "playCount": 219
  },
  {
    "id": "29iva9idM6rFCPUlu7Rhxl",
    "title": "YUKON",
    "artist": "Justin Bieber",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b273d65c4773bc5061fd27facc5b",
    "playCount": 176
  },
  {
    "id": "22NHkFYbgxB2Zirj29Gbp8",
    "title": "oh yeah?",
    "artist": "Steve Lacy",
    "albumArtUrl": "https://i.scdn.co/image/ab67616d0000b2734ea9ba86cd9506a004bab042",
    "playCount": 121
  }
];

const styles = `
.sway-recommendations { box-sizing: border-box; width: 100%; min-width: 0; overflow: hidden; border: 1px solid var(--border, #e5e5e5); border-radius: 12px; padding: 12px 0; background: var(--card, #fff); color: var(--card-foreground, #171717); font-family: inherit; }
.sway-recommendations * { box-sizing: border-box; }
.sway-recommendations header { display: flex; align-items: flex-start; gap: 12px; padding: 0 16px 8px; }
.sway-recommendations .sway-rec-heading { display: flex; flex: 1; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; }
.sway-recommendations h2 { margin: 0; font-size: 14px; font-weight: 500; line-height: 20px; }
.sway-recommendations p { margin: 0; font-size: 12px; line-height: 16px; color: var(--muted-foreground, #737373); }
.sway-recommendations button { display: grid; place-items: center; flex: none; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 4px; background: transparent; color: var(--muted-foreground, #737373); cursor: pointer; }
.sway-recommendations button:focus-visible { outline: 2px solid var(--ring, #737373); outline-offset: 2px; }
.sway-recommendations .sway-rec-row { overflow: hidden; padding: 4px 8px; mask-image: linear-gradient(to right, transparent, black 48px, black calc(100% - 48px), transparent); }
.sway-recommendations .sway-rec-belt { display: flex; width: max-content; animation: sway-rec-scroll var(--sway-rec-duration, 40s) linear infinite; }
.sway-recommendations .sway-rec-row:nth-child(2) .sway-rec-belt { animation-direction: reverse; }
.sway-recommendations .sway-rec-group { display: flex; flex-shrink: 0; gap: 12px; padding-right: 12px; }
.sway-recommendations .sway-rec-track { display: flex; align-items: center; gap: 12px; flex-shrink: 0; width: 256px; padding: 12px; border: 1px solid color-mix(in srgb, var(--foreground, #171717) 10%, transparent); border-radius: 12px; background: color-mix(in srgb, var(--foreground, #171717) 2%, var(--card, #fff)); }
.sway-recommendations .sway-rec-art { display: grid; place-items: center; position: relative; overflow: hidden; width: 48px; height: 48px; flex: none; border-radius: 8px; background: var(--muted, #f5f5f5); color: var(--muted-foreground, #737373); }
.sway-recommendations img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.sway-recommendations .sway-rec-details { flex: 1; min-width: 0; }
.sway-recommendations .sway-rec-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 500; line-height: 20px; }
.sway-recommendations .sway-rec-artist { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; font-size: 12px; line-height: 16px; color: var(--muted-foreground, #737373); }
.sway-recommendations .sway-rec-count { display: flex; flex-shrink: 0; align-items: center; gap: 4px; color: #ec4899; font-size: 14px; font-weight: 600; line-height: 20px; font-variant-numeric: tabular-nums; }
.sway-recommendations:hover .sway-rec-belt, .sway-recommendations:focus-within .sway-rec-belt, .sway-recommendations[data-paused="true"] .sway-rec-belt { animation-play-state: paused; }
.sway-recommendations[data-animated="false"] .sway-rec-belt { animation: none; }
@keyframes sway-rec-scroll { to { transform: translateX(-25%); } }
@media (prefers-reduced-motion: reduce) {
  .sway-recommendations .sway-rec-belt { animation: none; }
  .sway-recommendations button { display: none; }
}
`;

export function RecommendedTracksDemo({
  className = "",
  style,
  title = "Recommended Tracks",
  description = "This is what we think you should play next, based on your insights.",
  tracks = sampleTracks,
  animated = true,
}: RecommendedTracksDemoProps) {
  const headingId = useId();
  const [paused, setPaused] = useState(false);
  const rows = [tracks.filter((_, i) => i % 2 === 0), tracks.filter((_, i) => i % 2 === 1)];

  return (
    <section className={`sway-recommendations ${className}`} style={style} aria-labelledby={headingId} data-animated={animated} data-paused={paused}>
      <style>{styles}</style>
      <header>
        <div className="sway-rec-heading">
          <h2 id={headingId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {animated && tracks.length > 0 && (
          <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume scrolling tracks" : "Pause scrolling tracks"}>
            {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
          </button>
        )}
      </header>
      <div>
        {rows.map((row, rowIndex) => row.length > 0 && (
          <div className="sway-rec-row" key={rowIndex}>
            <div className="sway-rec-belt" style={{ "--sway-rec-duration": `${Math.max(24, row.length * 4)}s` } as CSSProperties}>
              {Array.from({ length: 4 }, (_, copy) => (
                <div className="sway-rec-group" key={copy} aria-hidden={copy > 0 ? true : undefined} inert={copy > 0 ? true : undefined}>
                  {row.map((track) => (
                    <div className="sway-rec-track" key={track.id}>
                      <div className="sway-rec-art">
                        <Music2 size={20} aria-hidden="true" />
                        {track.albumArtUrl && <img src={track.albumArtUrl} alt="" loading="lazy" decoding="async" draggable={false} onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                      </div>
                      <div className="sway-rec-details">
                        <div className="sway-rec-title" title={track.title}>{track.title}</div>
                        <div className="sway-rec-artist" title={track.artist}>{track.artist}</div>
                      </div>
                      <span className="sway-rec-count" aria-label={`${track.playCount.toLocaleString("en-US")} plays`} title={`${track.playCount.toLocaleString("en-US")} plays`}>
                        <TrendingUp size={16} aria-hidden="true" />{track.playCount.toLocaleString("en-US")}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
        {tracks.length === 0 && <p style={{ padding: "16px" }}>No played tracks yet.</p>}
      </div>
    </section>
  );
}

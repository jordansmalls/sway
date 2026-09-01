import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  CalendarDays,
  ChartSpline,
  CheckCheck,
  CheckCircle2,
  ListOrdered,
  MoreVertical,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Marquee } from "@/registry/magicui/marquee"
import { NumberTicker } from "@/registry/magicui/number-ticker"
import { useAuthStore } from "@/stores/auth-store"
import { useActiveRoomSummaryQuery } from "@/api/rooms"
import {
  useAnalyticsTotalsQuery,
  useGlobalTracksQuery,
  useMostRequestedSongsQuery,
  useRequestActivityQuery,
  type AnalyticsTotals,
  type GlobalTrack,
} from "@/api/analytics"

const stats = [
  {
    label: "Rooms Hosted",
    getDescription: () => "Events with measurable request activity.",
    getChange: () => "42%",
    up: true,
    icon: CalendarDays,
    getValue: (totals: AnalyticsTotals) => totals.roomsHosted,
    decimalPlaces: 0,
  },
  {
    label: "Requests Received",
    getDescription: () => "Total requests received all time.",
    getChange: () => "13%",
    up: true,
    icon: CheckCheck,
    getValue: (totals: AnalyticsTotals) => totals.requestsReceived,
    decimalPlaces: 0,
  },
  {
    label: "Requests Played",
    getDescription: (totals?: AnalyticsTotals) => {
      const playedPercent = totals?.requestsReceived
        ? Math.round((totals.requestsPlayed / totals.requestsReceived) * 100)
        : 0
      return `You've played ${playedPercent}% of all received requests.`
    },
    getChange: (totals?: AnalyticsTotals) => {
      const playedPercent = totals?.requestsReceived
        ? (totals.requestsPlayed / totals.requestsReceived) * 100
        : 0
      return `${Math.round(playedPercent)}%`
    },
    up: true,
    icon: CheckCircle2,
    getValue: (totals: AnalyticsTotals) => totals.requestsPlayed,
    decimalPlaces: 0,
  },
  {
    label: "Average Requests per Room",
    getDescription: () => "How engaged your audiences are.",
    getChange: () => "37%",
    up: true,
    icon: ListOrdered,
    getValue: (totals: AnalyticsTotals) =>
      totals.roomsHosted > 0
        ? totals.requestsReceived / totals.roomsHosted
        : 0,
    decimalPlaces: 1,
  },
]

function StatCards({
  totals,
  isLoading,
}: {
  totals?: AnalyticsTotals
  isLoading: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span>{stat.label}</span>
            <stat.icon className="size-3.5" />
          </div>
          <div className="rounded-md border bg-card p-3">
            <div className="flex items-center justify-between">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                totals ? (
                  <NumberTicker
                    value={stat.getValue(totals)}
                    decimalPlaces={stat.decimalPlaces}
                    className="text-2xl font-semibold tracking-tight"
                  />
                ) : <span className="text-2xl font-semibold tracking-tight">—</span>
              )}
              <span className={cn("flex items-center gap-1 text-sm font-medium", stat.up ? "text-emerald-600" : "text-destructive")}>
                {stat.up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {stat.getChange(totals)}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {stat.getDescription(totals)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TopSongCard({ song }: { song: import("@/api/analytics").AnalyticsSong }) {
  const content = (
    <figure
      className={cn(
        "flex h-full w-64 items-center gap-3 overflow-hidden rounded-xl border p-3 transition-colors",
        "border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.06]",
        "dark:border-border dark:bg-card dark:hover:bg-accent"
      )}
    >
      {song.albumArtUrl ? (
        <img className="size-12 shrink-0 rounded-lg object-cover" alt={`${song.title} album art`} src={song.albumArtUrl} />
      ) : (
        <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
          {song.title.slice(0, 1).toUpperCase()}
        </div>
      )}
      <figcaption className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{song.title}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{song.artist}</div>
      </figcaption>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-pink-500" title={`${song.playCount} plays`}>
        <TrendingUp className="size-4" />
        {song.playCount.toLocaleString()}
        <span className="sr-only"> plays</span>
      </span>
    </figure>
  )

  return song.spotifyLink ? <a href={song.spotifyLink} target="_blank" rel="noreferrer">{content}</a> : content
}

function TopSongs() {
  const user = useAuthStore((state) => state.user)
  const songsQuery = useMostRequestedSongsQuery(user?._id ?? "")
  const songs = (songsQuery.data?.songs ?? []).slice(0, 12)
  const splitAt = Math.ceil(songs.length / 2)
  const firstRow = songs.slice(0, splitAt)
  const secondRow = songs.slice(splitAt)

  return (
    <section className="overflow-hidden rounded-lg border bg-card py-4">
      <div className="flex items-start justify-between gap-4 px-4 pb-3">
        <div>
          <h2 className="text-sm font-medium">Top songs</h2>
          <p className="mt-1 text-xs text-muted-foreground">Your audience’s most-requested tracks across every room.</p>
        </div>
        <span className="shrink-0 rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">All time</span>
      </div>

      {songsQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-[74px] rounded-xl" />)}
        </div>
      ) : songs.length > 0 ? (
        <div className="relative flex w-full flex-col justify-center overflow-hidden">
          <Marquee pauseOnHover className="[--duration:28s]">
            {firstRow.map((song) => <TopSongCard key={song.spotifyTrackId} song={song} />)}
          </Marquee>
          {secondRow.length > 0 ? (
            <Marquee reverse pauseOnHover className="[--duration:28s]">
              {secondRow.map((song) => <TopSongCard key={song.spotifyTrackId} song={song} />)}
            </Marquee>
          ) : null}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-card to-transparent sm:w-32" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-card to-transparent sm:w-32" />
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">Top songs will appear after your rooms receive requests.</div>
      )}
    </section>
  )
}

function RequestConversionCard({
  totals,
  isLoading,
}: {
  totals?: AnalyticsTotals
  isLoading: boolean
}) {
  const received = totals?.requestsReceived ?? 0
  const played = Math.min(totals?.requestsPlayed ?? 0, received)
  const notPlayed = Math.max(received - played, 0)
  const conversionRate = received > 0 ? (played / received) * 100 : 0
  const conversionData = [
    { name: "Played", value: played, fill: "var(--color-played)" },
    { name: "Not played", value: notPlayed, fill: "var(--color-notPlayed)" },
  ]

  return (
    <div className="flex min-h-[360px] flex-col rounded-lg border bg-card p-4 xl:self-stretch xl:pb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Request conversion</span>
        <span className="shrink-0 rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">All time</span>
      </div>

      {isLoading ? (
        <div className="mt-4 grid flex-1 place-items-center">
          <Skeleton className="size-60 rounded-full" />
        </div>
      ) : received > 0 ? (
        <div className="mt-3 flex flex-1 flex-col">
          <div className="relative mx-auto w-full max-w-96">
            <ChartContainer
              config={{
                played: { label: "Played", color: "oklch(0.62 0.17 160)" },
                notPlayed: { label: "Not played", color: "oklch(0.88 0.02 260)" },
              }}
              className="h-[280px] w-full aspect-auto"
            >
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Pie
                  data={conversionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="94%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {conversionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tabular-nums"><NumberTicker value={Math.round(conversionRate)} />%</span>
              <span className="text-xs text-muted-foreground">played</span>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2">
            <div className="rounded-md border p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="size-2 rounded-sm bg-emerald-500" />
                Played
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{played.toLocaleString()}</div>
            </div>
            <div className="rounded-md border p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="size-2 rounded-sm bg-slate-200 dark:bg-slate-700" />
                Not played
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{notPlayed.toLocaleString()}</div>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            {played.toLocaleString()} of {received.toLocaleString()} requests made it into your sets.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="text-sm font-medium">No conversion data yet</div>
          <p className="mt-1 max-w-56 text-xs text-muted-foreground">
            Conversion appears after your rooms receive song requests.
          </p>
        </div>
      )}
    </div>
  )
}

function ActiveRoomCard() {
  const user = useAuthStore((state) => state.user)
  const summaryQuery = useActiveRoomSummaryQuery({
    enabled: Boolean(user?.hasActiveRoom),
  })
  const room = summaryQuery.data?.activeRoom

  return (
    <div className="flex min-h-[294px] flex-col rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Active room</span>
        {room ? (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        ) : null}
      </div>

      {summaryQuery.isLoading ? (
        <div className="mt-4 grid flex-1 gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-8 w-full" /></div>
      ) : room ? (
        <div className="mt-4 grid flex-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="flex flex-col">
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">{room.roomName}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{room.roomDescription}</p>
                </div>
                <span className="rounded-full border border-[#5046E6] bg-[#5046E6] px-2 py-1 text-xs text-white">{room.roomCode}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {([
                ["Received", room.requestsReceived],
                ["Played", room.requestsPlayed],
                ["Waiting", room.requestsWaiting],
                ["Votes", room.totalVotes],
              ] as const).map(([label, value]) => (
                <div key={label} className="rounded-md border p-2 text-center">
                  <NumberTicker value={value} className="block text-lg font-semibold" />
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">Latest requests</span>
                <span className="text-[10px] text-muted-foreground">Newest first</span>
              </div>
              {room.recentRequests.length > 0 ? (
                <div className="divide-y overflow-hidden rounded-md border">
                  {room.recentRequests.map((request) => (
                    <div key={request._id} className="flex items-center gap-2.5 px-2.5 py-2">
                      {request.track.albumArtUrl ? (
                        <img
                          src={request.track.albumArtUrl}
                          alt=""
                          className="size-8 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                          {request.track.title.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{request.track.title}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{request.track.artist}</div>
                      </div>
                      <span className="shrink-0 text-[10px] capitalize text-muted-foreground">
                        {request.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                  No requests yet.
                </div>
              )}
            </div>
            <Button
              asChild
              size="sm"
              className="mt-4 h-8 self-end px-3"
            >
              <Link to={`/room/admin/${room.roomCode}`}>Join?</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-sm font-medium">No active room</div>
          <p className="mt-1 max-w-56 text-xs text-muted-foreground">Create a room to see live request and engagement details here.</p>
          <Button asChild variant="outline" size="sm" className="mt-4 h-8"><Link to="/create-room"><Plus className="size-3.5" />New room</Link></Button>
        </div>
      )}
    </div>
  )
}

function getGlobalTrackCount(track: GlobalTrack) {
  return track.requestCount ?? track.totalSongRequests ?? track.totalRequests ?? track.count ?? 0
}

function formatSongActivity(value?: string | null) {
  if (!value) return "—"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function MostRequestedSongsTable() {
  const user = useAuthStore((state) => state.user)
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<"personal" | "global">("personal")
  const personalQuery = useMostRequestedSongsQuery(user?._id ?? "")
  const globalQuery = useGlobalTracksQuery()
  const rows = useMemo(() => {
    if (scope === "personal") {
      return (personalQuery.data?.songs ?? []).map((song) => ({
        id: song.spotifyTrackId,
        title: song.title,
        artist: song.artist,
        albumArtUrl: song.albumArtUrl,
        spotifyLink: song.spotifyLink,
        requests: song.requestCount,
        plays: song.playCount,
        votes: song.totalVotes,
        latestActivity: song.latestPlayedAt ?? song.latestRequestedAt,
      }))
    }

    return (globalQuery.data?.data ?? []).map((track, index) => ({
      id: track.spotifyTrackId ?? (typeof track._id === "string" ? track._id : `global-${index}`),
      title: typeof track._id === "object" ? track._id.title ?? "Unknown track" : track.title ?? track.name ?? track._id ?? "Unknown track",
      artist: typeof track._id === "object" ? track._id.artist ?? "Unknown artist" : track.artist ?? "Unknown artist",
      albumArtUrl: track.albumArtUrl,
      spotifyLink: track.spotifyLink,
      requests: getGlobalTrackCount(track),
      plays: track.playCount ?? 0,
      votes: track.totalVotes ?? 0,
      latestActivity: track.latestPlayedAt ?? track.latestRequestedAt,
    }))
  }, [globalQuery.data, personalQuery.data, scope])
  const filtered = rows.filter((item) =>
    `${item.title} ${item.artist}`.toLowerCase().includes(query.toLowerCase())
  )
  const isLoading = scope === "personal" ? personalQuery.isLoading : globalQuery.isLoading

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs..." className="h-8 pl-9" />
        </div>
        <div className="flex rounded-md border bg-muted/30 p-0.5">
          <Button
            variant={scope === "personal" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs shadow-none"
            onClick={() => setScope("personal")}
          >
            Your all time
          </Button>
          <Button
            variant={scope === "global" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs shadow-none"
            onClick={() => setScope("global")}
          >
            Global on Sway
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead><tr className="border-b text-left text-xs font-medium text-muted-foreground">
            <th className="w-14 px-4 py-3">#</th><th>Song</th><th>Artist</th><th className="text-right">Requests</th><th className="text-right">Plays</th><th className="text-right">Votes</th><th className="text-right">Played rate</th><th className="pr-4 text-right">Last activity</th>
          </tr></thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b last:border-0"><td className="px-4 py-3" colSpan={8}><Skeleton className="h-9 w-full" /></td></tr>
              ))
            ) : filtered.length > 0 ? filtered.map((song, index) => (
              <tr key={`${song.id}-${index}`} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                <td className="py-2.5">
                  <div className="flex min-w-52 items-center gap-3">
                    {song.albumArtUrl ? <img src={song.albumArtUrl} alt="" className="size-9 rounded-md object-cover" /> : <div className="flex size-9 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">{song.title.slice(0, 1).toUpperCase()}</div>}
                    {song.spotifyLink ? <a href={song.spotifyLink} target="_blank" rel="noreferrer" className="truncate font-medium hover:underline">{song.title}</a> : <span className="truncate font-medium">{song.title}</span>}
                  </div>
                </td>
                <td className="text-muted-foreground">{song.artist}</td>
                <td className="text-right font-medium">{song.requests.toLocaleString()}</td>
                <td className="text-right font-medium">{song.plays.toLocaleString()}</td>
                <td className="text-right text-muted-foreground">{song.votes.toLocaleString()}</td>
                <td className="text-right text-muted-foreground">{song.requests > 0 ? `${Math.round((song.plays / song.requests) * 100)}%` : "0%"}</td>
                <td className="pr-4 text-right text-muted-foreground">{formatSongActivity(song.latestActivity)}</td>
              </tr>
            )) : (
              <tr><td colSpan={8} className="h-24 text-center text-muted-foreground">No requested songs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
        <span>Showing {filtered.length} most requested song{filtered.length === 1 ? "" : "s"}</span>
        <span className="text-xs">{scope === "personal" ? "Across your rooms" : "Across all of Sway"}</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const totalsQuery = useAnalyticsTotalsQuery(user?._id ?? "")
  const requestActivityQuery = useRequestActivityQuery(user?._id ?? "", "7d")
  const requestActivity = requestActivityQuery.data?.data ?? []
  const requestActivityTicks = requestActivity.length > 1
    ? [requestActivity[0].date, requestActivity[requestActivity.length - 1].date]
    : undefined

  return (
    <>
      <header className="flex h-[61px] shrink-0 items-center gap-4 bg-card px-4 sm:px-6">
        <div className="flex items-center gap-3"><SidebarTrigger className="-ml-2" /><ChartSpline className="size-4 text-violet-500 dark:text-icon-gold" /><span className="text-sm font-semibold">Dashboard</span></div>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Welcome back, {user?.username ?? "DJ"}.
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A quick view of demand, crowd engagement, and proof points you can
            take into client conversations and consider when creating your next
            setlist.
          </p>
        </section>
        <StatCards
          totals={totalsQuery.data}
          isLoading={totalsQuery.isLoading && Boolean(user?._id)}
        />
        <TopSongs />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] xl:items-start">
          <div className="flex min-h-[294px] flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-sm font-medium">Request activity</span><span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">Past week</span></div><Button variant="ghost" size="icon" className="size-7"><MoreVertical className="size-4" /></Button></div>
            {requestActivityQuery.isLoading ? (
              <Skeleton className="h-[230px] w-full" />
            ) : (
              <ChartContainer config={{ requestsReceived: { label: "Received", color: "oklch(0.72 0.16 15)" }, requestsPlayed: { label: "Played", color: "oklch(0.75 0.15 65)" } }} className="h-[230px] w-full flex-1">
                <AreaChart data={requestActivity} margin={{ left: 4, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="receivedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-requestsReceived)" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="var(--color-requestsReceived)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="playedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-requestsPlayed)" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="var(--color-requestsPlayed)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="4 6"
                    strokeOpacity={0.38}
                  />
                  <XAxis
                    dataKey="date"
                    ticks={requestActivityTicks}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tick={{ fill: "var(--muted-foreground)", fillOpacity: 0.65, fontSize: 11 }}
                    tickFormatter={(value) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickCount={3}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tick={{ fill: "var(--muted-foreground)", fillOpacity: 0.55, fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area dataKey="requestsReceived" type="monotone" stroke="var(--color-requestsReceived)" fill="url(#receivedGradient)" strokeWidth={2} />
                  <Area dataKey="requestsPlayed" type="monotone" stroke="var(--color-requestsPlayed)" fill="url(#playedGradient)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </div>
          <RequestConversionCard
            totals={totalsQuery.data}
            isLoading={totalsQuery.isLoading && Boolean(user?._id)}
          />
        </div>
        <ActiveRoomCard />
        <MostRequestedSongsTable />
      </div>
    </>
  )
}

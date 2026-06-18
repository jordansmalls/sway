import {
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  Globe2,
  ListOrdered,
  Trophy,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts"

import {
  useGlobalArtistsQuery,
  useGlobalTotalsQuery,
  useGlobalTracksQuery,
  useAnalyticsTotalsQuery,
  useMostPlayedArtistsQuery,
  useMostPlayedSongsQuery,
  useMostRequestedSongsQuery,
  useMostUpvotedSongsQuery,
  type GlobalTrack,
  type AnalyticsSong,
} from "@/api/analytics"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuthStore } from "@/stores/auth-store"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import { useNavigate } from "react-router-dom"

const artistChartConfig = {
  playCount: {
    label: "Plays",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig

const requestMixChartConfig = {
  received: {
    label: "Requests received",
    color: "var(--color-chart-1)",
  },
  played: {
    label: "Requests played",
    color: "var(--color-chart-4)",
  },
} satisfies ChartConfig

const globalArtistChartConfig = {
  requests: {
    label: "Requests",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString()
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%"
  }

  return `${Math.round(value)}%`
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not played"
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function getInitials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
}

function getGlobalCount(
  item: Pick<
    GlobalTrack,
    "requestCount" | "totalRequests" | "totalSongRequests" | "count"
  >
) {
  return (
    item.requestCount ?? item.totalSongRequests ?? item.totalRequests ?? item.count ?? 0
  )
}

function getGlobalTrackTitle(track: GlobalTrack) {
  if (typeof track._id === "object") {
    return track._id.title ?? "Unknown track"
  }

  return track.title ?? track.name ?? track._id ?? "Unknown track"
}

function getGlobalTrackArtist(track: GlobalTrack) {
  if (typeof track._id === "object") {
    return track._id.artist ?? "Unknown artist"
  }

  return track.artist ?? "Unknown artist"
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: {
  title: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function GlobalTracksTable({
  tracks,
  emptyMessage,
}: {
  tracks: GlobalTrack[]
  emptyMessage: string
}) {
  if (tracks.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Track</TableHead>
          <TableHead className="text-right">Requests</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tracks.slice(0, 10).map((track, index) => {
          const title = getGlobalTrackTitle(track)
          const artist = getGlobalTrackArtist(track)
          const spotifyLink = track.spotifyLink

          return (
            <TableRow key={`${track.spotifyTrackId ?? title}-${index}`}>
              <TableCell className="text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell>
                <div className="flex min-w-56 items-center gap-3">
                  {track.albumArtUrl ? (
                    <img
                      src={track.albumArtUrl}
                      alt=""
                      className="size-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                      {getInitials(title)}
                    </div>
                  )}
                  <div className="min-w-0">
                    {spotifyLink ? (
                      <a
                        href={spotifyLink}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate font-medium hover:underline"
                      >
                        {title}
                      </a>
                    ) : (
                      <div className="truncate font-medium">{title}</div>
                    )}
                    <div className="truncate text-xs text-muted-foreground">
                      {artist}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatNumber(getGlobalCount(track))}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function SongsTable({
  songs,
  metricLabel,
  getMetricValue,
  emptyMessage,
}: {
  songs: AnalyticsSong[]
  metricLabel: string
  getMetricValue: (song: AnalyticsSong) => number
  emptyMessage: string
}) {
  if (songs.length === 0) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Track</TableHead>
          <TableHead className="text-right">{metricLabel}</TableHead>
          <TableHead className="hidden text-right md:table-cell">
            Last activity
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {songs.slice(0, 8).map((song, index) => (
          <TableRow key={`${song.spotifyTrackId}-${index}`}>
            <TableCell className="text-muted-foreground">
              {index + 1}
            </TableCell>
            <TableCell>
              <div className="flex min-w-56 items-center gap-3">
                {song.albumArtUrl ? (
                  <img
                    src={song.albumArtUrl}
                    alt=""
                    className="size-10 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                    {getInitials(song.title)}
                  </div>
                )}
                <div className="min-w-0">
                  <a
                    href={song.spotifyLink}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate font-medium hover:underline"
                  >
                    {song.title}
                  </a>
                  <div className="truncate text-xs text-muted-foreground">
                    {song.artist}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatNumber(getMetricValue(song))}
            </TableCell>
            <TableCell className="hidden text-right text-muted-foreground md:table-cell">
              {formatDate(song.latestPlayedAt ?? song.latestRequestedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const userId = user?._id ?? ""
  const totalsQuery = useAnalyticsTotalsQuery(userId)
  const artistsQuery = useMostPlayedArtistsQuery(userId)
  const requestedSongsQuery = useMostRequestedSongsQuery(userId)
  const playedSongsQuery = useMostPlayedSongsQuery(userId)
  const upvotedSongsQuery = useMostUpvotedSongsQuery(userId)
  const globalTotalsQuery = useGlobalTotalsQuery()
  const globalTracksQuery = useGlobalTracksQuery()
  const globalArtistsQuery = useGlobalArtistsQuery()

  const totals = totalsQuery.data
  const globalTotals = globalTotalsQuery.data
  const requestPlayRate =
    totals?.requestsReceived && totals.requestsReceived > 0
      ? (totals.requestsPlayed / totals.requestsReceived) * 100
      : 0
  const averageRequestsPerRoom =
    totals?.roomsHosted && totals.roomsHosted > 0
      ? totals.requestsReceived / totals.roomsHosted
      : 0
  const artists =
    artistsQuery.data?.artists
      .slice(0, 8)
      .map((artist) => ({
        artist:
          artist.artist.length > 16
            ? `${artist.artist.slice(0, 16)}...`
            : artist.artist,
        playCount: artist.playCount,
      })) ?? []
  const requestMixData = [
    {
      name: "Received",
      value: totals?.requestsReceived ?? 0,
      fill: "var(--color-received)",
    },
    {
      name: "Played",
      value: totals?.requestsPlayed ?? 0,
      fill: "var(--color-played)",
    },
  ]
  const globalArtists =
    globalArtistsQuery.data?.data
      .slice(0, 10)
      .map((artist) => {
        const artistName = artist.artist ?? artist.name ?? artist._id ?? "Unknown"

        return {
          artist:
            artistName.length > 16
              ? `${artistName.slice(0, 16)}...`
              : artistName,
          requests: getGlobalCount(artist),
        }
      }) ?? []
  const isLoadingTotals = totalsQuery.isLoading && Boolean(userId)
  const hasError =
    totalsQuery.isError ||
    artistsQuery.isError ||
    requestedSongsQuery.isError ||
    playedSongsQuery.isError ||
    upvotedSongsQuery.isError ||
    globalTotalsQuery.isError ||
    globalTracksQuery.isError ||
    globalArtistsQuery.isError

  const hn = () => {
    navigate("/create-room")
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 md:p-6">
          <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              {/* <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Radio className="size-3" />
                  Analytics
                </Badge>
              </div> */}
              <h1 className="mt-3 text-3xl font-bold tracking-normal md:text-4xl">
                Welcome Back, {user?.username ?? 'DJ'}.
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                A quick view of demand, crowd engagement, and proof points you
                can take into client conversations and consider when creating
                your next setlist.
              </p>
            </div>
            {/* <Button
              onClick={hn}
              className="w-full gap-2 md:w-auto transition duration-300"
            >
              Create Room
            </Button> */}
          </section>

          {!userId ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Sign in to view your analytics dashboard.
              </CardContent>
            </Card>
          ) : (
            <>
              {hasError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  Some analytics could not be loaded. Try refreshing in a
                  moment.
                </div>
              ) : null}

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Rooms Hosted"
                  value={formatNumber(totals?.roomsHosted)}
                  description="Events with measurable request activity."
                  icon={CalendarDays}
                  isLoading={isLoadingTotals}
                />
                <MetricCard
                  title="Requests Received"
                  value={formatNumber(totals?.requestsReceived)}
                  description="Total requests received all time."
                  icon={CheckCheck}
                  isLoading={isLoadingTotals}
                />
                <MetricCard
                  title="Requests Played"
                  value={formatNumber(totals?.requestsPlayed)}
                  description={`You've played ${formatPercent(requestPlayRate)} of all received requests.`}
                  icon={CheckCircle2}
                  isLoading={isLoadingTotals}
                />
                <MetricCard
                  title="Average Requests per Room"
                  value={averageRequestsPerRoom.toFixed(1)}
                  description="How engaged your audiences are."
                  icon={ListOrdered}
                  isLoading={isLoadingTotals}
                />
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Most Played Artists</CardTitle>
                    <CardDescription>
                      Artists you repeatedly convert from room energy into
                      actual plays.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {artistsQuery.isLoading ? (
                      <Skeleton className="h-72 w-full" />
                    ) : artists.length > 0 ? (
                      <ChartContainer
                        config={artistChartConfig}
                        className="h-72 w-full"
                      >
                        <BarChart data={artists} margin={{ left: 8, right: 8 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="artist"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                          />
                          <Bar
                            dataKey="playCount"
                            fill="var(--color-playCount)"
                            radius={[6, 6, 2, 2]}
                          />
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <EmptyState message="Played artist data will appear after requests are completed." />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Request Conversion</CardTitle>
                    <CardDescription>
                      Share how often audience requests become part of the set.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTotals ? (
                      <Skeleton className="h-72 w-full" />
                    ) : totals?.requestsReceived ? (
                      <div className="grid gap-4">
                        <ChartContainer
                          config={requestMixChartConfig}
                          className="mx-auto h-56 w-full max-w-72"
                        >
                          <PieChart>
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent />}
                            />
                            <Pie
                              data={requestMixData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={54}
                              outerRadius={84}
                              paddingAngle={3}
                            >
                              {requestMixData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ChartContainer>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border p-3">
                            <div className="text-xs text-muted-foreground">
                              Received
                            </div>
                            <div className="mt-1 text-xl font-semibold">
                              {formatNumber(totals.requestsReceived)}
                            </div>
                          </div>
                          <div className="rounded-lg border p-3">
                            <div className="text-xs text-muted-foreground">
                              Played
                            </div>
                            <div className="mt-1 text-xl font-semibold">
                              {formatNumber(totals.requestsPlayed)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState message="Request conversion appears once rooms start receiving requests." />
                    )}
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {/* <Music2 className="size-4" /> */}
                      Most Requested Songs
                    </CardTitle>
                    <CardDescription>
                      Crowd favorites clients can recognize immediately.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {requestedSongsQuery.isLoading ? (
                      <Skeleton className="h-80 w-full" />
                    ) : (
                      <SongsTable
                        songs={requestedSongsQuery.data?.songs ?? []}
                        metricLabel="Requests"
                        getMetricValue={(song) => song.requestCount}
                        emptyMessage="Requested songs will appear after guests submit tracks."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {/* <Disc3 className="size-4" /> */}
                      Most Played Songs
                    </CardTitle>
                    <CardDescription>
                      Tracks that made it into the room and proved demand.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {playedSongsQuery.isLoading ? (
                      <Skeleton className="h-80 w-full" />
                    ) : (
                      <SongsTable
                        songs={playedSongsQuery.data?.songs ?? []}
                        metricLabel="Requests"
                        getMetricValue={(song) => song.requestCount}
                        emptyMessage="Played songs will appear once requests are marked played."
                      />
                    )}
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Most Upvoted Songs</CardTitle>
                    <CardDescription>
                      The strongest negotiation-ready signal of crowd consensus.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upvotedSongsQuery.isLoading ? (
                      <Skeleton className="h-80 w-full" />
                    ) : (
                      <SongsTable
                        songs={upvotedSongsQuery.data?.songs ?? []}
                        metricLabel="Votes"
                        getMetricValue={(song) => song.totalVotes}
                        emptyMessage="Upvoted songs will appear as guests vote on requests."
                      />
                    )}
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {/* <Globe2 className="size-4" /> */}
                      Top Requested Artists
                    </CardTitle>
                    <CardDescription>
                      The most requested artists on Sway across all rooms.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {globalArtistsQuery.isLoading ? (
                      <Skeleton className="h-80 w-full" />
                    ) : globalArtists.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border p-3">
                            <div className="text-xs text-muted-foreground">
                              Global Sway Requests
                            </div>
                            <div className="mt-1 text-xl font-semibold">
                              {formatNumber(globalTotals?.totalRequests)}
                            </div>
                          </div>
                          <div className="rounded-lg border p-3">
                            <div className="text-xs text-muted-foreground">
                              Global Sway Rooms
                            </div>
                            <div className="mt-1 text-xl font-semibold">
                              {formatNumber(globalTotals?.totalRooms)}
                            </div>
                          </div>
                        </div>
                        <ChartContainer
                          config={globalArtistChartConfig}
                          className="h-64 w-full"
                        >
                          <BarChart
                            data={globalArtists}
                            margin={{ left: 8, right: 8 }}
                          >
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="artist"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={10}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent />}
                            />
                            <Bar
                              dataKey="requests"
                              fill="var(--color-requests)"
                              radius={[6, 6, 2, 2]}
                            />
                          </BarChart>
                        </ChartContainer>
                      </div>
                    ) : (
                      <EmptyState message="Global artist trends will appear once Sway has request activity." />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {/* <Trophy className="size-4" /> */}
                      Top Requested Tracks
                    </CardTitle>
                    <CardDescription>
                      The tracks that the crowds are asking for the most across all rooms on Sway.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {globalTracksQuery.isLoading ? (
                      <Skeleton className="h-80 w-full" />
                    ) : (
                      <GlobalTracksTable
                        tracks={globalTracksQuery.data?.data ?? []}
                        emptyMessage="Global track trends will appear once Sway has request activity."
                      />
                    )}
                  </CardContent>
                </Card>
              </section>
            </>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

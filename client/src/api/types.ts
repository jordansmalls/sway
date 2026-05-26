export type ApiMessageResponse = {
  success: true
  message: string
}

export type User = {
  _id: string
  username?: string
  email: string
  active?: boolean
  hasActiveRoom: boolean
  hasUsername: boolean
  admin?: boolean
  createdAt: string
  updatedAt: string
}

export type Room = {
  _id: string
  roomName: string
  roomDescription: string
  roomCode: string
  roomQr?: string
  roomCreator?: string | User
  active: boolean
  createdAt: string
  updatedAt: string
}

export type RequestStatus = "pending" | "playing" | "played" | "rejected"

export type RequestTrack = {
  spotifyTrackId: string
  title: string
  artist: string
  albumArtUrl?: string
  spotifyLink: string
  spotifyURI: string
}

export type SongRequest = {
  _id: string
  roomId: string | Room
  status: RequestStatus
  votes: number
  playedAt: string | null
  requestedBy?: string
  completedAt: string | null
  track: RequestTrack
  createdAt: string
  updatedAt: string
}

export type QueueRequest = {
  id: string
  title: string
  artist: string
  albumArtUrl?: string
  spotifyUri: string
  spotifyLink: string
  status: RequestStatus
  votes: number
  requestedAt: string
  requestedBy?: string
  playedAt: string | null
}

export type SpotifyTrack = {
  id: string
  name: string
  artist: string
  duration_ms: number
  albumImage?: string
  uri: string
}

export type SpotifyTrackDetails = SpotifyTrack & {
  album: string
  popularity: number
  previewUrl?: string | null
}

export type TracklistExportItem = {
  title: string
  artist: string
  playedAt: string
}

export type RequestsExportItem = {
  title: string
  artist: string
  votes: number
  status: RequestStatus
  playedAt: string
  requestedAt: string
  requestedBy?: string
}

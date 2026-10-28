const createSpotifyUriLink = (trackId: string) => `spotify:track:${trackId}`;
const createSpotifyLink = (trackId: string) => `https://open.spotify.com/track/${trackId}`;

export { createSpotifyLink, createSpotifyUriLink };

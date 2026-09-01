// Snapshot of real track metadata from the app's Spotify API, verified 2026-08-30.
// The initial queue and recommendations use these snapshots; live search covers Spotify's catalog.
export const demoSeedTracks = [
    {
        "id": "0DiWol3AO6WpXZgp0goxAV",
        "name": "One More Time",
        "artist": "Daft Punk",
        "duration_ms": 320357,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2731e81bff9807a9e629fce5ade",
        "uri": "spotify:track:0DiWol3AO6WpXZgp0goxAV"
    },
    {
        "id": "39LLxExYz6ewLAcYrzQQyP",
        "name": "Levitating",
        "artist": "Dua Lipa",
        "duration_ms": 203807,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b273c88bae7846e62a8ba59ee0bd",
        "uri": "spotify:track:39LLxExYz6ewLAcYrzQQyP"
    },
    {
        "id": "7MXVkk9YMctZqd1Srtv4MB",
        "name": "Starboy",
        "artist": "The Weeknd, Daft Punk",
        "duration_ms": 230453,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452",
        "uri": "spotify:track:7MXVkk9YMctZqd1Srtv4MB"
    },
    {
        "id": "3PfIrDoz19wz7qK7tYeu62",
        "name": "Don't Start Now",
        "artist": "Dua Lipa",
        "duration_ms": 183290,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b273c88bae7846e62a8ba59ee0bd",
        "uri": "spotify:track:3PfIrDoz19wz7qK7tYeu62"
    },
    {
        "id": "5W3cjX2J3tjhG8zb6u0qHn",
        "name": "Harder, Better, Faster, Stronger",
        "artist": "Daft Punk",
        "duration_ms": 226413,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2731e81bff9807a9e629fce5ade",
        "uri": "spotify:track:5W3cjX2J3tjhG8zb6u0qHn"
    },
    {
        "id": "69kOkLUCkxIZYexIgSG8rq",
        "name": "Get Lucky (feat. Pharrell Williams and Nile Rodgers)",
        "artist": "Daft Punk, Pharrell Williams, Nile Rodgers",
        "duration_ms": 369626,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937",
        "uri": "spotify:track:69kOkLUCkxIZYexIgSG8rq"
    },
    {
        "id": "6D8y7Bck8h11byRY88Pt2z",
        "name": "Houdini",
        "artist": "Dua Lipa",
        "duration_ms": 185917,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2732f8790ed72296c2614607575",
        "uri": "spotify:track:6D8y7Bck8h11byRY88Pt2z"
    },
    {
        "id": "1pKYYY0dkg23sQQXi0Q5zN",
        "name": "Around the World",
        "artist": "Daft Punk",
        "duration_ms": 429533,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2738ac778cc7d88779f74d33311",
        "uri": "spotify:track:1pKYYY0dkg23sQQXi0Q5zN"
    },
    {
        "id": "5b5cPscqVEMChvDqscVw26",
        "name": "Training Season",
        "artist": "Dua Lipa",
        "duration_ms": 209487,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2732f8790ed72296c2614607575",
        "uri": "spotify:track:5b5cPscqVEMChvDqscVw26"
    },
    {
        "id": "2cGxRwrMyEAp8dEbuZaVv6",
        "name": "Instant Crush (feat. Julian Casablancas)",
        "artist": "Daft Punk, Julian Casablancas",
        "duration_ms": 337560,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2739b9b36b0e22870b9f542d937",
        "uri": "spotify:track:2cGxRwrMyEAp8dEbuZaVv6"
    },
    {
        "id": "4zu9wo2FXoBSsKjO6tRB3R",
        "name": "Robot Rock",
        "artist": "Daft Punk",
        "duration_ms": 287720,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2734b10d0325d3f46b212091eaa",
        "uri": "spotify:track:4zu9wo2FXoBSsKjO6tRB3R"
    },
    {
        "id": "73mlvsfJM2qwlDUJxeaatI",
        "name": "Daft Punk Is Playing at My House",
        "artist": "LCD Soundsystem",
        "duration_ms": 314556,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b273a0ceab8776e20d715e6b9fd2",
        "uri": "spotify:track:73mlvsfJM2qwlDUJxeaatI"
    }
];

// Additional demo recommendations, verified through Spotify on 2026-08-30.
// These do not change the initial request queue.
export const demoExtraRecommendationTracks = [
    {
        "id": "3sK8wGT43QFpWrvNQsrQya",
        "name": "DtMF",
        "artist": "Bad Bunny",
        "duration_ms": 237117,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b273bbd45c8d36e0e045ef640411",
        "uri": "spotify:track:3sK8wGT43QFpWrvNQsrQya"
    },
    {
        "id": "4RvWPyQ5RL0ao9LPZeSouE",
        "name": "Everybody Wants To Rule The World",
        "artist": "Tears For Fears",
        "duration_ms": 251488,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27322463d6939fec9e17b2a6235",
        "uri": "spotify:track:4RvWPyQ5RL0ao9LPZeSouE"
    },
    {
        "id": "1IHWl5LamUGEuP4ozKQSXZ",
        "name": "Tití Me Preguntó",
        "artist": "Bad Bunny",
        "duration_ms": 243716,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27349d694203245f241a1bcaa72",
        "uri": "spotify:track:1IHWl5LamUGEuP4ozKQSXZ"
    },
    {
        "id": "4Dvkj6JhhA12EX05fT7y2e",
        "name": "As It Was",
        "artist": "Harry Styles",
        "duration_ms": 167303,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27382ce362511fb3d9dda6578ee",
        "uri": "spotify:track:4Dvkj6JhhA12EX05fT7y2e"
    },
    {
        "id": "1vLqigPHwiFnXsfrLMehV1",
        "name": "Espresso",
        "artist": "Sabrina Carpenter",
        "duration_ms": 175459,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b273255ec9ddd8af81fd9aba2ced",
        "uri": "spotify:track:1vLqigPHwiFnXsfrLMehV1"
    },
    {
        "id": "6dOtVTDdiauQNBQEDOtlAB",
        "name": "BIRDS OF A FEATHER",
        "artist": "Billie Eilish",
        "duration_ms": 210373,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27371d62ea7ea8a5be92d3c1f62",
        "uri": "spotify:track:6dOtVTDdiauQNBQEDOtlAB"
    },
    {
        "id": "6eDApnV9Jdb1nYahOlbbUh",
        "name": "One Time",
        "artist": "Justin Bieber",
        "duration_ms": 215866,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2737c3bb9f74a98f60bdda6c9a7",
        "uri": "spotify:track:6eDApnV9Jdb1nYahOlbbUh"
    },
    {
        "id": "6QewNVIDKdSl8Y3ycuHIei",
        "name": "Even Flow",
        "artist": "Pearl Jam",
        "duration_ms": 292579,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2732d0e5ab5bd2e234fbcffa3e0",
        "uri": "spotify:track:6QewNVIDKdSl8Y3ycuHIei"
    },
    {
        "id": "7J1uxwnxfQLu4APicE5Rnj",
        "name": "Billie Jean",
        "artist": "Michael Jackson",
        "duration_ms": 293802,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27332a7d87248d1b75463483df5",
        "uri": "spotify:track:7J1uxwnxfQLu4APicE5Rnj"
    },
    {
        "id": "2xLMifQCjDGFmkHkpNLD9h",
        "name": "SICKO MODE",
        "artist": "Travis Scott",
        "duration_ms": 312820,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b273daec894c14c0ca42d76eeb32",
        "uri": "spotify:track:2xLMifQCjDGFmkHkpNLD9h"
    },
    {
        "id": "42VsgItocQwOQC3XWZ8JNA",
        "name": "FE!N (feat. Playboi Carti)",
        "artist": "Travis Scott, Playboi Carti",
        "duration_ms": 191700,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27304481c826dd292e5e4983b3f",
        "uri": "spotify:track:42VsgItocQwOQC3XWZ8JNA"
    },
    {
        "id": "1p80LdxRV74UKvL8gnD7ky",
        "name": "Blank Space",
        "artist": "Taylor Swift",
        "duration_ms": 231826,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2739abdf14e6058bd3903686148",
        "uri": "spotify:track:1p80LdxRV74UKvL8gnD7ky"
    },
    {
        "id": "3e9HZxeyfWwjeyPAMmWSSQ",
        "name": "thank u, next",
        "artist": "Ariana Grande",
        "duration_ms": 207320,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27356ac7b86e090f307e218e9c8",
        "uri": "spotify:track:3e9HZxeyfWwjeyPAMmWSSQ"
    },
    {
        "id": "0sSRLXxknVTQDStgU1NqpY",
        "name": "Hours In Silence",
        "artist": "Drake, 21 Savage",
        "duration_ms": 399153,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27302854a7060fccc1a66a4b5ad",
        "uri": "spotify:track:0sSRLXxknVTQDStgU1NqpY"
    },
    {
        "id": "29iva9idM6rFCPUlu7Rhxl",
        "name": "YUKON",
        "artist": "Justin Bieber",
        "duration_ms": 163866,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b273d65c4773bc5061fd27facc5b",
        "uri": "spotify:track:29iva9idM6rFCPUlu7Rhxl"
    },
    {
        "id": "22NHkFYbgxB2Zirj29Gbp8",
        "name": "oh yeah?",
        "artist": "Steve Lacy",
        "duration_ms": 170584,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2734ea9ba86cd9506a004bab042",
        "uri": "spotify:track:22NHkFYbgxB2Zirj29Gbp8"
    }
];

// Keep the request queue separate from the curated recommendation selection.
const retainedRecommendationIds = new Set([
    "0DiWol3AO6WpXZgp0goxAV", // One More Time
    "39LLxExYz6ewLAcYrzQQyP", // Levitating
    "73mlvsfJM2qwlDUJxeaatI", // LCD Soundsystem, not a Daft Punk recording
]);
export const demoRecommendationTracks = [
    ...demoSeedTracks.filter((track) => retainedRecommendationIds.has(track.id)),
    ...demoExtraRecommendationTracks,
];

// Active queue, in presentation order. Verified through Spotify on 2026-08-30.
export const demoQueueTracks = [
    {
        "id": "3sK8wGT43QFpWrvNQsrQya",
        "name": "DtMF",
        "artist": "Bad Bunny",
        "duration_ms": 237117,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b273bbd45c8d36e0e045ef640411",
        "uri": "spotify:track:3sK8wGT43QFpWrvNQsrQya"
    },
    {
        "id": "3azJifCSqg9fRij2yKIbWz",
        "name": "The Color Violet",
        "artist": "Tory Lanez",
        "duration_ms": 226466,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2730c5f23cbf0b1ab7e37d0dc67",
        "uri": "spotify:track:3azJifCSqg9fRij2yKIbWz"
    },
    {
        "id": "6TWbY1dq8eYtFiMiGdBlOa",
        "name": "Free Your Mind",
        "artist": "Prospa, Cloonee, Sybil",
        "duration_ms": 201700,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27338974737cba5770d9dba1cd6",
        "uri": "spotify:track:6TWbY1dq8eYtFiMiGdBlOa"
    },
    {
        "id": "2mzM4Y0Rnx2BDZqRnhQ5Q6",
        "name": "Free Mind",
        "artist": "Tems",
        "duration_ms": 247578,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b2730ab4d3e1c0b5c5e453287a4c",
        "uri": "spotify:track:2mzM4Y0Rnx2BDZqRnhQ5Q6"
    },
    {
        "id": "0GjEhVFGZW8afUYGChu3Rr",
        "name": "Dancing Queen",
        "artist": "ABBA",
        "duration_ms": 230400,
        "albumImage": "https://i.scdn.co/image/ab67616d0000b27370f7a1b35d5165c85b95a0e0",
        "uri": "spotify:track:0GjEhVFGZW8afUYGChu3Rr"
    }
];

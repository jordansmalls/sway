![Sway - Live song request management for DJ's and event organizers](/readme-assets/sway.gif)

<p align="center">
<b>Sway is a real-time platform that allows guests to submit song requests during live events while giving DJs complete control over what gets played. Guests can join a room by scanning a QR code, search Spotify's catalog, submit requests, and vote on songs—all without creating an account.
Built for DJs, weddings, parties, clubs, corporate events, and live entertainment.</b>
</p>

---

<h2>Why Sway?</h2>

For a long time, DJs have wished for a more elegant, and safer, way to handle song requests during gigs. The days of paper slips, text messages, social media DMs, or equipment ruining spilled cocktail shouts leaning over the DJ booth are finally over.

Sway centralizes the entire experience into a single platform where guests can participate and DJs stay in control. Guests get a better event experience. DJs get a cleaner workflow. Everyone wins.

By integrating Spotify's Web API, guests have access to requesting over 570 million songs, all in real-time. Other room guests can upvote requests, letting the DJ know what the people want!

When parties are over, tracklists are available to both DJs and room guests. Futhermore, DJs have access to analytics that will help power their next event, based on all of their Sway successes.

---


<h2>Demo</h2>

Demo Video coming soon.


---

<h2>Features</h2>

<h3>Guests:</h3>

- Join in on the fun instantly via QR code or entering a room code
- Search Spotify's music catalog
- Submit song requests in seconds
- Vote on existing requests
- **No account required**


<h3>DJs & Event Organizers:</h3>

- Create and manage live request rooms
- Control incoming requests (mark playing, mark played, or remove requests from queue)
- View crowd favorites through voting
- End rooms when events finish
- Access event request history
- Export both tracklist and song request data

<h3>Spotify Integration:</h3>

- Real-time track search
- Album artwork
- Artist information
- Track metadata
- Familiar music discovery experience

---

<h2>How it Works</h2>

1. DJ creates a room, providing a name and description.
2. Guests can either scan the QR code or enter the automatically generated room code to join the room.
3. Guests search Spotify's library to make song requests.
4. Requests appear instantly in the request queue.
5. Guests vote on songs they want to hear.
6. DJ manages the queue and controls playback decisions.

---




<h2>Screenshots</h2>


<h3>Onboarding</h3>

<h4>Signup</h4>
<img src="/readme-assets/signup.png" alt="Signup screen for Sway" />

<h4>Login</h4>
<img src="/readme-assets/login.png" alt="Login screen for Sway" />

<h4>Signup</h4>
<img src="/readme-assets/handle.png" alt="Username selection screen for Sway" />




<h3>Dashboard</h3>
<img src="/readme-assets/dashboard-one.png" alt="Dashboard screen for Sway" />
<img src="/readme-assets/dashboard-two.png" alt="Dashboard screen for Sway" />

See what songs are hot across your rooms, and across Sway globally.


<h3>Profile</h3>
<img src="/readme-assets/profile.png" alt="Username selection screen for Sway" />

Shareable link, showcasing total Sway usage, top played artists, top played songs, and more.


<h3>Past Rooms</h3>
<img src="/readme-assets/past-rooms.png" alt="Past Rooms screen for Sway" />

Table showing past rooms, giving users the ability to export tracklists and request lists in JSON, TXT, or CSV format. Users can also delete their past rooms from Sway.


<h3>Settings</h3>
<img src="/readme-assets/settings.png" alt="Past Rooms screen for Sway" />

Users can update their username, email, or password. Accounts can be deleted as well.

---


<h3>Rooms (admin view)</h3>
<img src="/readme-assets/room-admin.png" alt="Past Rooms screen for Sway" />

Receive and manage live song requests, by marking as playing, played, or removing them from the queue.


<h3>Rooms (guest mobile view)</h3>
<img src="/readme-assets/room-guest.png" alt="Past Rooms screen for Sway" />





---

<h2>Tech Stack</h2>

### Client

- React
- TypeScript
- React Router
- Tanstack Query
- Zustand
- Axios
- TailwindCSS
- Shadcn/ui
- Recharts
- Socket.io-client


### Server

- Express
- Mongoose
- CORS
- Morgan
- Validator
- Jsonwebtoken
- Bcryptjs
- Dotenv
- Axios
- Cookie-parser
- Express-rate-limit
- Qrcode
- Csv-writer
- Socket.io


### Third-Party Services

* Spotify Web API

---

<h2>Architecture</h2>

```text
Client
      │
      ▼
     API
      │
      ├── MongoDB
      │
      └── Spotify API
```

---

<h2>License</h2>

MIT

---

<h2>Contact</h2>

If you have any questions, comments or concerns about Sway, I'd love to talk. You can find me on twitter @jsmallsdev, or feel free to email me at hi@jsmalls.net.
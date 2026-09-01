import {
    createBrowserRouter,
    createRoutesFromElements,
    Navigate,
    Route,
 } from "react-router-dom"


import App from "../App"
import ProtectedRoute from "./protected-route"
import PublicOnlyRoute from "./public-only-route"
import { AppLayout } from "@/components/sidebar/app-layout"
import { PrivacyPolicy } from "../pages/def/PrivacyPolicy"
import { TermsAndConditions } from "../pages/def/TermsAndConditions"
import Room from "../pages/rooms/Room"
import JoinRoom from "../pages/rooms/JoinRoom"
import RoomDisplay from "../pages/rooms/RoomDisplay"
import Tracklist from "../pages/rooms/Tracklist"
import RoomEnded from "../pages/rooms/RoomEnded"
import Profile from "../pages/Profile"

// auth
import Login from "../pages/auth/Login"
import Signup from "../pages/auth/Signup"



// protected routes
import CreateUsername from "../pages/auth/CreateUsername"
import Insights from "@/pages/Insights"
import Dashboard from "@/pages/Dashboard"
import Settings from '../pages/auth/Settings';
import CreateRoom from "../pages/rooms/CreateRoom"
import RoomAdmin from "../pages/rooms/RoomAdmin"
import NotRoomOwner from "../pages/def/NotRoomOwner"
import PastRooms from "../pages/rooms/PastRooms"


import Home from "../pages/Home"
import Demo from "../pages/Demo"
import DemoExperience from "../pages/DemoExperience"
import NotFound from "../pages/def/NotFound"



export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route path="*" element={<NotFound />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/demo" element={<Demo />} />
      <Route element={<DemoExperience />}>
        <Route path="/demo/dj" element={null} />
        <Route path="/demo/guest" element={null} />
        <Route path="/demo/room/:roomCode" element={<Room />} />
        <Route path="/demo/room/:roomCode/display" element={<RoomDisplay />} />
        <Route path="/demo/:roomCode/tracklist" element={<Tracklist />} />
        <Route element={<AppLayout />}>
          <Route path="/demo/room/admin/:roomCode" element={<RoomAdmin />} />
        </Route>
      </Route>

      <Route path="/room/:roomCode" element={<Room />} />
      <Route path="/room/:roomCode/display" element={<RoomDisplay />} />
      <Route path="/join-room" element={<JoinRoom />} />

      <Route path="/room-ended" element={<RoomEnded />} />
      <Route path="/:roomCode/tracklist" element={<Tracklist />} />
      <Route path="/:username" element={<Profile />} />

      <Route element={<PublicOnlyRoute />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/username" element={<CreateUsername />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard-test" element={<Navigate to="/dashboard" replace />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/not-room-owner" element={<NotRoomOwner />} />
          <Route path="/room/admin/:roomCode" element={<RoomAdmin />} />
          <Route path="/past-rooms" element={<PastRooms />} />
        </Route>
      </Route>
    </Route>
  )
);

import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
 } from "react-router-dom"


import App from "../App"
import ProtectedRoute from "./protected-route"
import PublicOnlyRoute from "./public-only-route"
import { PrivacyPolicy } from "../pages/def/PrivacyPolicy"
import { TermsAndConditions } from "../pages/def/TermsAndConditions"


// auth
import Login from "../pages/auth/Login"
import Signup from "../pages/auth/Signup"



// protected routes
import CreateUsername from "../pages/auth/CreateUsername"
import Dashboard from "@/pages/Dashboard"
import Settings from '../pages/auth/Settings';
import CreateRoom from "../pages/rooms/CreateRoom"


import Home from "../pages/Home"



export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      <Route element={<PublicOnlyRoute />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route index path="/dashboard" element={<Dashboard />} />
        <Route path="/username" element={<CreateUsername />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Route>
  )
);
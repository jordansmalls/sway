import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
 } from "react-router-dom"


import App from "../App"
import ProtectedRoute from "./protected-route"
import PublicOnlyRoute from "./public-only-route"

// auth
import Login from "../pages/auth/Login"
import Signup from "../pages/auth/Signup"



// protected routes
import CreateUsername from "../pages/auth/CreateUsername"
import Dashboard from "@/pages/Dashboard"


import Home from "../pages/Home"



export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>

      <Route element={<PublicOnlyRoute />}>
        <Route index element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>
      

      {/* protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route index path="/dashboard" element={<Dashboard />} />
        <Route path="/username" element={<CreateUsername />} />
      </Route>
    </Route>
  )
);
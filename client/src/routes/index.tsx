import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
 } from "react-router-dom"


import App from "../App"

// auth
import Login from "../pages/auth/Login"
import Signup from "../pages/auth/Signup"

// eventually protected route
import CreateUsername from "../pages/auth/CreateUsername"


import Home from "../pages/Home"


export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route index element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/username" element={<CreateUsername />} />
    </Route>
  )
);
import { createBrowserRouter, Outlet } from "react-router"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Home />
    },
    {
        element: <Outlet />,
        children: [
        ]
    },
    {
        path: "*",
        element: <NotFound />
    }
])
import { Suspense, lazy } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppRoot } from "@/components/app-root"
import { Skeleton } from "@/components/ui/skeleton"

const InstallPage = lazy(() => import("@/pages/install-page").then((module) => ({ default: module.InstallPage })))
const LoginPage = lazy(() => import("@/pages/login-page").then((module) => ({ default: module.LoginPage })))
const ForbiddenPage = lazy(() => import("@/pages/status-pages").then((module) => ({ default: module.ForbiddenPage })))
const TopologySharePage = lazy(() => import("@/pages/topology-share-page").then((module) => ({ default: module.TopologySharePage })))

function RouteFallback() {
  return <Skeleton className="min-h-svh w-full rounded-none" />
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/install" element={<InstallPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/share/topology" element={<TopologySharePage />} />
        <Route path="/*" element={<AppRoot />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

import { Suspense, lazy } from "react"

const TopologyViewPage = lazy(() => import("@/pages/topology-view-page").then((module) => ({ default: module.TopologyViewPage })))

export function TopologySharePage() {
  return (
    <Suspense fallback={null}>
      <TopologyViewPage publicMode />
    </Suspense>
  )
}

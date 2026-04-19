import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Copy, Download, Pencil, RefreshCw, ScanSearch, Wifi, WifiOff } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { TopologyViewer, type TopologyViewerRef } from "@/components/topology-viewer"
import { PageLayout } from "@/components/page-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTopology } from "@/services/resources"
import { toast } from "sonner"

type TopologyViewPageProps = {
  publicMode?: boolean
}

export function TopologyViewPage({ publicMode = false }: TopologyViewPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get("id") ?? ""
  const viewerRef = useRef<TopologyViewerRef | null>(null)
  const [liveTopology, setLiveTopology] = useState<Record<string, unknown> | null>(null)
  const [wsConnected, setWsConnected] = useState(false)

  const query = useQuery({
    queryKey: ["topology-view", id, publicMode],
    queryFn: async () => {
      if (!publicMode) {
        return getTopology(id)
      }

      const response = await fetch(`/public/topology/${id}`)
      const payload = (await response.json()) as { data?: Record<string, unknown> }
      return payload.data ?? null
    },
    enabled: !!id,
  })

  useEffect(() => {
    if (!id) {
      return
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const path = publicMode ? `/ws/pub/${id}` : `/ws/auth/${id}`
    const socket = new WebSocket(`${protocol}://${window.location.host}${path}`)

    socket.onopen = () => {
      setWsConnected(true)
      socket.send("success")
    }
    socket.onmessage = (event) => {
      try {
        setLiveTopology(JSON.parse(event.data) as Record<string, unknown>)
      } catch {
        // ignore malformed updates
      }
    }
    socket.onclose = () => setWsConnected(false)
    socket.onerror = () => setWsConnected(false)

    const timer = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("success")
      }
    }, 10000)

    return () => {
      window.clearInterval(timer)
      socket.close()
    }
  }, [id, publicMode])

  const currentTopology = liveTopology ?? query.data ?? null

  const title = useMemo(() => {
    const name = String(currentTopology?.topology ?? "")
    if (!name) {
      return publicMode ? "共享拓扑" : "拓扑展示"
    }
    return publicMode ? `共享拓扑 - ${name}` : name
  }, [currentTopology, publicMode])
  const canvasWidth = Number(currentTopology?.canvas_width ?? 1920)
  const canvasHeight = Number(currentTopology?.canvas_height ?? 720)
  const isShared = String(currentTopology?.status ?? "0") === "1"
  const exportName = String(currentTopology?.topology ?? "topology") || "topology"

  const content = (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="truncate text-lg">{String(currentTopology?.topology ?? title)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              {wsConnected ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
              {wsConnected ? "实时更新" : "静态预览"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-lg">
              <Badge variant={isShared ? "secondary" : "outline"}>{isShared ? "已共享" : "未共享"}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-lg">{canvasWidth} × {canvasHeight}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
        <CardContent className="p-3">
          <TopologyViewer ref={viewerRef} topology={currentTopology} />
        </CardContent>
      </Card>
    </div>
  )

  if (publicMode) {
    return (
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-2xl font-semibold">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={wsConnected ? "default" : "outline"}>{wsConnected ? "在线" : "离线"}</Badge>
            <Button size="sm" variant="outline" onClick={() => viewerRef.current?.fitView()}>
              <ScanSearch data-icon="inline-start" />
              适配画布
            </Button>
            <Button size="sm" variant="outline" onClick={() => viewerRef.current?.exportPNG(`${exportName}.png`)}>
              <Download data-icon="inline-start" />
              导出 PNG
            </Button>
            <Button size="sm" variant="outline" onClick={() => viewerRef.current?.exportSVG(`${exportName}.svg`)}>
              <Download data-icon="inline-start" />
              导出 SVG
            </Button>
          </div>
        </div>
        {content}
      </div>
    )
  }

  return (
    <PageLayout
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => viewerRef.current?.fitView()}>
            <ScanSearch data-icon="inline-start" />
            适配画布
          </Button>
          <Button variant="outline" onClick={() => viewerRef.current?.exportPNG(`${exportName}.png`)}>
            <Download data-icon="inline-start" />
            导出 PNG
          </Button>
          <Button variant="outline" onClick={() => viewerRef.current?.exportSVG(`${exportName}.svg`)}>
            <Download data-icon="inline-start" />
            导出 SVG
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const shareUrl = `${window.location.origin}/share/topology?id=${id}`
              await navigator.clipboard.writeText(shareUrl)
              toast.success("共享链接已复制")
            }}
          >
            <Copy data-icon="inline-start" />
            复制共享链接
          </Button>
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
          <Button variant="outline" onClick={() => navigate(`/topology/detail?id=${id}`)}>
            <Pencil data-icon="inline-start" />
            编辑
          </Button>
          <Button variant="outline" onClick={() => navigate("/topology/list")}>
            返回列表
          </Button>
        </div>
      }
    >
      {content}
    </PageLayout>
  )
}

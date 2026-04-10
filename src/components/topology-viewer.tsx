import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react"
import { Graph } from "@antv/x6"
import { Export } from "@antv/x6/lib/plugin/export"

import { parseTopologyBackground } from "@/lib/topology-background"

type TopologyViewerProps = {
  topology: Record<string, unknown> | null
  height?: number
}

export type TopologyViewerRef = {
  exportPNG: (fileName: string) => void
  exportSVG: (fileName: string) => void
  fitView: () => void
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
  }
  if (typeof value !== "string") {
    return []
  }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const TopologyViewer = forwardRef<TopologyViewerRef, TopologyViewerProps>(function TopologyViewer(
  { topology, height = 720 },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<Graph | null>(null)

  const graphData = useMemo(() => {
    if (!topology) {
      return { nodes: [], edges: [] }
    }
    return {
      nodes: parseJsonArray(topology.nodes),
      edges: parseJsonArray(topology.edges),
    }
  }, [topology])

  useEffect(() => {
    if (!containerRef.current || graphRef.current) {
      return
    }

    const graph = new Graph({
      container: containerRef.current,
      interacting: false,
      panning: true,
      mousewheel: {
        enabled: true,
        modifiers: ["ctrl", "meta"],
      },
      background: {
        color: "transparent",
      },
      grid: {
        visible: true,
        size: 20,
      },
    })
    graph.use(new Export())
    graphRef.current = graph

    return () => {
      graphRef.current?.dispose()
      graphRef.current = null
    }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) {
      return
    }

    graph.clearCells()
    graph.fromJSON(graphData)

    const width = Number(topology?.canvas_width ?? 1920)
    const canvasHeight = Number(topology?.canvas_height ?? height)
    graph.resize(width, canvasHeight)

    const background = parseTopologyBackground(topology?.background_image)
    if (background.image) {
      graph.drawBackground({
        image: background.image,
        size: background.size,
        repeat: background.repeat,
        position: background.position,
        opacity: background.opacity / 100,
      })
    } else {
      graph.clearBackground()
    }

    graph.centerContent()
  }, [graphData, height, topology])

  useImperativeHandle(ref, () => ({
    exportPNG(fileName) {
      const graph = graphRef.current
      if (!graph) {
        return
      }
      const width = Number(topology?.canvas_width ?? 1920)
      const canvasHeight = Number(topology?.canvas_height ?? height)
      graph.exportPNG(fileName, {
        backgroundColor: "white",
        preserveDimensions: { width, height: canvasHeight },
        viewBox: { x: 0, y: 0, width, height: canvasHeight },
      })
    },
    exportSVG(fileName) {
      const graph = graphRef.current
      if (!graph) {
        return
      }
      const width = Number(topology?.canvas_width ?? 1920)
      const canvasHeight = Number(topology?.canvas_height ?? height)
      graph.exportSVG(fileName, {
        preserveDimensions: { width, height: canvasHeight },
        viewBox: { x: 0, y: 0, width, height: canvasHeight },
      })
    },
    fitView() {
      graphRef.current?.centerContent()
    },
  }))

  return (
    <div
      className="overflow-hidden rounded-lg border bg-muted/10"
      style={{ height }}
    >
      <div ref={containerRef} className="size-full" />
    </div>
  )
})

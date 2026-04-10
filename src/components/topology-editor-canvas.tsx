"use client"

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react"
import { Graph } from "@antv/x6"

import {
  type TopologyBackgroundPosition,
  type TopologyBackgroundRepeat,
  type TopologyBackgroundSize,
} from "@/lib/topology-background"

type TopologyEditorCanvasProps = {
  initialNodes: string
  initialEdges: string
  canvasWidth: number
  canvasHeight: number
  backgroundImage: string
  backgroundSize: TopologyBackgroundSize
  backgroundPosition: TopologyBackgroundPosition
  backgroundRepeat: TopologyBackgroundRepeat
  backgroundOpacity: number
  readOnly?: boolean
}

export type TopologyEditorCanvasRef = {
  addNode: (type: TopologyNodeType) => void
  deleteSelected: () => void
  fitView: () => void
  getTopologyData: () => { nodes: string; edges: string }
}

type TopologyNodeType = "cloud" | "core" | "switch" | "server" | "firewall" | "text"

const paletteMap: Record<TopologyNodeType, { label: string; fill: string; stroke: string }> = {
  cloud: { label: "☁ 云", fill: "#e0f2fe", stroke: "#38bdf8" },
  core: { label: "◈ 核心", fill: "#ede9fe", stroke: "#a78bfa" },
  switch: { label: "⇄ 交换机", fill: "#dcfce7", stroke: "#34d399" },
  server: { label: "▣ 服务器", fill: "#fef3c7", stroke: "#f59e0b" },
  firewall: { label: "🛡 防火墙", fill: "#ffe4e6", stroke: "#fb7185" },
  text: { label: "文本", fill: "transparent", stroke: "#d4d4d8" },
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function buildPorts() {
  return {
    groups: {
      top: { position: "top", attrs: { circle: { r: 4, magnet: true, stroke: "#2563eb", strokeWidth: 1, fill: "#fff" } } },
      right: { position: "right", attrs: { circle: { r: 4, magnet: true, stroke: "#2563eb", strokeWidth: 1, fill: "#fff" } } },
      bottom: { position: "bottom", attrs: { circle: { r: 4, magnet: true, stroke: "#2563eb", strokeWidth: 1, fill: "#fff" } } },
      left: { position: "left", attrs: { circle: { r: 4, magnet: true, stroke: "#2563eb", strokeWidth: 1, fill: "#fff" } } },
    },
    items: [{ group: "top" }, { group: "right" }, { group: "bottom" }, { group: "left" }],
  }
}

export const TopologyEditorCanvas = forwardRef<TopologyEditorCanvasRef, TopologyEditorCanvasProps>(
  function TopologyEditorCanvas(
    {
      initialNodes,
      initialEdges,
      canvasWidth,
      canvasHeight,
      backgroundImage,
      backgroundSize,
      backgroundPosition,
      backgroundRepeat,
      backgroundOpacity,
      readOnly = false,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const graphRef = useRef<Graph | null>(null)
    const initializedRef = useRef(false)
    const selectedCellIdsRef = useRef<string[]>([])

    const graphData = useMemo(
      () => ({
        nodes: parseJsonArray(initialNodes),
        edges: parseJsonArray(initialEdges),
      }),
      [initialEdges, initialNodes]
    )

    useEffect(() => {
      if (!containerRef.current || graphRef.current) {
        return
      }

      Graph.registerNode(
        "topology-text",
        {
          inherit: "rect",
          attrs: {
            body: {
              fill: "transparent",
              stroke: "transparent",
            },
            label: {
              fontSize: 16,
              fill: "#111827",
            },
          },
        },
        true
      )

      graphRef.current = new Graph({
        container: containerRef.current,
        autoResize: false,
        panning: true,
        mousewheel: {
          enabled: true,
          modifiers: ["ctrl", "meta"],
          minScale: 0.2,
          maxScale: 2,
        },
        background: {
          color: "transparent",
        },
        grid: {
          visible: true,
          size: 20,
        },
        interacting: readOnly
          ? false
          : {
              edgeLabelMovable: true,
            },
        connecting: readOnly
          ? undefined
          : {
              allowBlank: false,
              allowLoop: false,
              allowNode: false,
              snap: true,
              connector: "rounded",
              router: "manhattan",
              createEdge() {
                return this.createEdge({
                  attrs: {
                    line: {
                      stroke: "#2563eb",
                      strokeWidth: 2,
                      targetMarker: {
                        name: "classic",
                        size: 8,
                      },
                    },
                  },
                })
              },
            },
      })

      graphRef.current.on("cell:click", ({ cell }) => {
        selectedCellIdsRef.current = [cell.id]
      })

      graphRef.current.on("blank:click", () => {
        selectedCellIdsRef.current = []
      })

      return () => {
        graphRef.current?.dispose()
        graphRef.current = null
      }
    }, [readOnly])

    useEffect(() => {
      const graph = graphRef.current
      if (!graph || initializedRef.current) {
        return
      }

      graph.clearCells()
      graph.fromJSON(graphData)
      graph.resize(canvasWidth, canvasHeight)
      initializedRef.current = true
      graph.centerContent()
    }, [canvasHeight, canvasWidth, graphData])

    useEffect(() => {
      const graph = graphRef.current
      if (!graph) {
        return
      }

      graph.resize(canvasWidth, canvasHeight)
      if (backgroundImage) {
        graph.drawBackground({
          image: backgroundImage,
          size: backgroundSize,
          repeat: backgroundRepeat,
          position: backgroundPosition,
          opacity: backgroundOpacity / 100,
        })
      } else {
        graph.clearBackground()
      }
    }, [backgroundImage, backgroundOpacity, backgroundPosition, backgroundRepeat, backgroundSize, canvasHeight, canvasWidth])

    useImperativeHandle(ref, () => ({
      addNode(type) {
        const graph = graphRef.current
        if (!graph || readOnly) {
          return
        }

        const config = paletteMap[type]
        const nodeCount = graph.getNodes().length
        graph.addNode({
          shape: type === "text" ? "topology-text" : "rect",
          x: 120 + (nodeCount % 6) * 180,
          y: 120 + Math.floor(nodeCount / 6) * 120,
          width: type === "text" ? 140 : 132,
          height: type === "text" ? 40 : 64,
          label: config.label,
          ports: type === "text" ? undefined : buildPorts(),
          attrs: {
            body: {
              fill: config.fill,
              stroke: config.stroke,
              strokeWidth: 1.5,
              rx: 12,
              ry: 12,
            },
            label: {
              fill: "#111827",
              fontSize: 14,
              fontWeight: 500,
            },
          },
        })
      },
      deleteSelected() {
        const graph = graphRef.current
        if (!graph || readOnly) {
          return
        }
        const cells = selectedCellIdsRef.current
          .map((id) => graph.getCellById(id))
          .filter(Boolean)
        if (cells.length) {
          graph.removeCells(cells)
          selectedCellIdsRef.current = []
        }
      },
      fitView() {
        graphRef.current?.centerContent()
      },
      getTopologyData() {
        const graph = graphRef.current
        if (!graph) {
          return { nodes: "[]", edges: "[]" }
        }

        const json = graph.toJSON() as { cells?: Record<string, unknown>[] }
        const nodes = (json.cells ?? []).filter((cell) => !("source" in cell && "target" in cell))
        const edges = (json.cells ?? []).filter((cell) => "source" in cell && "target" in cell)
        return {
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        }
      },
    }))

    return (
      <div className="overflow-hidden rounded-lg border bg-muted/10">
        <div className="overflow-auto" style={{ height: 720 }}>
          <div ref={containerRef} style={{ width: canvasWidth, height: canvasHeight }} />
        </div>
      </div>
    )
  }
)

import { useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Eraser, ImagePlus, Move, ScanSearch, SquarePen, Trash2 } from "lucide-react"

import { TopologyEditorCanvas, type TopologyEditorCanvasRef } from "@/components/topology-editor-canvas"
import {
  DEFAULT_TOPOLOGY_BACKGROUND,
  getTopologyBackgroundImagePath,
  parseTopologyBackground,
  serializeTopologyBackground,
  type TopologyBackgroundPosition,
  type TopologyBackgroundRepeat,
  type TopologyBackgroundSize,
} from "@/lib/topology-background"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  createTopology,
  deleteTopologyBackground,
  getTopology,
  updateTopology,
  uploadTopologyBackground,
} from "@/services/resources"

export function TopologyEditorPage({ readOnly = false }: { readOnly?: boolean }) {
  const [searchParams] = useSearchParams()
  const id = searchParams.get("id") ?? ""
  const detailQuery = useQuery({
    queryKey: ["topology-detail-page", id],
    queryFn: () => getTopology(id),
    enabled: !!id,
  })

  if (id && detailQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const initialData = {
    topology: String(detailQuery.data?.topology ?? ""),
    canvasWidth: String(detailQuery.data?.canvas_width ?? 3000),
    canvasHeight: String(detailQuery.data?.canvas_height ?? 2000),
    backgroundImage: String(detailQuery.data?.background_image ?? ""),
    nodes: String(detailQuery.data?.nodes ?? "[]"),
    edges: String(detailQuery.data?.edges ?? "[]"),
  }

  return <TopologyEditorForm key={id || "new"} id={id} readOnly={readOnly} initialData={initialData} />
}

type TopologyEditorFormProps = {
  id: string
  readOnly: boolean
  initialData: {
    topology: string
    canvasWidth: string
    canvasHeight: string
    backgroundImage: string
    nodes: string
    edges: string
  }
}

function TopologyEditorForm({ id, readOnly, initialData }: TopologyEditorFormProps) {
  const navigate = useNavigate()
  const canvasRef = useRef<TopologyEditorCanvasRef | null>(null)
  const initialBackground = parseTopologyBackground(initialData.backgroundImage)
  const [name, setName] = useState(initialData.topology)
  const [canvasWidth, setCanvasWidth] = useState(initialData.canvasWidth)
  const [canvasHeight, setCanvasHeight] = useState(initialData.canvasHeight)
  const [backgroundImage, setBackgroundImage] = useState(initialBackground.image)
  const [backgroundSize, setBackgroundSize] = useState<TopologyBackgroundSize>(initialBackground.size)
  const [backgroundPosition, setBackgroundPosition] = useState<TopologyBackgroundPosition>(initialBackground.position)
  const [backgroundRepeat, setBackgroundRepeat] = useState<TopologyBackgroundRepeat>(initialBackground.repeat)
  const [backgroundOpacity, setBackgroundOpacity] = useState(String(initialBackground.opacity))
  const [canvasPreset, setCanvasPreset] = useState(() => {
    const value = `${initialData.canvasWidth}x${initialData.canvasHeight}`
    return ["1920x1080", "2560x1440", "3000x2000", "3840x2160", "4096x2160"].includes(value) ? value : "custom"
  })
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error("请输入拓扑名称")
      }
      const graphData = canvasRef.current?.getTopologyData() ?? {
        nodes: initialData.nodes,
        edges: initialData.edges,
      }
      const opacity = Math.min(Math.max(Number(backgroundOpacity) || 0, 0), 100)
      const payload = {
        topology: name.trim(),
        canvas_width: Number(canvasWidth),
        canvas_height: Number(canvasHeight),
        background_image: serializeTopologyBackground({
          image: backgroundImage,
          size: backgroundSize,
          position: backgroundPosition,
          repeat: backgroundRepeat,
          opacity,
        }),
        nodes: graphData.nodes,
        edges: graphData.edges,
      }
      if (id) {
        return updateTopology(id, payload)
      }
      return createTopology(payload)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "拓扑保存失败")
    },
    onSuccess: () => {
      toast.success("拓扑已保存")
      navigate("/topology/list")
    },
  })

  return (
    <PageLayout
      actions={
        <div className="flex gap-2">
          {!readOnly ? <Button onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? "保存中..." : "保存"}</Button> : null}
          <Button variant="outline" onClick={() => navigate("/topology/list")}>
            返回
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card size="sm" className="border-0 shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-sm font-medium">拓扑设置</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-3">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="topology-name">拓扑名称</FieldLabel>
                <Input id="topology-name" disabled={readOnly} value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="canvas-preset">画布尺寸预设</FieldLabel>
                <Select
                  value={canvasPreset}
                  disabled={readOnly}
                  onValueChange={(value) => {
                    setCanvasPreset(value)
                    if (value === "custom") {
                      return
                    }
                    const [width, height] = value.split("x")
                    setCanvasWidth(width)
                    setCanvasHeight(height)
                  }}
                >
                  <SelectTrigger id="canvas-preset">
                    <SelectValue placeholder="选择画布尺寸" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="1920x1080">1920 × 1080</SelectItem>
                      <SelectItem value="2560x1440">2560 × 1440</SelectItem>
                      <SelectItem value="3000x2000">3000 × 2000</SelectItem>
                      <SelectItem value="3840x2160">3840 × 2160</SelectItem>
                      <SelectItem value="4096x2160">4096 × 2160</SelectItem>
                      <SelectItem value="custom">自定义</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <FieldGroup className="grid md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="canvas-width">画布宽度</FieldLabel>
                  <Input id="canvas-width" disabled={readOnly} value={canvasWidth} onChange={(event) => setCanvasWidth(event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="canvas-height">画布高度</FieldLabel>
                  <Input id="canvas-height" disabled={readOnly} value={canvasHeight} onChange={(event) => setCanvasHeight(event.target.value)} />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="bg-image">背景图</FieldLabel>
                <Input id="bg-image" disabled={readOnly} value={backgroundImage} onChange={(event) => setBackgroundImage(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel>背景尺寸</FieldLabel>
                <ToggleGroup
                  type="single"
                  value={backgroundSize}
                  size="sm"
                  variant="outline"
                  disabled={readOnly}
                  onValueChange={(value) => {
                    if (value) {
                      setBackgroundSize(value as TopologyBackgroundSize)
                    }
                  }}
                >
                  <ToggleGroupItem value="cover">铺满</ToggleGroupItem>
                  <ToggleGroupItem value="contain">完整</ToggleGroupItem>
                  <ToggleGroupItem value="auto">原始</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel>背景位置</FieldLabel>
                <ToggleGroup
                  type="single"
                  value={backgroundPosition}
                  size="sm"
                  variant="outline"
                  disabled={readOnly}
                  onValueChange={(value) => {
                    if (value) {
                      setBackgroundPosition(value as TopologyBackgroundPosition)
                    }
                  }}
                >
                  <ToggleGroupItem value="center">居中</ToggleGroupItem>
                  <ToggleGroupItem value="top">顶部</ToggleGroupItem>
                  <ToggleGroupItem value="bottom">底部</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel>背景重复</FieldLabel>
                <ToggleGroup
                  type="single"
                  value={backgroundRepeat}
                  size="sm"
                  variant="outline"
                  disabled={readOnly}
                  onValueChange={(value) => {
                    if (value) {
                      setBackgroundRepeat(value as TopologyBackgroundRepeat)
                    }
                  }}
                >
                  <ToggleGroupItem value="no-repeat">不重复</ToggleGroupItem>
                  <ToggleGroupItem value="repeat">平铺</ToggleGroupItem>
                  <ToggleGroupItem value="repeat-x">横向</ToggleGroupItem>
                  <ToggleGroupItem value="repeat-y">纵向</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="bg-opacity">背景透明度</FieldLabel>
                <Input
                  id="bg-opacity"
                  type="number"
                  min="0"
                  max="100"
                  disabled={readOnly}
                  value={backgroundOpacity}
                  onChange={(event) => setBackgroundOpacity(event.target.value)}
                />
              </Field>
            </FieldGroup>
            {!readOnly ? (
              <>
                <div className="text-sm font-medium">节点工具</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => canvasRef.current?.addNode("cloud")}>
                    <Move data-icon="inline-start" />
                    云
                  </Button>
                  <Button type="button" variant="outline" onClick={() => canvasRef.current?.addNode("core")}>
                    <Move data-icon="inline-start" />
                    核心
                  </Button>
                  <Button type="button" variant="outline" onClick={() => canvasRef.current?.addNode("switch")}>
                    <Move data-icon="inline-start" />
                    交换机
                  </Button>
                  <Button type="button" variant="outline" onClick={() => canvasRef.current?.addNode("server")}>
                    <Move data-icon="inline-start" />
                    服务器
                  </Button>
                  <Button type="button" variant="outline" onClick={() => canvasRef.current?.addNode("firewall")}>
                    <Move data-icon="inline-start" />
                    防火墙
                  </Button>
                  <Button type="button" variant="outline" onClick={() => canvasRef.current?.addNode("text")}>
                    <SquarePen data-icon="inline-start" />
                    文本
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => canvasRef.current?.deleteSelected()}>
                    <Trash2 data-icon="inline-start" />
                    删除选中
                  </Button>
                  <Button type="button" variant="outline" onClick={() => canvasRef.current?.fitView()}>
                    <ScanSearch data-icon="inline-start" />
                    居中显示
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild type="button" variant="outline">
                    <label className="cursor-pointer">
                      <ImagePlus data-icon="inline-start" />
                      上传背景
                      <input
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0]
                          if (!file) {
                            return
                          }
                          const result = await uploadTopologyBackground(file)
                          setBackgroundImage(result.path)
                          toast.success("背景图已上传")
                          event.currentTarget.value = ""
                        }}
                      />
                    </label>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!backgroundImage}
                    onClick={async () => {
                      if (!backgroundImage) {
                        return
                      }
                      await deleteTopologyBackground(getTopologyBackgroundImagePath(backgroundImage))
                      setBackgroundImage("")
                      setBackgroundSize(DEFAULT_TOPOLOGY_BACKGROUND.size)
                      setBackgroundPosition(DEFAULT_TOPOLOGY_BACKGROUND.position)
                      setBackgroundRepeat(DEFAULT_TOPOLOGY_BACKGROUND.repeat)
                      setBackgroundOpacity(String(DEFAULT_TOPOLOGY_BACKGROUND.opacity))
                      toast.success("背景图已移除")
                    }}
                  >
                    <Eraser data-icon="inline-start" />
                    清空背景
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none ring-1 ring-border/60">
          <CardContent>
            <TopologyEditorCanvas
              ref={canvasRef}
              readOnly={readOnly}
              initialNodes={initialData.nodes}
              initialEdges={initialData.edges}
              canvasWidth={Number(canvasWidth)}
              canvasHeight={Number(canvasHeight)}
              backgroundImage={backgroundImage}
              backgroundSize={backgroundSize}
              backgroundPosition={backgroundPosition}
              backgroundRepeat={backgroundRepeat}
              backgroundOpacity={Math.min(Math.max(Number(backgroundOpacity) || 0, 0), 100)}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}

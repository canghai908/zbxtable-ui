import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ImageIcon } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getHostDetail, getHostGraphs } from "@/services/hosts"

type GraphImage = {
  name?: string
  png?: string
}

const summaryFields = [
  ["hostid", "主机 ID"],
  ["instance_name", "实例"],
  ["name", "名称"],
  ["interfaces", "IP"],
  ["number_of_cores", "CPU 核数"],
  ["memory_total", "总内存"],
  ["memory_utilization", "内存利用率"],
  ["uptime", "运行时长"],
  ["os", "操作系统"],
  ["model", "型号"],
  ["vendor", "备注"],
  ["ping_sec", "网络延时"],
] as const

const parseMaybeArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value as Record<string, unknown>[]
  }
  if (typeof value !== "string") {
    return []
  }
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : []
  } catch {
    return []
  }
}

export function HostDetailPage() {
  const [searchParams] = useSearchParams()
  const hostId = searchParams.get("hostid") ?? ""
  const zid = searchParams.get("zid") ?? ""
  const [graphOpen, setGraphOpen] = useState(false)
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")

  const query = useQuery({
    queryKey: ["host-detail", hostId, zid],
    queryFn: () => getHostDetail(hostId, zid),
    enabled: !!hostId,
  })

  const graphMutation = useMutation({
    mutationFn: () =>
      getHostGraphs(hostId, {
        start,
        end,
      }),
  })

  const detail = query.data ?? null
  const fileSystems = useMemo(() => parseMaybeArray(detail?.file_systems), [detail?.file_systems])
  const interfaces = useMemo(() => parseMaybeArray(detail?.interfaces_data ?? detail?.interfaces_list), [detail?.interfaces_data, detail?.interfaces_list])
  const graphs = (graphMutation.data ?? []) as GraphImage[]

  return (
    <PageLayout
      actions={
        <Button
          onClick={() => {
            setGraphOpen(true)
            graphMutation.mutate()
          }}
        >
          <ImageIcon data-icon="inline-start" />
          查看图表
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {summaryFields.map(([key, label]) => (
          <Card key={key} className="border-0 bg-background shadow-none ring-1 ring-border/60">
            <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
              <CardTitle className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">{label}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-sm text-foreground">{String(detail?.[key] ?? "-")}</CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-sm font-medium">磁盘分区</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>总空间</TableHead>
                    <TableHead>已用空间</TableHead>
                    <TableHead>空间利用率</TableHead>
                    <TableHead>Inode 利用率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fileSystems.map((item, index) => (
                    <TableRow key={String(item.id ?? index)}>
                      <TableCell>{String(item.name ?? "-")}</TableCell>
                      <TableCell>{String(item.total_space ?? "-")}</TableCell>
                      <TableCell>{String(item.used_space ?? "-")}</TableCell>
                      <TableCell>{String(item.space_utilization ?? "-")}%</TableCell>
                      <TableCell>{String(item.inodes_pused ?? "-")}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <CardTitle className="text-sm font-medium">网络接口</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>接收</TableHead>
                    <TableHead>发送</TableHead>
                    <TableHead>速率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interfaces.map((item, index) => (
                    <TableRow key={String(item.id ?? index)}>
                      <TableCell>{String(item.name ?? "-")}</TableCell>
                      <TableCell>{String(item.operational_status ?? "-")}</TableCell>
                      <TableCell>{String(item.bits_received ?? "-")}</TableCell>
                      <TableCell>{String(item.bits_sent ?? "-")}</TableCell>
                      <TableCell>{String(item.speed ?? "-")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
      <Dialog open={graphOpen} onOpenChange={setGraphOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>主机图表</DialogTitle>
          </DialogHeader>
          <FieldGroup className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field>
              <FieldLabel htmlFor="graph-start">开始时间</FieldLabel>
              <Input id="graph-start" value={start} onChange={(event) => setStart(event.target.value)} placeholder="YYYY-MM-DD HH:mm:ss" />
            </Field>
            <Field>
              <FieldLabel htmlFor="graph-end">结束时间</FieldLabel>
              <Input id="graph-end" value={end} onChange={(event) => setEnd(event.target.value)} placeholder="YYYY-MM-DD HH:mm:ss" />
            </Field>
            <Field>
              <FieldLabel className="opacity-0">查询</FieldLabel>
              <Button onClick={() => graphMutation.mutate()}>查询图表</Button>
            </Field>
          </FieldGroup>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-4">
              {graphs.map((graph, index) => (
                <Card key={`${graph.name}-${index}`} className="border-0 bg-background shadow-none ring-1 ring-border/60">
                  <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                    <CardTitle className="text-sm font-medium">{graph.name ?? `图表 ${index + 1}`}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    {graph.png ? (
                      <img
                        src={`data:image/png;base64,${graph.png}`}
                        alt={graph.name ?? `graph-${index}`}
                        className="w-full rounded-md border"
                      />
                    ) : (
                      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">暂无图像数据</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

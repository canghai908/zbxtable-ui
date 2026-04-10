import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowDownToLine,
  ArrowUpToLine,
  HardDrive,
  Monitor,
  Network,
  Server,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getBaseInfo, getEgress, getResourceTop, getTriggerList } from "@/services/dashboard"

type TopItem = Record<string, unknown>
type TriggerItem = Record<string, unknown>
type EgressItem = Record<string, unknown>

function formatDateTime(value: unknown) {
  if (!value) return "-"
  const raw = String(value)
  if (/^\d+$/.test(raw)) {
    const num = Number(raw)
    const ms = raw.length === 10 ? num * 1000 : num
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("zh-CN")
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("zh-CN")
}

function formatRate(value: unknown) {
  const num = Number(value ?? 0)
  if (Number.isNaN(num)) return 0
  return Math.max(0, Math.min(100, Number(num.toFixed(2))))
}

function formatBitsRate(value: unknown) {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num) || num <= 0) return "0 B/s"
  if (num <= 1024) return `${num.toFixed(0)} B/s`
  const kb = (num * 8) / 1024
  if (kb < 1024) return `${kb.toFixed(2)} Kb/s`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(2)} Mb/s`
  return `${(mb / 1024).toFixed(2)} Gb/s`
}

function severityMeta(item: TriggerItem) {
  const severity = Number(item.severity ?? 0)
  if (severity >= 3) return { label: "严重", variant: "destructive" as const }
  if (severity === 2) return { label: "高", variant: "secondary" as const }
  return { label: "警告", variant: "outline" as const }
}

function getTopName(item: TopItem) {
  return String(item.host_name ?? item.hostname ?? item.name ?? "--")
}

function getTopScore(item: TopItem) {
  return formatRate(item.score ?? item.cpu ?? item.mem)
}

function EgressPanel({ items }: { items: EgressItem[] }) {
  return (
    <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
      <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium">出入口流量</CardTitle>
          <Badge variant="outline">{items.length} 条</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={`egress-${index}`} className="rounded-lg border bg-background p-2.5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium">{String(item.name ?? `出口${index + 1}`)}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(item.timestamp)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ArrowUpToLine className="size-4" />
                    流出
                  </span>
                  <span className="truncate text-right font-medium">{formatBitsRate(item.out_value)}</span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ArrowDownToLine className="size-4" />
                    流入
                  </span>
                  <span className="truncate text-right font-medium">{formatBitsRate(item.in_value)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">暂无出口流量数据</div>
        )}
      </CardContent>
    </Card>
  )
}

function RankingPanel({
  title,
  cpuItems,
  memItems,
}: {
  title: string
  cpuItems: TopItem[]
  memItems: TopItem[]
}) {
  const groups = [
    { key: "cpu", label: "CPU", items: cpuItems },
    { key: "mem", label: "内存", items: memItems },
  ]

  return (
    <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
      <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant="outline">TOP 5</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <Tabs defaultValue="cpu" className="gap-1.5">
          <TabsList className="h-8 p-[2px]">
            {groups.map((group) => (
              <TabsTrigger key={group.key} value={group.key} className="px-2 py-0.5 text-xs">
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((group) => (
            <TabsContent key={group.key} value={group.key} className="mt-3">
              <div className="grid gap-3">
                {group.items.length ? (
                  group.items.map((item, index) => {
                    const score = getTopScore(item)
                    return (
                      <div key={`${title}-${group.key}-${index}`} className="rounded-lg border bg-background p-2.5">
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{getTopName(item)}</span>
                          <span className="text-xs text-muted-foreground">{score.toFixed(2)}%</span>
                        </div>
                        <Progress value={score} />
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">暂无数据</div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

export function WorkplacePage() {
  const baseInfo = useQuery({ queryKey: ["base-info"], queryFn: getBaseInfo })
  const triggers = useQuery({ queryKey: ["trigger-list"], queryFn: getTriggerList })
  const winCpuTop = useQuery({ queryKey: ["restop", "VM_WIN", "CPU"], queryFn: () => getResourceTop("VM_WIN", "CPU", 5) })
  const winMemTop = useQuery({ queryKey: ["restop", "VM_WIN", "MEM"], queryFn: () => getResourceTop("VM_WIN", "MEM", 5) })
  const linCpuTop = useQuery({ queryKey: ["restop", "VM_LIN", "CPU"], queryFn: () => getResourceTop("VM_LIN", "CPU", 5) })
  const linMemTop = useQuery({ queryKey: ["restop", "VM_LIN", "MEM"], queryFn: () => getResourceTop("VM_LIN", "MEM", 5) })
  const egress = useQuery({ queryKey: ["egress"], queryFn: getEgress })

  const info = useMemo(() => ((baseInfo.data ?? {}) as Record<string, number>), [baseInfo.data])
  const triggerItems = (((triggers.data as { items?: unknown[] })?.items ?? []) as TriggerItem[]).slice(0, 12)
  const egressItems = ((egress.data ?? []) as EgressItem[]).slice(0, 4)

  const deviceStats = useMemo(
    () => [
      { label: "Linux主机", value: Number(info.lin_count ?? 0), icon: Monitor },
      { label: "Windows主机", value: Number(info.win_count ?? 0), icon: HardDrive },
      { label: "物理机器", value: Number(info.srv_count ?? 0), icon: Server },
      { label: "网络设备", value: Number(info.net_count ?? 0), icon: Network },
    ],
    [info.lin_count, info.net_count, info.srv_count, info.win_count]
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {deviceStats.map((item) => {
          const Icon = item.icon
          const total = deviceStats.reduce((sum, current) => sum + current.value, 0) || 1
          const percent = Math.round((item.value / total) * 100)

          return (
            <Card key={item.label} className="border-0 bg-background shadow-none ring-1 ring-border/60">
              <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">{item.label}</span>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div className="text-2xl font-semibold tracking-tight">{item.value}</div>
                  <span className="text-xs text-muted-foreground">{percent}%</span>
                </div>
                <Progress value={percent} />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <Card className="border-0 bg-background shadow-none ring-1 ring-border/60">
          <CardHeader className="border-b bg-muted/10 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">告警工作区</CardTitle>
              <Badge variant="outline">{triggerItems.length} 条</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10 px-3 text-xs">等级</TableHead>
                    <TableHead className="h-10 px-3 text-xs">告警</TableHead>
                    <TableHead className="h-10 px-3 text-xs">主机</TableHead>
                    <TableHead className="h-10 px-3 text-xs">时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {triggerItems.length ? (
                    triggerItems.map((item, index) => {
                      const meta = severityMeta(item)
                      return (
                        <TableRow key={`trigger-${index}`}>
                          <TableCell className="px-3 py-2">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[360px] px-3 py-2">
                            <div className="truncate text-sm font-medium leading-5">{String(item.name ?? "--")}</div>
                            <div className="truncate text-xs text-muted-foreground">{String(item.lasteventname ?? item.eventname ?? "--")}</div>
                          </TableCell>
                          <TableCell className="px-3 py-2 text-sm">{String(item.host_name ?? item.hostname ?? "--")}</TableCell>
                          <TableCell className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(item.lastchange)}</TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        暂无告警数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <EgressPanel items={egressItems} />
        </div>
      </div>

      <Separator className="opacity-60" />

      <div className="grid gap-6 xl:grid-cols-2">
        <RankingPanel title="Windows 资源排行" cpuItems={(winCpuTop.data ?? []) as TopItem[]} memItems={(winMemTop.data ?? []) as TopItem[]} />
        <RankingPanel title="Linux 资源排行" cpuItems={(linCpuTop.data ?? []) as TopItem[]} memItems={(linMemTop.data ?? []) as TopItem[]} />
      </div>
    </div>
  )
}
